
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
  private usersKey = 'jirvinho_users_list'; // Key for the list of all users
  private currentUserKey = 'jirvinho_current_user'; // Key for the currently logged in session
  private tipsKey = 'jirvinho_tips';
  private newsKey = 'jirvinho_news';
  private slidesKey = 'jirvinho_slides';
  private messagesKey = 'jirvinho_messages';

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

  // Wrapper for safe storage
  private safeSetItem(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Storage Quota Exceeded or Restricted", e);
    }
  }

  // Zero delay for instant local feel
  private async delay(ms: number = 0) {
    if (ms === 0) return;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- AUTH ---

  onAuthStateChange(callback: (user: User | null) => void) {
    const stored = localStorage.getItem(this.currentUserKey);
    if (stored) {
      callback(JSON.parse(stored));
    } else {
      callback(null);
    }
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  async getCurrentUser(): Promise<User | null> {
    await this.delay(0);
    const stored = localStorage.getItem(this.currentUserKey);
    return stored ? JSON.parse(stored) : null;
  }

  async login(email: string, password: string): Promise<User> {
    await this.delay(0); 
    
    let users = await this.getAllUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Backdoor for Admin if not in list
    if (!user && email.toLowerCase() === 'admin@jirvinho.com') {
        user = { uid: 'admin-123', email, role: UserRole.ADMIN, displayName: 'Maestro Admin' };
        users.push(user);
        this.safeSetItem(this.usersKey, users);
    }

    // Auto-create generic user if not found (Simulation Mode)
    if (!user) {
        user = { uid: 'user-' + Date.now(), email, role: UserRole.USER, displayName: 'User' };
        users.push(user);
        this.safeSetItem(this.usersKey, users);
    }

    this.safeSetItem(this.currentUserKey, user);
    window.location.reload(); 
    return user;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    await this.delay(0);
    const users = await this.getAllUsers();
    
    // Check if exists
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
    await this.delay(0);
    localStorage.removeItem(this.currentUserKey);
    window.location.reload();
  }

  async resetPassword(email: string): Promise<void> {
    await this.delay(0);
    console.log(`Reset link sent to ${email}`);
  }

  // --- USERS (Admin) ---

  async getAllUsers(): Promise<User[]> {
    await this.delay(0);
    const stored = localStorage.getItem(this.usersKey);
    return stored ? JSON.parse(stored) : [];
  }

  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    await this.delay(0);
    const users = await this.getAllUsers();
    const index = users.findIndex(u => u.uid === uid);
    
    if (index > -1) {
        users[index].role = newRole;
        this.safeSetItem(this.usersKey, users);
        
        // If updating the currently logged in user, update session too
        const currentUser = await this.getCurrentUser();
        if (currentUser && currentUser.uid === uid) {
            currentUser.role = newRole;
            this.safeSetItem(this.currentUserKey, currentUser);
        }
    }
  }

  async deleteUser(uid: string): Promise<void> {
    await this.delay(0);
    let users = await this.getAllUsers();
    users = users.filter(u => u.uid !== uid);
    this.safeSetItem(this.usersKey, users);

    // If deleting self (should be prevented by UI, but good safety)
    const currentUser = await this.getCurrentUser();
    if (currentUser && currentUser.uid === uid) {
        localStorage.removeItem(this.currentUserKey);
        window.location.reload();
    }
  }

  // --- TIPS ---

  async getTips(): Promise<Tip[]> {
    await this.delay(0);
    return JSON.parse(localStorage.getItem(this.tipsKey) || '[]');
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
  }

  async updateTip(tip: Tip): Promise<void> {
    await this.delay(0);
    let tips = await this.getTips();
    tips = tips.map(t => t.id === tip.id ? tip : t);
    this.safeSetItem(this.tipsKey, tips);
  }

  async voteOnTip(id: string, type: 'agree' | 'disagree'): Promise<void> {
    await this.delay(0);
    const tips = await this.getTips();
    const tipIndex = tips.findIndex(t => t.id === id);
    if (tipIndex > -1) {
        tips[tipIndex].votes[type]++;
        this.safeSetItem(this.tipsKey, tips);
    }
  }

  async deleteTip(id: string): Promise<void> {
    await this.delay(0);
    let tips = await this.getTips();
    tips = tips.filter(t => t.id !== id);
    this.safeSetItem(this.tipsKey, tips);
  }

  async settleTip(id: string, status: TipStatus, score?: string): Promise<void> {
    await this.delay(0);
    const tips = await this.getTips();
    const tipIndex = tips.findIndex(t => t.id === id);
    if (tipIndex > -1) {
        tips[tipIndex].status = status;
        if (score) tips[tipIndex].resultScore = score;
        this.safeSetItem(this.tipsKey, tips);
    }
  }

  // --- STATS ---

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
    await this.delay(0);
    return JSON.parse(localStorage.getItem(this.newsKey) || '[]');
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
  }

  async updateNews(post: NewsPost): Promise<void> {
    await this.delay(0);
    let news = await this.getNews();
    news = news.map(n => n.id === post.id ? post : n);
    this.safeSetItem(this.newsKey, news);
  }

  async deleteNews(id: string): Promise<void> {
    await this.delay(0);
    let news = await this.getNews();
    news = news.filter(n => n.id !== id);
    this.safeSetItem(this.newsKey, news);
  }

  // --- SLIDES ---

  async getSlides(): Promise<Slide[]> {
      await this.delay(0);
      return JSON.parse(localStorage.getItem(this.slidesKey) || '[]');
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
  }

  async updateSlide(slide: Slide): Promise<void> {
      await this.delay(0);
      let slides = await this.getSlides();
      slides = slides.map(s => s.id === slide.id ? slide : s);
      this.safeSetItem(this.slidesKey, slides);
  }

  async deleteSlide(id: string): Promise<void> {
      await this.delay(0);
      let slides = await this.getSlides();
      slides = slides.filter(s => s.id !== id);
      this.safeSetItem(this.slidesKey, slides);
  }

  // --- MESSAGES ---

  async getMessages(): Promise<Message[]> {
      await this.delay(0);
      const msgs = JSON.parse(localStorage.getItem(this.messagesKey) || '[]');
      return msgs.sort((a: Message, b: Message) => a.createdAt - b.createdAt);
  }

  async getUserMessages(userId: string): Promise<Message[]> {
      await this.delay(0);
      const allMsgs = await this.getMessages();
      return allMsgs.filter(m => m.userId === userId);
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
      }
  }

  async deleteMessage(id: string): Promise<void> {
      await this.delay(0);
      let msgs = await this.getMessages();
      msgs = msgs.filter(m => m.id !== id);
      this.safeSetItem(this.messagesKey, msgs);
  }
}

export const dbService = new MockDBService();
