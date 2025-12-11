
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { Tip, TipStatus, NewsPost, User, UserRole, MaestroStats, Message, Slide } from '../types';

class FirebaseDBService {
  
  // --- AUTH ---

  onAuthStateChange(callback: (user: User | null) => void) {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        let role = UserRole.USER;
        let displayName = firebaseUser.displayName || 'User';

        try {
            const userDoc = await db.collection("users").doc(firebaseUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                role = userData?.role || UserRole.USER;
                if (userData?.displayName) displayName = userData.displayName;
            } else {
                await db.collection("users").doc(firebaseUser.uid).set({
                    email: firebaseUser.email,
                    role: UserRole.USER,
                    displayName: displayName,
                    uid: firebaseUser.uid
                });
            }
        } catch (e) {
            console.error("Error fetching user role:", e);
        }

        // Admin Override for owner
        if (firebaseUser.email === 'admin@jirvinho.com') role = UserRole.ADMIN;

        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          role,
          displayName
        });
      } else {
        callback(null);
      }
    });
    
    return { data: { subscription: { unsubscribe } } };
  }

  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    return {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        role: UserRole.USER,
        displayName: firebaseUser.displayName || 'User'
    };
  }

  async login(email: string, password: string): Promise<User> {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    if (!user) throw new Error("Login failed");
    return { 
        uid: user.uid, 
        email: user.email!, 
        role: UserRole.USER 
    };
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    if (!user) throw new Error("Signup failed");
    
    await user.updateProfile({ displayName });

    await db.collection("users").doc(user.uid).set({
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        role: UserRole.USER,
        createdAt: Date.now()
    });

    return { uid: user.uid, email: email, role: UserRole.USER, displayName };
  }

  async logout(): Promise<void> {
    await auth.signOut();
  }

  async resetPassword(email: string): Promise<void> {
    await auth.sendPasswordResetEmail(email);
  }

  // --- USERS (Admin) ---

  async getAllUsers(): Promise<User[]> {
      const snapshot = await db.collection("users").get();
      return snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
      } as User));
  }

  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
      await db.collection("users").doc(uid).update({ role: newRole });
  }

  async deleteUser(uid: string): Promise<void> {
      await db.collection("users").doc(uid).delete();
  }

  // --- TIPS ---

  async getTips(): Promise<Tip[]> {
    try {
        const snapshot = await db.collection("tips").orderBy("createdAt", "desc").get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Tip));
    } catch (e) {
        console.error("Error fetching tips:", e);
        return [];
    }
  }

  async addTip(tip: Omit<Tip, 'id' | 'createdAt' | 'status' | 'votes'>): Promise<void> {
    await db.collection("tips").add({
        ...tip,
        status: TipStatus.PENDING,
        votes: { agree: 0, disagree: 0 },
        createdAt: Date.now()
    });
  }

  async updateTip(tip: Tip): Promise<void> {
    const { id, ...data } = tip;
    await db.collection("tips").doc(id).update(data);
  }

  async voteOnTip(id: string, type: 'agree' | 'disagree'): Promise<void> {
    await db.collection("tips").doc(id).update({
        [`votes.${type}`]: firebase.firestore.FieldValue.increment(1)
    });
  }

  async deleteTip(id: string): Promise<void> {
    await db.collection("tips").doc(id).delete();
  }

  async settleTip(id: string, status: TipStatus, score?: string): Promise<void> {
    const updateData: any = { status };
    if (score) updateData.resultScore = score;
    await db.collection("tips").doc(id).update(updateData);
  }

  // --- STATS ---

  async getStats(): Promise<MaestroStats> {
    try {
        const snapshot = await db.collection("tips").get();
        const tips = snapshot.docs.map(d => d.data() as Tip);
        
        const settledTips = tips.filter(t => t.status !== TipStatus.PENDING);
        const totalTips = settledTips.length;
        const wonTips = settledTips.filter(t => t.status === TipStatus.WON).length;
        const winRate = totalTips > 0 ? parseFloat(((wonTips / totalTips) * 100).toFixed(1)) : 0;
        
        const streak = settledTips
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 10)
            .map(t => t.status);

        return { winRate, totalTips, wonTips, streak };
    } catch (e) {
        return { winRate: 0, totalTips: 0, wonTips: 0, streak: [] };
    }
  }

  // --- NEWS ---

  async getNews(): Promise<NewsPost[]> {
    try {
        const snapshot = await db.collection("news").orderBy("createdAt", "desc").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsPost));
    } catch (e) {
        return [];
    }
  }

  async addNews(post: Omit<NewsPost, 'id' | 'createdAt'>): Promise<void> {
    await db.collection("news").add({ ...post, createdAt: Date.now() });
  }

  async updateNews(post: NewsPost): Promise<void> {
    const { id, ...data } = post;
    await db.collection("news").doc(id).update(data);
  }

  async deleteNews(id: string): Promise<void> {
    await db.collection("news").doc(id).delete();
  }

  // --- SLIDES ---

  async getSlides(): Promise<Slide[]> {
      try {
        const snapshot = await db.collection("slides").orderBy("createdAt", "desc").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Slide));
      } catch (e) {
        return [];
      }
  }

  async addSlide(slide: Partial<Slide>): Promise<void> {
      await db.collection("slides").add({ 
          image: slide.image || '', 
          title: slide.title || '', 
          subtitle: slide.subtitle || '', 
          createdAt: Date.now() 
      });
  }

  async updateSlide(slide: Slide): Promise<void> {
      const { id, ...data } = slide;
      await db.collection("slides").doc(id).update(data);
  }

  async deleteSlide(id: string): Promise<void> {
      await db.collection("slides").doc(id).delete();
  }

  // --- MESSAGES ---

  async getMessages(): Promise<Message[]> {
      try {
        const snapshot = await db.collection("messages").orderBy("createdAt", "asc").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      } catch(e) {
        return [];
      }
  }

  async getUserMessages(userId: string): Promise<Message[]> {
      try {
        const snapshot = await db.collection("messages").where("userId", "==", userId).get();
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        return msgs.sort((a, b) => a.createdAt - b.createdAt);
      } catch(e) {
        return [];
      }
  }

  async sendMessage(userId: string, userName: string, content: string): Promise<Message | null> {
      const msgData = {
          userId,
          userName,
          content,
          createdAt: Date.now(),
          isRead: false
      };
      const ref = await db.collection("messages").add(msgData);
      return { id: ref.id, ...msgData };
  }

  async replyToMessage(messageId: string, replyContent: string): Promise<void> {
      await db.collection("messages").doc(messageId).update({
          reply: replyContent,
          isRead: true
      });
  }

  async deleteMessage(id: string): Promise<void> {
      await db.collection("messages").doc(id).delete();
  }
}

export const dbService = new FirebaseDBService();
