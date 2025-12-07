import { Tip, TipStatus, NewsPost, User, UserRole, MaestroStats, TipCategory, Message } from '../types';

// Initial Mock Data
const MOCK_TIPS: Tip[] = [
  {
    id: 't1',
    category: TipCategory.SINGLE,
    teams: 'Flamengo vs Fluminense',
    league: 'Brasileirão Serie A',
    kickoffTime: new Date(Date.now() - 86400000).toISOString(),
    sport: 'Football',
    prediction: 'Flamengo to Win',
    odds: 1.85,
    confidence: 'High',
    status: TipStatus.WON,
    resultScore: '2-0',
    analysis: 'Flamengo is on a hot streak at the Maracanã.',
    votes: { agree: 124, disagree: 12 },
    bettingCode: 'BR-12345',
    createdAt: Date.now() - 90000000
  },
  {
    id: 't2',
    category: TipCategory.ODD_2_PLUS,
    teams: 'São Paulo vs Corinthians',
    league: 'Brasileirão Serie A',
    kickoffTime: new Date(Date.now() - 172800000).toISOString(),
    sport: 'Football',
    prediction: 'Under 2.5 Goals',
    odds: 2.10,
    confidence: 'Medium',
    status: TipStatus.LOST,
    resultScore: '2-2',
    votes: { agree: 89, disagree: 45 },
    createdAt: Date.now() - 180000000
  },
  {
    id: 't3',
    category: TipCategory.ODD_4_PLUS,
    teams: 'Lakers vs Warriors',
    league: 'NBA',
    kickoffTime: new Date(Date.now() + 3600000).toISOString(),
    sport: 'Basketball',
    prediction: 'Lakers -4.5 & Over 220',
    odds: 4.50,
    confidence: 'High',
    status: TipStatus.PENDING,
    analysis: 'LeBron is back in the lineup tonight and the pace will be fast.',
    votes: { agree: 342, disagree: 28 },
    bettingCode: 'NBA-998877',
    createdAt: Date.now()
  }
];

const MOCK_NEWS: NewsPost[] = [
  {
    id: 'n1',
    title: 'Neymar Returns to Santos?',
    category: 'Brazil Focus',
    source: 'Globo Esporte',
    body: 'Rumors are swirling about a potential return of the superstar to his boyhood club next season.',
    imageUrl: 'https://images.unsplash.com/photo-1516731237713-fc8802a88663?auto=format&fit=crop&q=80&w=600',
    createdAt: Date.now()
  },
  {
    id: 'n2',
    title: 'Brasileirão Title Race Heats Up',
    category: 'Football',
    source: 'ESPN Brazil',
    body: 'Botafogo drops points allowing Palmeiras to close the gap to just 3 points with 5 games to go.',
    matchDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    createdAt: Date.now() - 86400000
  }
];

class MockDBService {
  private tipsKey = 'jirvinho_tips';
  private newsKey = 'jirvinho_news';
  private userKey = 'jirvinho_user';
  private messagesKey = 'jirvinho_messages';
  private authListeners: ((user: User | null) => void)[] = [];

  constructor() {
    if (!localStorage.getItem(this.tipsKey)) {
      localStorage.setItem(this.tipsKey, JSON.stringify(MOCK_TIPS));
    }
    if (!localStorage.getItem(this.newsKey)) {
      localStorage.setItem(this.newsKey, JSON.stringify(MOCK_NEWS));
    }
    // Initialize messages if empty
    if (!localStorage.getItem(this.messagesKey)) {
        localStorage.setItem(this.messagesKey, JSON.stringify([]));
    }
  }

  // --- AUTH ---
  
  onAuthStateChange(callback: (user: User | null) => void) {
      this.authListeners.push(callback);
      // Fire immediately with current state
      this.getCurrentUser().then(user => callback(user));
      
      return {
          data: {
              subscription: {
                  unsubscribe: () => {
                      this.authListeners = this.authListeners.filter(cb => cb !== callback);
                  }
              }
          }
      };
  }

  private notifyAuthListeners(user: User | null) {
      this.authListeners.forEach(cb => cb(user));
  }

  async getCurrentUser(): Promise<User | null> {
      // Changed to localStorage for persistence across sessions
      const stored = localStorage.getItem(this.userKey);
      return stored ? JSON.parse(stored) : null;
  }

  async login(email: string, password: string): Promise<User> {
    // Instant login
    let user: User | null = null;
    if (email === 'admin@jirvinho.com' && password === 'admin123') {
      user = { uid: 'admin_001', email, role: UserRole.ADMIN, displayName: 'The Maestro' };
    } else if (email === 'user@test.com' && password === 'user123') {
      user = { uid: 'user_001', email, role: UserRole.USER, displayName: 'Sports Fan' };
    } else {
         const storedUser = localStorage.getItem(`user_${email}`);
         if (storedUser) {
             const u = JSON.parse(storedUser);
             if (u.password === password) {
                 user = { uid: u.uid, email: u.email, role: u.role, displayName: u.displayName };
             }
         }
    }

    if (user) {
        // Changed to localStorage for persistence
        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.notifyAuthListeners(user);
        return user;
    }
    throw new Error('Invalid credentials.');
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
      if (email === 'admin@jirvinho.com' || email === 'user@test.com') {
          throw new Error('User already exists.');
      }
      const newUser = {
          uid: 'user_' + Math.random().toString(36).substr(2, 9),
          email,
          password, 
          role: UserRole.USER,
          displayName
      };
      localStorage.setItem(`user_${email}`, JSON.stringify(newUser));
      
      const sessionUser: User = { uid: newUser.uid, email: newUser.email, role: newUser.role, displayName: newUser.displayName };
      // Changed to localStorage for persistence
      localStorage.setItem(this.userKey, JSON.stringify(sessionUser));
      this.notifyAuthListeners(sessionUser);
      return sessionUser;
  }

