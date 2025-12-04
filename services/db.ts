import { supabase } from './supabaseClient';
import { Tip, TipStatus, NewsPost, User, UserRole, MaestroStats, TipCategory, Message } from '../types';

class DBService {
  
  // --- AUTH ---

  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // Fetch profile for role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
        console.warn("Profile fetch warning (Tables might be missing):", error.message);
    }

    return {
      uid: session.user.id,
      email: session.user.email!,
      role: (profile?.role as UserRole) || UserRole.USER,
      displayName: profile?.display_name || session.user.user_metadata.displayName || 'User'
    };
  }

  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Login failed");
    return (await this.getCurrentUser())!;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { displayName }
      }
    });
    if (error) throw error;
    if (!data.user) throw new Error("Signup failed");
    return { uid: data.user.id, email: email, role: UserRole.USER, displayName };
  }

  async loginWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) throw error;
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  // --- TIPS ---

  async getTips(): Promise<Tip[]> {
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
        console.error('SUPABASE TIPS FETCH ERROR:', error.message);
        return [];
    }
    
    if (!data) return [];

    return data.map((t: any) => ({
      ...t,
      kickoffTime: t.kickoff_time,
      bettingCode: t.betting_code,
      resultScore: t.result_score,
      createdAt: t.created_at ? Number(t.created_at) : Date.now()
    }));
  }

  async addTip(tip: Omit<Tip, 'id' | 'createdAt' | 'status' | 'votes'>): Promise<void> {
    const { error } = await supabase.from('tips').insert({
      category: tip.category,
      teams: tip.teams,
      league: tip.league,
      kickoff_time: tip.kickoffTime,
      sport: tip.sport,
      prediction: tip.prediction,
      odds: tip.odds,
      confidence: tip.confidence,
      status: TipStatus.PENDING,
      analysis: tip.analysis,
      betting_code: tip.bettingCode,
      legs: tip.legs,
      votes: { agree: 0, disagree: 0 },
      created_at: Date.now()
    });
    if (error) {
        console.error('SUPABASE ADD TIP ERROR:', error.message);
        throw error;
    }
  }

  async updateTip(updatedTip: Tip): Promise<void> {
     // Placeholder for future update logic
  }

  async voteOnTip(id: string, type: 'agree' | 'disagree'): Promise<void> {
    const { data: tip } = await supabase.from('tips').select('votes').eq('id', id).single();
    if (tip) {
        const votes = tip.votes || { agree: 0, disagree: 0 };
        if (type === 'agree') votes.agree++;
        else votes.disagree++;
        
        await supabase.from('tips').update({ votes }).eq('id', id);
    }
  }

  async deleteTip(id: string): Promise<void> {
    const { error } = await supabase.from('tips').delete().eq('id', id);
    if (error) throw error;
  }

  async settleTip(id: string, status: TipStatus, score?: string): Promise<void> {
    const updateData: any = { status };
    if (score) updateData.result_score = score;
    
    const { error } = await supabase.from('tips').update(updateData).eq('id', id);
    if (error) throw error;
  }

  // --- STATS ---

  async getStats(): Promise<MaestroStats> {
    const { data: tips, error } = await supabase.from('tips').select('status, created_at').neq('status', 'PENDING');
    
    if (error) {
        console.warn('Stats fetch warning:', error.message);
        return { winRate: 0, totalTips: 0, wonTips: 0, streak: [] };
    }
    
    if (!tips) return { winRate: 0, totalTips: 0, wonTips: 0, streak: [] };

    let wins = 0;
    tips.forEach((t: any) => {
      if (t.status === TipStatus.WON) wins++;
    });

    const winRate = tips.length > 0 ? (wins / tips.length) * 100 : 0;
    const streak = tips
        .sort((a: any, b: any) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0))
        .slice(0, 10)
        .map((t: any) => t.status as TipStatus);

    return {
      winRate: parseFloat(winRate.toFixed(1)),
      totalTips: tips.length,
      wonTips: wins,
      streak
    };
  }

  // --- NEWS ---

  async getNews(): Promise<NewsPost[]> {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
        console.error('SUPABASE NEWS FETCH ERROR:', error.message);
        return [];
    }
    
    if (!data) return [];
    
    return data.map((n: any) => ({
        ...n,
        imageUrl: n.image_url,
        videoUrl: n.video_url,
        matchDate: n.match_date,
        createdAt: n.created_at ? Number(n.created_at) : Date.now()
    }));
  }

  async addNews(post: Omit<NewsPost, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await supabase.from('news').insert({
        title: post.title,
        category: post.category,
        source: post.source,
        body: post.body,
        image_url: post.imageUrl,
        video_url: post.videoUrl,
        match_date: post.matchDate,
        created_at: Date.now()
    });
    if (error) throw error;
  }
  
  async deleteNews(id: string): Promise<void> {
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) throw error;
  }

  // --- MESSAGES ---

  async getMessages(): Promise<Message[]> {
      const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
      if (error) {
          console.error('SUPABASE MESSAGES ERROR:', error.message);
          return [];
      }
      if (!data) return [];
      
      return data.map((m: any) => ({
          ...m,
          userId: m.user_id,
          userName: m.user_name,
          createdAt: m.created_at ? Number(m.created_at) : Date.now(),
          isRead: m.is_read
      }));
  }

  async getUserMessages(userId: string): Promise<Message[]> {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
           console.error('SUPABASE USER MESSAGES ERROR:', error.message);
           return [];
      }
      if (!data) return [];

      return data.map((m: any) => ({
          ...m,
          userId: m.user_id,
          userName: m.user_name,
          createdAt: m.created_at ? Number(m.created_at) : Date.now(),
          isRead: m.is_read
      }));
  }

  async sendMessage(userId: string, userName: string, content: string): Promise<void> {
      const { error } = await supabase.from('messages').insert({
          user_id: userId,
          user_name: userName,
          content,
          created_at: Date.now(),
          is_read: false
      });
      if (error) throw error;
  }

  async replyToMessage(messageId: string, replyContent: string): Promise<void> {
      const { error } = await supabase
        .from('messages')
        .update({ reply: replyContent, is_read: true })
        .eq('id', messageId);
      if (error) throw error;
  }

  // --- SEED HELPER ---
  async seedDatabase(): Promise<void> {
      console.log("Seeding database...");
      
      // 1. Seed News
      await this.addNews({
          title: "Welcome to Jirvinho Sports Maestro!",
          category: "Announcement",
          source: "Jirvinho Admin",
          body: "We are live! Stay tuned for daily tips and analysis.",
          matchDate: new Date().toISOString()
      });

      // 2. Seed Tips
      await this.addTip({
          category: TipCategory.SINGLE,
          teams: "Man City vs Arsenal",
          league: "Premier League",
          kickoffTime: new Date(Date.now() + 86400000).toISOString(),
          sport: "Football",
          prediction: "Over 2.5 Goals",
          odds: 1.85,
          confidence: "High",
          analysis: "High stakes match, both teams will push for goals.",
          bettingCode: "EX-123",
          legs: []
      });

      await this.addTip({
          category: TipCategory.ODD_4_PLUS,
          teams: "Accumulator",
          league: "Multiple",
          kickoffTime: new Date(Date.now() + 86400000).toISOString(),
          sport: "Football",
          prediction: "See Selections",
          odds: 5.50,
          confidence: "Medium",
          analysis: "Value selections for the weekend.",
          bettingCode: "ACC-555",
          legs: [
              {teams: "Real Madrid vs Barca", league: "La Liga", prediction: "Real Madrid Win"},
              {teams: "Bayern vs Dortmund", league: "Bundesliga", prediction: "Over 3.5 Goals"}
          ]
      });
  }
}

export const dbService = new DBService();