
import { Tip, TipStatus, NewsPost, User, UserRole, MaestroStats, TipCategory, Message, Slide, TipLeg } from '../types';

// Initial Mock Data
const INITIAL_TIPS: Tip[] = [
  {
    id: '1',
    category: TipCategory.SINGLE,
    teams: 'Man City vs Liverpool',
    league: 'England - Premier League',
    kickoffTime: new Date(Date.now() + 86400000).toISOString(),
    sport: 'Football',
    prediction: 'Home Win',
    odds: 1.85,
    confidence: 'High',
    status: TipStatus.PENDING,
    analysis: 'City are in formidable form at home.',
    votes: { agree: 15, disagree: 2 },
    createdAt: Date.now()
  },
  {
      id: '2',
      category: TipCategory.ODD_2_PLUS,
      teams: 'Real Madrid vs Barcelona',
      league: 'Spain - La Liga',
      kickoffTime: new Date(Date.now() + 172800000).toISOString(),
      sport: 'Football',
      prediction: 'Both Teams to Score',
      odds: 2.10,
      confidence: 'Medium',
      status: TipStatus.PENDING,
      votes: { agree: 10, disagree: 5 },
      createdAt: Date.now()
  }
];

class MockDBService {
  private usersKey = 'jirvinho_users_list'; 
  private currentUserKey = 'jirvinho_current_user';
  private tipsKey = 'jirvinho_tips';
  private newsKey = 'jirvinho_news';
  private slidesKey = 'jirvinho_slides';
  private messagesKey = 'jirvinho_messages';

  // Listeners for "Real-time" updates
  private tipListeners: ((tips: Tip[]) => void)[] = [];
  private newsListeners: ((news: NewsPost[]) => void)[] = [];
  private slideListeners: ((slides: Slide[]) => void)[] = [];
  private messageListeners: { callback: (msgs: Message[]) => void, userId?: string }[] = [];
  private userListeners: ((users: User[]) => void)[] = [];

  constructor() {
    this.initData();
  }

  private initData() {
    if (!localStorage.getItem(this.tipsKey)) {
      this.safeSetItem(this.tipsKey, INITIAL_TIPS);
    }
    if (!localStorage.getItem(this.newsKey)) {
        this.safeSetItem(this.newsKey, []);
    }
    if (!localStorage.getItem(this.slidesKey)) {
        this.safeSetItem(this.slidesKey, []);
    }
    
    // Initialize Users List if empty
    if (!localStorage.getItem(this.usersKey)) {
        const initialUsers: User[] = [
            { uid: 'admin-123', email: 'admin@jirvinho.com', role: UserRole.ADMIN, displayName: 'Maestro Admin' },
            { uid: 'user-demo', email: 'alex@example.com', role: UserRole.USER, displayName: 'Alex P.' },
            { uid: 'user-demo-2', email: 'sarah@example.com', role: UserRole.USER, displayName: 'Sarah J.' }
        ];
        this.safeSetItem(this.usersKey, initialUsers);
    }

    if (!localStorage.getItem(this.messagesKey)) {
        // Seed some initial messages for testing
        const initialMessages: Message[] = [
            {
                id: 'msg-1',
                userId: 'user-demo',
                userName: 'Alex P.',
                content: 'Hi Maestro! Do you have any VIP tips for the Champions League final?',
                createdAt: Date.now() - 3600000,
                isRead: false
            },
            {
                id: 'msg-2',
                userId: 'user-demo-2',
                userName: 'Sarah J.',
                content: 'The last accumulator was fire! Thanks for the win.',
                createdAt: Date.now() - 7200000,
                isRead: true,
                reply: 'You are welcome Sarah! Glad we could help you win big.'
            }
        ];
        this.safeSetItem(this.messagesKey, initialMessages);
    }
    console.log("JIRVINHO LOCAL DB INITIALIZED");
  }

