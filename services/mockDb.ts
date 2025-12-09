
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
  private usersKey = 'jirvinho_users';
  private tipsKey = 'jirvinho_tips';
  private newsKey = 'jirvinho_news';
  private slidesKey = 'jirvinho_slides';
  private messagesKey = 'jirvinho_messages';
  private currentUserKey = 'jirvinho_current_user';

  constructor() {
    this.initData();
  }

  private initData() {
    if (!localStorage.getItem(this.tipsKey)) {
      localStorage.setItem(this.tipsKey, JSON.stringify(INITIAL_TIPS));
    }
    if (!localStorage.getItem(this.newsKey)) {
        localStorage.setItem(this.newsKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.slidesKey)) {
        localStorage.setItem(this.slidesKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.messagesKey)) {
        localStorage.setItem(this.messagesKey, JSON.stringify([]));
    }
  }

  private async delay(ms: number = 300) {
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
    await this.delay(100);
    const stored = localStorage.getItem(this.currentUserKey);
    return stored ? JSON.parse(stored) : null;
  }

  async login(email: string, password: string): Promise<User> {
    await this.delay(500);
    // Mock login: Accept admin/admin or any other valid format
    if (email === 'admin@jirvinho.com' && password === 'admin') {
      const user: User = { uid: 'admin-123', email, role: UserRole.ADMIN, displayName: 'Maestro Admin' };
      localStorage.setItem(this.currentUserKey, JSON.stringify(user));
      window.location.reload(); 
      return user;
    }
    
    // Generic user login simulation
    const user: User = { uid: 'user-' + Date.now(), email, role: UserRole.USER, displayName: 'User' };
    localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    window.location.reload();
    return user;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    await this.delay(500);
    const user: User = { uid: 'user-' + Date.now(), email, role: UserRole.USER, displayName };
    localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    window.location.reload();
    return user;
  }

  async logout(): Promise<void> {
    await this.delay(200);
    localStorage.removeItem(this.currentUserKey);
    window.location.reload();
  }

  async resetPassword(email: string): Promise<void> {
    await this.delay(500);
    console.log(`Reset link sent to ${email}`);
  }

  // --- USERS (Admin) ---

  async getAllUsers(): Promise<User[]> {
    await this.delay();
    // In a real mock, we might store a list of users. For now, just return current user + fake ones
    const currentUserStr = localStorage.getItem(this.currentUserKey);
    const users = currentUserStr ? [JSON.parse(currentUserStr)] : [];
    return users;
  }

  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    await this.delay();
    const currentUserStr = localStorage.getItem(this.currentUserKey);
    if (currentUserStr) {
        const user = JSON.parse(currentUserStr);
        if (user.uid === uid) {
            user.role = newRole;
            localStorage.setItem(this.currentUserKey, JSON.stringify(user));
        }
    }
  }

  async deleteUser(uid: string): Promise<void> {
    await this.delay();
    const currentUserStr = localStorage.getItem(this.currentUserKey);
    if (currentUserStr) {
        const user = JSON.parse(currentUserStr);
        if (user.uid === uid) {
            localStorage.removeItem(this.currentUserKey);
        }
    }
  }

  // --- TIPS ---

  async getTips(): Promise<Tip[]> {
    await this.delay();
    return JSON.parse(localStorage.getItem(this.tipsKey) || '[]');
  }

  async addTip(tip: Omit<Tip, 'id' | 'createdAt' | 'status' | 'votes'>): Promise<void> {
    await this.delay();
    const tips = await this.getTips();
    const newTip: Tip = {
      ...tip,
      id: Date.now().toString(),
      status: TipStatus.PENDING,
      votes: { agree: 0, disagree: 0 },
      createdAt: Date.now()
    };
    tips.unshift(newTip);
    localStorage.setItem(this.tipsKey, JSON.stringify(tips));
  }

  async updateTip(tip: Tip): Promise<void> {
    await this.delay();
    let tips = await this.getTips();
    tips = tips.map(t => t.id === tip.id ? tip : t);
    localStorage.setItem(this.tipsKey, JSON.stringify(tips));
  }

  async voteOnTip(id: string, type: 'agree' | 'disagree'): Promise<void> {
    await this.delay();
    const tips = await this.getTips();
    const tipIndex = tips.findIndex(t => t.id === id);
    if (tipIndex > -1) {
        tips[tipIndex].votes[type]++;
        localStorage.setItem(this.tipsKey, JSON.stringify(tips));
    }
  }

  async deleteTip(id: string): Promise<void> {
    await this.delay();
    let tips = await this.getTips();
    tips = tips.filter(t => t.id !== id);
    localStorage.setItem(this.tipsKey, JSON.stringify(tips));
  }

  async settleTip(id: string, status: TipStatus, score?: string): Promise<void> {
    await this.delay();
    const tips = await this.getTips();
    const tipIndex = tips.findIndex(t => t.id === id);
    if (tipIndex > -1) {
        tips[tipIndex].status = status;
        if (score) tips[tipIndex].resultScore = score;
        localStorage.setItem(this.tipsKey, JSON.stringify(tips));
    }
  }

  // --- STATS ---

  async getStats(): Promise<MaestroStats> {
    await this.delay();
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
    await this.delay();
    return JSON.parse(localStorage.getItem(this.newsKey) || '[]');
  }

  async addNews(post: Omit<NewsPost, 'id' | 'createdAt'>): Promise<void> {
    await this.delay();
    const news = await this.getNews();
    const newPost: NewsPost = {
        ...post,
        id: Date.now().toString(),
        createdAt: Date.now()
    };
    news.unshift(newPost);
    localStorage.setItem(this.newsKey, JSON.stringify(news));
  }

  async updateNews(post: NewsPost): Promise<void> {
    await this.delay();
    let news = await this.getNews();
    news = news.map(n => n.id === post.id ? post : n);
    localStorage.setItem(this.newsKey, JSON.stringify(news));
  }

  async deleteNews(id: string): Promise<void> {
    await this.delay();
    let news = await this.getNews();
    news = news.filter(n => n.id !== id);
    localStorage.setItem(this.newsKey, JSON.stringify(news));
  }

  // --- SLIDES ---

  async getSlides(): Promise<Slide[]> {
      await this.delay();
      return JSON.parse(localStorage.getItem(this.slidesKey) || '[]');
  }

  async addSlide(slide: Partial<Slide>): Promise<void> {
      await this.delay();
      const slides = await this.getSlides();
      const newSlide: Slide = {
          id: Date.now().toString(),
          image: slide.image || '',
          title: slide.title || '',
          subtitle: slide.subtitle || '',
          createdAt: Date.now()
      };
      slides.unshift(newSlide);
      localStorage.setItem(this.slidesKey, JSON.stringify(slides));
  }

  async updateSlide(slide: Slide): Promise<void> {
      await this.delay();
      let slides = await this.getSlides();
      slides = slides.map(s => s.id === slide.id ? slide : s);
      localStorage.setItem(this.slidesKey, JSON.stringify(slides));
  }

  async deleteSlide(id: string): Promise<void> {
      await this.delay();
      let slides = await this.getSlides();
      slides = slides.filter(s => s.id !== id);
      localStorage.setItem(this.slidesKey, JSON.stringify(slides));
  }

  // --- MESSAGES ---

  async getMessages(): Promise<Message[]> {
      await this.delay();
      const msgs = JSON.parse(localStorage.getItem(this.messagesKey) || '[]');
      return msgs.sort((a: Message, b: Message) => a.createdAt - b.createdAt);
  }

  async getUserMessages(userId: string): Promise<Message[]> {
      await this.delay();
      const allMsgs = await this.getMessages();
      return allMsgs.filter(m => m.userId === userId);
  }

  async sendMessage(userId: string, userName: string, content: string): Promise<Message | null> {
      await this.delay();
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
      localStorage.setItem(this.messagesKey, JSON.stringify(msgs));
      return newMsg;
  }

  async replyToMessage(messageId: string, replyContent: string): Promise<void> {
      await this.delay();
      const msgs = await this.getMessages();
      const idx = msgs.findIndex(m => m.id === messageId);
      if (idx > -1) {
          msgs[idx].reply = replyContent;
          msgs[idx].isRead = true;
          localStorage.setItem(this.messagesKey, JSON.stringify(msgs));
      }
  }

  async deleteMessage(id: string): Promise<void> {
      await this.delay();
      let msgs = await this.getMessages();
      msgs = msgs.filter(m => m.id !== id);
      localStorage.setItem(this.messagesKey, JSON.stringify(msgs));
  }
}

export const dbService = new MockDBService();
