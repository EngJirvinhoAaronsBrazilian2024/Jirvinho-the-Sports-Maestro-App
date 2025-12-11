import firebase from "firebase/app";
import { auth, db } from "./firebaseConfig";
import { Tip, TipStatus, NewsPost, User, UserRole, Message, Slide } from '../types';

class FirebaseDBService {
  
  // --- AUTH ---

  onAuthStateChange(callback: (user: User | null) => void) {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        let role = UserRole.USER;
        let displayName = firebaseUser.displayName || 'User';

        // Check user profile in Firestore
        try {
           const snapshot = await db.collection("users").where("uid", "==", firebaseUser.uid).get();
           if (!snapshot.empty) {
               const userDocData = snapshot.docs[0].data();
               role = userDocData.role || UserRole.USER;
               displayName = userDocData.displayName || displayName;
           } else {
               // Create if missing (e.g. first login)
               await db.collection("users").doc(firebaseUser.uid).set({
                   uid: firebaseUser.uid,
                   email: firebaseUser.email,
                   role: UserRole.USER,
                   displayName: displayName,
                   createdAt: Date.now()
               });
           }
        } catch (e) { console.warn("User doc fetch failed", e); }

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
    
    return unsubscribe;
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
    
    if (user) {
        await user.updateProfile({ displayName });
        
        // Create user document
        await db.collection("users").doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            role: UserRole.USER,
            createdAt: Date.now()
        });
        
        return { uid: user.uid, email: email, role: UserRole.USER, displayName };
    }
    throw new Error("Signup failed");
  }

  async logout(): Promise<void> {
    await auth.signOut();
  }

  async resetPassword(email: string): Promise<void> {
    await auth.sendPasswordResetEmail(email);
  }

  // --- REAL-TIME SUBSCRIPTIONS ---

  subscribeToTips(callback: (tips: Tip[]) => void) {
      return db.collection("tips").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
          const tips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tip));
          callback(tips);
      });
  }

  subscribeToNews(callback: (news: NewsPost[]) => void) {
      return db.collection("news").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
          const news = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsPost));
          callback(news);
      });
  }

  subscribeToSlides(callback: (slides: Slide[]) => void) {
      return db.collection("slides").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
          const slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Slide));
          callback(slides);
      });
  }

  subscribeToMessages(user: User, callback: (msgs: Message[]) => void) {
      let q;
      if (user.role === UserRole.ADMIN) {
          q = db.collection("messages").orderBy("createdAt", "asc");
      } else {
          // Admin sees all, User sees theirs.
          q = db.collection("messages").where("userId", "==", user.uid);
      }

      return q.onSnapshot((snapshot) => {
          const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
          // Sort explicitly to ensure order
          msgs.sort((a, b) => a.createdAt - b.createdAt);
          callback(msgs);
      });
  }

  subscribeToAllUsers(callback: (users: User[]) => void) {
      return db.collection("users").onSnapshot((snapshot) => {
          const users = snapshot.docs.map(doc => ({ ...doc.data() } as User));
          callback(users);
      });
  }

  // --- ACTION METHODS (CRUD) ---

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

  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
      await db.collection("users").doc(uid).update({ role: newRole });
  }

  async deleteUser(uid: string): Promise<void> {
      await db.collection("users").doc(uid).delete();
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