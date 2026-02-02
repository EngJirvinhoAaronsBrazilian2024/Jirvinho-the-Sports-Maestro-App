
import { auth, db } from "./firebaseConfig";
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, orderBy, where, setDoc, getDocs, increment 
} from "firebase/firestore";
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
           const usersRef = collection(db, "users");
           const q = query(usersRef, where("uid", "==", firebaseUser.uid));
           const snapshot = await getDocs(q);
           
           if (!snapshot.empty) {
               const userDocData = snapshot.docs[0].data();
               role = userDocData.role || UserRole.USER;
               displayName = userDocData.displayName || displayName;
           } else {
               // Create if missing (e.g. first login)
               await setDoc(doc(db, "users", firebaseUser.uid), {
                   uid: firebaseUser.uid,
                   email: firebaseUser.email,
                   role: UserRole.USER,
                   displayName: displayName,
                   createdAt: Date.now()
               });
           }
        } catch (e) { console.warn("User doc fetch failed", e); }

        // Admin Override for owner - must check email explicitly
        if (firebaseUser.email?.toLowerCase() === 'admin@jirvinho.com') {
          role = UserRole.ADMIN;
        }

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

    // Check for admin override immediately on login return
    const role = email.toLowerCase() === 'admin@jirvinho.com' ? UserRole.ADMIN : UserRole.USER;

    return { 
        uid: user.uid, 
        email: user.email!, 
        role: role
    };
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    if (user) {
        await user.updateProfile({ displayName });
        
        // Create user document
        await setDoc(doc(db, "users", user.uid), {
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
      const q = query(collection(db, "tips"), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
          const tips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tip));
          callback(tips);
      });
  }

  subscribeToNews(callback: (news: NewsPost[]) => void) {
      const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
          const news = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsPost));
          callback(news);
      });
  }

  subscribeToSlides(callback: (slides: Slide[]) => void) {
      const q = query(collection(db, "slides"), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
          const slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Slide));
          callback(slides);
      });
  }

  subscribeToMessages(user: User, callback: (msgs: Message[]) => void) {
      let q;
      if (user.role === UserRole.ADMIN) {
          q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
      } else {
          // Admin sees all, User sees theirs.
          q = query(collection(db, "messages"), where("userId", "==", user.uid));
      }

      return onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
          // Client-side sort fallback if composite index missing for specific user queries
          msgs.sort((a, b) => a.createdAt - b.createdAt);
          callback(msgs);
      });
  }

  subscribeToAllUsers(callback: (users: User[]) => void) {
      const q = query(collection(db, "users"));
      return onSnapshot(q, (snapshot) => {
          const users = snapshot.docs.map(doc => ({ ...doc.data() } as User));
          callback(users);
      });
  }

  // --- ACTION METHODS (CRUD) ---

  async addTip(tip: Omit<Tip, 'id' | 'createdAt' | 'status' | 'votes'>): Promise<void> {
    await addDoc(collection(db, "tips"), {
        ...tip,
        status: TipStatus.PENDING,
        votes: { agree: 0, disagree: 0 },
        createdAt: Date.now()
    });
  }

  async updateTip(tip: Tip): Promise<void> {
    const { id, ...data } = tip;
    await updateDoc(doc(db, "tips", id), data);
  }

  async voteOnTip(id: string, type: 'agree' | 'disagree'): Promise<void> {
    // We use the 'increment' function imported from firebase/firestore
    await updateDoc(doc(db, "tips", id), {
        [`votes.${type}`]: increment(1)
    });
  }

  async deleteTip(id: string): Promise<void> {
    await deleteDoc(doc(db, "tips", id));
  }

  async settleTip(id: string, status: TipStatus, score?: string): Promise<void> {
    const updateData: any = { status };
    if (score) updateData.resultScore = score;
    await updateDoc(doc(db, "tips", id), updateData);
  }

  async addNews(post: Omit<NewsPost, 'id' | 'createdAt'>): Promise<void> {
    await addDoc(collection(db, "news"), { ...post, createdAt: Date.now() });
  }

  async updateNews(post: NewsPost): Promise<void> {
    const { id, ...data } = post;
    await updateDoc(doc(db, "news", id), data);
  }

  async deleteNews(id: string): Promise<void> {
    await deleteDoc(doc(db, "news", id));
  }

  async addSlide(slide: Partial<Slide>): Promise<void> {
      await addDoc(collection(db, "slides"), { 
          image: slide.image || '', 
          title: slide.title || '', 
          subtitle: slide.subtitle || '', 
          createdAt: Date.now() 
      });
  }

  async updateSlide(slide: Slide): Promise<void> {
      const { id, ...data } = slide;
      await updateDoc(doc(db, "slides", id), data);
  }

  async deleteSlide(id: string): Promise<void> {
      await deleteDoc(doc(db, "slides", id));
  }

  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
      await updateDoc(doc(db, "users", uid), { role: newRole });
  }

  async deleteUser(uid: string): Promise<void> {
      await deleteDoc(doc(db, "users", uid));
  }

  async sendMessage(userId: string, userName: string, content: string): Promise<Message | null> {
      const msgData = {
          userId,
          userName,
          content,
          createdAt: Date.now(),
          isRead: false
      };
      const ref = await addDoc(collection(db, "messages"), msgData);
      return { id: ref.id, ...msgData };
  }

  async replyToMessage(messageId: string, replyContent: string): Promise<void> {
      await updateDoc(doc(db, "messages", messageId), {
          reply: replyContent,
          isRead: true
      });
  }

  async deleteMessage(id: string): Promise<void> {
      await deleteDoc(doc(db, "messages", id));
  }
}

export const dbService = new FirebaseDBService();