  async resetPassword(email: string): Promise<void> {
      console.log(`Password reset link sent to ${email}`);
      return Promise.resolve();
  }

  async logout() {
    // Changed to localStorage for persistence
    localStorage.removeItem(this.userKey);
    this.notifyAuthListeners(null);
  }

  // --- TIPS ---

  async getTips(): Promise<Tip[]> {
      const tips = JSON.parse(localStorage.getItem(this.tipsKey) || '[]');
      return tips.sort((a: Tip, b: Tip) => b.createdAt - a.createdAt);
  }

  async addTip(tip: any): Promise<void> {
      const tips = await this.getTips();
      const newTip = { 
          ...tip, 
          id: Math.random().toString(36).substr(2, 9), 
          createdAt: Date.now(), 
          votes: {agree:0, disagree:0},
          status: TipStatus.PENDING 
      };
      tips.push(newTip);
      localStorage.setItem(this.tipsKey, JSON.stringify(tips));
  }

  async updateTip(tip: Tip): Promise<void> {
      // Stub for interface compatibility
  }

  async deleteTip(id: string): Promise<void> {
      let tips = await this.getTips();
      tips = tips.filter(t => t.id !== id);
      localStorage.setItem(this.tipsKey, JSON.stringify(tips));
  }

  async settleTip(id: string, status: TipStatus, score?: string): Promise<void> {
      const tips = await this.getTips();
      const tipIndex = tips.findIndex(t => t.id === id);
      if (tipIndex > -1) {
          tips[tipIndex].status = status;
          if (score) tips[tipIndex].resultScore = score;
          localStorage.setItem(this.tipsKey, JSON.stringify(tips));
      }
  }

  async voteOnTip(id: string, type: 'agree' | 'disagree'): Promise<void> {
      const tips = await this.getTips();
      const tipIndex = tips.findIndex(t => t.id === id);
      if (tipIndex > -1) {
          if (!tips[tipIndex].votes) tips[tipIndex].votes = { agree: 0, disagree: 0 };
          
          if (type === 'agree') tips[tipIndex].votes.agree++;
          else tips[tipIndex].votes.disagree++;
          
          localStorage.setItem(this.tipsKey, JSON.stringify(tips));
      }
  }

  // --- NEWS ---

  async getNews(): Promise<NewsPost[]> {
      const news = JSON.parse(localStorage.getItem(this.newsKey) || '[]');
      return news.sort((a: NewsPost, b: NewsPost) => b.createdAt - a.createdAt);
  }

  async addNews(post: any): Promise<void> {
      const news = await this.getNews();
      const newPost = { ...post, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() };
      news.push(newPost);
      localStorage.setItem(this.newsKey, JSON.stringify(news));
  }

  async deleteNews(id: string): Promise<void> {
      let news = await this.getNews();
      news = news.filter(n => n.id !== id);
      localStorage.setItem(this.newsKey, JSON.stringify(news));
  }

  // --- STATS ---

  async getStats(): Promise<MaestroStats> {
      const tips = await this.getTips();
      const settledTips = tips.filter(t => t.status !== TipStatus.PENDING);
      
      let wins = 0;
      settledTips.forEach(t => {
          if (t.status === TipStatus.WON) wins++;
      });

      const winRate = settledTips.length > 0 ? (wins / settledTips.length) * 100 : 0;
      const streak = settledTips
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map(t => t.status);

      return {
          winRate: parseFloat(winRate.toFixed(1)),
          totalTips: settledTips.length,
          wonTips: wins,
          streak
      };
  }

  // --- MESSAGES ---

  async getMessages(): Promise<Message[]> {
      const msgs = JSON.parse(localStorage.getItem(this.messagesKey) || '[]');
      return msgs.sort((a: Message, b: Message) => b.createdAt - a.createdAt);
  }

  async getUserMessages(userId: string): Promise<Message[]> {
      const msgs = await this.getMessages();
      return msgs.filter(m => m.userId === userId);
  }

  async sendMessage(userId: string, userName: string, content: string): Promise<void> {
      const msgs = await this.getMessages();
      const newMsg: Message = {
          id: Math.random().toString(36).substr(2, 9),
          userId,
          userName,
          content,
          createdAt: Date.now(),
          isRead: false
      };
      msgs.push(newMsg);
      localStorage.setItem(this.messagesKey, JSON.stringify(msgs));
  }

  async replyToMessage(messageId: string, replyContent: string): Promise<void> {
      const msgs = await this.getMessages();
      const index = msgs.findIndex(m => m.id === messageId);
      if (index > -1) {
          msgs[index].reply = replyContent;
          msgs[index].isRead = true;
          localStorage.setItem(this.messagesKey, JSON.stringify(msgs));
      }
  }

  async seedDatabase(): Promise<void> {
      localStorage.setItem(this.tipsKey, JSON.stringify(MOCK_TIPS));
      localStorage.setItem(this.newsKey, JSON.stringify(MOCK_NEWS));
      // Reset Messages
      localStorage.setItem(this.messagesKey, JSON.stringify([]));
  }
}

export const mockDB = new MockDBService();