  private safeSetItem(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Storage Quota Exceeded or Restricted", e);
    }
  }

  private async delay(ms: number = 0) {
    if (ms === 0) return;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- NOTIFICATION HELPERS ---
  
  private async notifyTips() {
      const tips = await this.getTips();
      this.tipListeners.forEach(cb => cb(tips));
  }
  
  private async notifyNews() {
      const news = await this.getNews();
      this.newsListeners.forEach(cb => cb(news));
  }

  private async notifySlides() {
      const slides = await this.getSlides();
      this.slideListeners.forEach(cb => cb(slides));
  }

  private async notifyMessages() {
      const allMsgs = await this.getMessages();
      this.messageListeners.forEach(listener => {
          if (listener.userId) {
              listener.callback(allMsgs.filter(m => m.userId === listener.userId));
          } else {
              listener.callback(allMsgs);
          }
      });
  }

  private async notifyUsers() {
      const users = await this.getAllUsers();
      this.userListeners.forEach(cb => cb(users));
  }

  // --- AUTH ---

  onAuthStateChange(callback: (user: User | null) => void) {
    const stored = localStorage.getItem(this.currentUserKey);
    if (stored) {
      callback(JSON.parse(stored));
    } else {
      callback(null);
    }
    return () => {}; // Unsubscribe function
  }

  async login(email: string, password: string): Promise<User> {
    await this.delay(200); 
    
    let users = await this.getAllUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Backdoor for Admin if not in list
    if (!user && email.toLowerCase() === 'admin@jirvinho.com') {
        user = { uid: 'admin-123', email, role: UserRole.ADMIN, displayName: 'Maestro Admin' };
        users.push(user);
        this.safeSetItem(this.usersKey, users);
    }

    // Auto-create generic user if not found (Simulation Mode for Demo)
    if (!user) {
        user = { uid: 'user-' + Date.now(), email, role: UserRole.USER, displayName: 'User' };
        users.push(user);
        this.safeSetItem(this.usersKey, users);
    }

    this.safeSetItem(this.currentUserKey, user);
    // Reload not strictly needed if we handled state completely reactively, but helps reset app state for demo
    window.location.reload(); 
    return user;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    await this.delay(200);
    const users = await this.getAllUsers();
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("User already registered.");
    }

    const newUser: User = { uid: 'user-' + Date.now(), email, role: UserRole.USER, displayName };
    users.push(newUser);
    this.safeSetItem(this.usersKey, users);
    
    this.safeSetItem(this.currentUserKey, newUser);
    window.location.reload();
    return newUser;
  }

  async logout(): Promise<void> {
    await this.delay(100);
    localStorage.removeItem(this.currentUserKey);
    window.location.reload();
  }

  async resetPassword(email: string): Promise<void> {
    await this.delay(500);
    console.log(`Reset link sent to ${email}`);
  }

  // --- USERS (Admin) ---

  async getAllUsers(): Promise<User[]> {
    const stored = localStorage.getItem(this.usersKey);
    return stored ? JSON.parse(stored) : [];
  }

  subscribeToAllUsers(callback: (users: User[]) => void) {
      this.userListeners.push(callback);
      this.getAllUsers().then(u => callback(u));
      return () => {
          this.userListeners = this.userListeners.filter(cb => cb !== callback);
      };
  }

  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    await this.delay(0);
    const users = await this.getAllUsers();
    const index = users.findIndex(u => u.uid === uid);
    
    if (index > -1) {
        users[index].role = newRole;
        this.safeSetItem(this.usersKey, users);
        
        // If updating the currently logged in user, update session too
        const stored = localStorage.getItem(this.currentUserKey);
        if (stored) {
             const currentUser = JSON.parse(stored);
             if (currentUser.uid === uid) {
                 currentUser.role = newRole;
                 this.safeSetItem(this.currentUserKey, currentUser);
             }
        }
        this.notifyUsers();
    }
  }

  async deleteUser(uid: string): Promise<void> {
    await this.delay(0);
    let users = await this.getAllUsers();
    users = users.filter(u => u.uid !== uid);
    this.safeSetItem(this.usersKey, users);
    this.notifyUsers();

    // If deleting self
    const stored = localStorage.getItem(this.currentUserKey);
    if (stored) {
        const currentUser = JSON.parse(stored);
        if (currentUser.uid === uid) {
            localStorage.removeItem(this.currentUserKey);
            window.location.reload();
        }
    }
  }

  // --- TIPS ---

  async getTips(): Promise<Tip[]> {
    return JSON.parse(localStorage.getItem(this.tipsKey) || '[]');
  }

  subscribeToTips(callback: (tips: Tip[]) => void) {
      this.tipListeners.push(callback);
      this.getTips().then(tips => callback(tips));
      return () => {
          this.tipListeners = this.tipListeners.filter(cb => cb !== callback);
      };
  }

  async addTip(tip: Omit<Tip, 'id' | 'createdAt' | 'status' | 'votes'>): Promise<void> {
    await this.delay(0);
    const tips = await this.getTips();
    const newTip: Tip = {
      ...tip,
      id: Date.now().toString(),
      status: TipStatus.PENDING,
      votes: { agree: 0, disagree: 0 },
      createdAt: Date.now()
    };
    tips.unshift(newTip);
    this.safeSetItem(this.tipsKey, tips);
    this.notifyTips();
  }

  async updateTip(tip: Tip): Promise<void> {
    await this.delay(0);
    let tips = await this.getTips();
    tips = tips.map(t => t.id === tip.id ? tip : t);
    this.safeSetItem(this.tipsKey, tips);
    this.notifyTips();
  }

  async voteOnTip(id: string, type: 'agree' | 'disagree'): Promise<void> {
    await this.delay(0);
    const tips = await this.getTips();
    const tipIndex = tips.findIndex(t => t.id === id);
    if (tipIndex > -1) {
        tips[tipIndex].votes[type]++;
        this.safeSetItem(this.tipsKey, tips);
        this.notifyTips();
    }
  }

  async deleteTip(id: string): Promise<void> {
    await this.delay(0);
    let tips = await this.getTips();
    tips = tips.filter(t => t.id !== id);
    this.safeSetItem(this.tipsKey, tips);
    this.notifyTips();
  }

  async settleTip(id: string, status: TipStatus, score?: string): Promise<void> {
    await this.delay(0);
    const tips = await this.getTips();
    const tipIndex = tips.findIndex(t => t.id === id);
    if (tipIndex > -1) {
        tips[tipIndex].status = status;
        if (score) tips[tipIndex].resultScore = score;
        this.safeSetItem(this.tipsKey, tips);
        this.notifyTips();
    }
  }

  // --- STATS ---
  // Stats are derived from tips in the UI mostly, but if needed:
  async getStats(): Promise<MaestroStats> {
    await this.delay(0);
    const tips = await this.getTips();
    const settledTips = tips.filter(t => t.status !== TipStatus.PENDING);
    const totalTips = settledTips.length;
    const wonTips = settledTips.filter(t => t.status === TipStatus.WON).length;
    const winRate = totalTips > 0 ? parseFloat(((wonTips / totalTips) * 100).toFixed(1)) : 0;
    
    // Streak: Last 10 settled
    const streak = settledTips
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map(t => t.status);

    return { winRate, totalTips, wonTips, streak };
  }

  // --- NEWS ---

  async getNews(): Promise<NewsPost[]> {
    return JSON.parse(localStorage.getItem(this.newsKey) || '[]');
  }

  subscribeToNews(callback: (news: NewsPost[]) => void) {
      this.newsListeners.push(callback);
      this.getNews().then(n => callback(n));
      return () => {
          this.newsListeners = this.newsListeners.filter(cb => cb !== callback);
      };
  }

  async addNews(post: Omit<NewsPost, 'id' | 'createdAt'>): Promise<void> {
    await this.delay(0);
    const news = await this.getNews();
    const newPost: NewsPost = {
        ...post,
        id: Date.now().toString(),
        createdAt: Date.now()
    };
    news.unshift(newPost);
    this.safeSetItem(this.newsKey, news);
    this.notifyNews();
  }

  async updateNews(post: NewsPost): Promise<void> {
    await this.delay(0);
    let news = await this.getNews();
    news = news.map(n => n.id === post.id ? post : n);
    this.safeSetItem(this.newsKey, news);
    this.notifyNews();
  }

  async deleteNews(id: string): Promise<void> {
    await this.delay(0);
    let news = await this.getNews();
    news = news.filter(n => n.id !== id);
    this.safeSetItem(this.newsKey, news);
    this.notifyNews();
  }

  // --- SLIDES ---

  async getSlides(): Promise<Slide[]> {
      return JSON.parse(localStorage.getItem(this.slidesKey) || '[]');
  }

  subscribeToSlides(callback: (slides: Slide[]) => void) {
      this.slideListeners.push(callback);
      this.getSlides().then(s => callback(s));
      return () => {
          this.slideListeners = this.slideListeners.filter(cb => cb !== callback);
      };
  }

  async addSlide(slide: Partial<Slide>): Promise<void> {
      await this.delay(0);
      const slides = await this.getSlides();
      const newSlide: Slide = {
          id: Date.now().toString(),
          image: slide.image || '',
          title: slide.title || '',
          subtitle: slide.subtitle || '',
          createdAt: Date.now()
      };
      slides.unshift(newSlide);
      this.safeSetItem(this.slidesKey, slides);
      this.notifySlides();
  }

  async updateSlide(slide: Slide): Promise<void> {
      await this.delay(0);
      let slides = await this.getSlides();
      slides = slides.map(s => s.id === slide.id ? slide : s);
      this.safeSetItem(this.slidesKey, slides);
      this.notifySlides();
  }

  async deleteSlide(id: string): Promise<void> {
      await this.delay(0);
      let slides = await this.getSlides();
      slides = slides.filter(s => s.id !== id);
      this.safeSetItem(this.slidesKey, slides);
      this.notifySlides();
  }

  // --- MESSAGES ---

  async getMessages(): Promise<Message[]> {
      const msgs = JSON.parse(localStorage.getItem(this.messagesKey) || '[]');
      return msgs.sort((a: Message, b: Message) => a.createdAt - b.createdAt);
  }

  subscribeToMessages(user: User, callback: (msgs: Message[]) => void) {
      const isOwner = user.role === UserRole.ADMIN;
      // If admin, we listen to all. If user, we listen to own.
      const listenerObj = {
          callback,
          userId: isOwner ? undefined : user.uid
      };
      this.messageListeners.push(listenerObj);
      
      this.getMessages().then(allMsgs => {
          if (isOwner) callback(allMsgs);
          else callback(allMsgs.filter(m => m.userId === user.uid));
      });

      return () => {
          this.messageListeners = this.messageListeners.filter(l => l !== listenerObj);
      };
  }

  async sendMessage(userId: string, userName: string, content: string): Promise<Message | null> {
      await this.delay(0);
      const msgs = await this.getMessages();
      const newMsg: Message = {
          id: Date.now().toString(),
          userId,
          userName,
          content,
          createdAt: Date.now(),
          isRead: false
      };
      msgs.push(newMsg);
      this.safeSetItem(this.messagesKey, msgs);
      this.notifyMessages();
      return newMsg;
  }

  async replyToMessage(messageId: string, replyContent: string): Promise<void> {
      await this.delay(0);
      const msgs = await this.getMessages();
      const idx = msgs.findIndex(m => m.id === messageId);
      if (idx > -1) {
          msgs[idx].reply = replyContent;
          msgs[idx].isRead = true;
          this.safeSetItem(this.messagesKey, msgs);
          this.notifyMessages();
      }
  }

  async deleteMessage(id: string): Promise<void> {
      await this.delay(0);
      let msgs = await this.getMessages();
      msgs = msgs.filter(m => m.id !== id);
      this.safeSetItem(this.messagesKey, msgs);
      this.notifyMessages();
  }
}

export const dbService = new MockDBService();
