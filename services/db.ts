
import { supabase } from './supabaseClient';
import { Tip, TipStatus, NewsPost, User, UserRole, MaestroStats, TipCategory, Message, Slide } from '../types';

class DBService {
  
  // --- AUTH ---

  // Add a listener for auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      
      if (session?.user) {
        // OPTIMISTIC UPDATE: 
        // Immediately callback with session data to unblock the UI (skip waiting for profile fetch)
        const optimisticUser: User = {
          uid: session.user.id,
          email: session.user.email!,
          role: UserRole.USER, // Default to USER temporarily
          displayName: session.user.user_metadata.displayName || 'User'
        };
        callback(optimisticUser);

        // Fetch profile to get authoritative role
        try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            // HARDCODED ADMIN OVERRIDE FOR OWNER
            // Critical Fix: Sync this to DB so RLS policies work
            const isAdminEmail = session.user.email === 'admin@jirvinho.com';
            let role = (profile?.role as UserRole) || UserRole.USER;

            if (isAdminEmail && role !== UserRole.ADMIN) {
                await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', session.user.id);
                role = UserRole.ADMIN;
            }

            const finalUser: User = {
              uid: session.user.id,
              email: session.user.email!,
              role: role,
              displayName: profile?.display_name || session.user.user_metadata.displayName || 'User'
            };

            callback(finalUser);
        } catch (e) {
            console.error("Profile fetch error", e);
            // Maintain optimistic user state if profile fetch fails
        }

      } else {
        callback(null);
      }
    });
  }

  async getCurrentUser(): Promise<User | null> {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.warn("Session Check Warning:", sessionError.message);
            return null;
        }
        if (!session?.user) return null;

        // Fetch profile for role
        const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

        // HARDCODED ADMIN OVERRIDE FOR OWNER
        const isAdminEmail = session.user.email === 'admin@jirvinho.com';
        let role = (profile?.role as UserRole) || UserRole.USER;

        // Sync Admin Status to DB if missing
        if (isAdminEmail && role !== UserRole.ADMIN) {
             await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', session.user.id);
             role = UserRole.ADMIN;
        }

        return {
        uid: session.user.id,
        email: session.user.email!,
        role: role,
        displayName: profile?.display_name || session.user.user_metadata.displayName || 'User'
        };
    } catch (e) {
        console.error("Error checking current user", e);
        return null;
    }
  }

  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Login failed");
    return (await this.getCurrentUser())!;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    // We pass displayName in options.data so the SQL Trigger can use it
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { displayName }
      }
    });
    
    if (error) throw error;
    
    // NOTE: We do NOT insert into profiles manually here anymore.
    // The SQL Trigger `on_auth_user_created` handles it.
    
    if (!data.user) throw new Error("Signup failed");
    return { uid: data.user.id, email: email, role: UserRole.USER, displayName };
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }
  
  // --- USERS ---
  
  async getAllUsers(): Promise<User[]> {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) return [];
      
      return data.map((p: any) => ({
          uid: p.id,
          email: p.email,
          role: p.role as UserRole,
          displayName: p.display_name
      }));
  }
  
  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', uid);
      if (error) throw error;
  }
  
  async deleteUser(uid: string): Promise<void> {
      // Note: Client SDK cannot delete from auth.users easily. 
      // We delete from profiles which effectively removes them from the app logic.
      const { error } = await supabase.from('profiles').delete().eq('id', uid);
      if (error) throw error;
  }

  // --- TIPS ---

  async getTips(): Promise<Tip[]> {
    try {
        const { data, error } = await supabase
        .from('tips')
        .select('*')
        .order('created_at', { ascending: false });
        
        if (error) {
            console.warn('SUPABASE TIPS FETCH ERROR:', error.message);
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
    } catch (err: any) {
        console.warn('Network/Fetch Error (Tips):', err.message);
        return [];
    }
  }

  async addTip(tip: Omit<Tip, 'id' | 'createdAt' | 'status' | 'votes'>): Promise<void> {
    const { error } = await supabase.from('tips').insert({
      category: tip.category,
      teams: tip.teams,
      league: tip.league,
      kickoff_time: tip.kickoffTime, // Ensure this matches SQL column snake_case
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
        console.error("ADD TIP ERROR:", error);
        throw error;
    }
  }

  async updateTip(tip: Tip): Promise<void> {
     const { error } = await supabase.from('tips').update({
         category: tip.category,
         teams: tip.teams,
         league: tip.league,
         kickoff_time: tip.kickoffTime,
         prediction: tip.prediction,
         odds: tip.odds,
         analysis: tip.analysis,
         betting_code: tip.bettingCode,
         legs: tip.legs
     }).eq('id', tip.id);
     
     if (error) throw error;
  }

  async voteOnTip(id: string, type: 'agree' | 'disagree'): Promise<void> {
    try {
        // Use the secure RPC function defined in SQL
        const { error } = await supabase.rpc('vote_for_tip', { 
            tip_id: id, 
            vote_type: type 
        });
        
        if (error) throw error;
    } catch (e) {
        console.error("Vote failed", e);
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
    try {
        // Optimized: Only fetch status counts, not full rows
        const { data: settledTips, error } = await supabase
             .from('tips')
             .select('status')
             .neq('status', 'PENDING');

        if (error || !settledTips) return { winRate: 0, totalTips: 0, wonTips: 0, streak: [] };

        const totalTips = settledTips.length;
        if (totalTips === 0) return { winRate: 0, totalTips: 0, wonTips: 0, streak: [] };

        const wonTips = settledTips.filter((t: any) => t.status === TipStatus.WON).length;
        const winRate = (wonTips / totalTips) * 100;

        // Fetch just the last 10 for streak
        const { data: recent } = await supabase
            .from('tips')
            .select('status')
            .neq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(10);

        const streak = recent ? recent.map((t: any) => t.status as TipStatus) : [];

        return {
          winRate: parseFloat(winRate.toFixed(1)),
          totalTips,
          wonTips,
          streak
        };
    } catch (err: any) {
        return { winRate: 0, totalTips: 0, wonTips: 0, streak: [] };
    }
  }

  // --- NEWS ---

  async getNews(): Promise<NewsPost[]> {
    try {
        const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });
        
        if (error) return [];
        if (!data) return [];
        
        return data.map((n: any) => ({
            ...n,
            imageUrl: n.image_url,
            videoUrl: n.video_url,
            matchDate: n.match_date,
            createdAt: n.created_at ? Number(n.created_at) : Date.now()
        }));
    } catch (err: any) {
        return [];
    }
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

  async updateNews(post: NewsPost): Promise<void> {
    const { error } = await supabase.from('news').update({
        title: post.title,
        category: post.category,
        source: post.source,
        body: post.body,
        image_url: post.imageUrl,
        video_url: post.videoUrl,
        match_date: post.matchDate
    }).eq('id', post.id);
    if (error) throw error;
  }
  
  async deleteNews(id: string): Promise<void> {
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) throw error;
  }
  
  // --- SLIDES ---
  
  async getSlides(): Promise<Slide[]> {
      const { data, error } = await supabase.from('slides').select('*').order('created_at', { ascending: false });
      if (error) return [];
      
      return data.map((s: any) => ({
          ...s,
          createdAt: s.created_at ? Number(s.created_at) : Date.now()
      }));
  }
  
  async addSlide(slide: Partial<Slide>): Promise<void> {
      const { error } = await supabase.from('slides').insert({
          image: slide.image,
          title: slide.title,
          subtitle: slide.subtitle,
          created_at: Date.now()
      });
      if (error) throw error;
  }

  async updateSlide(slide: Slide): Promise<void> {
      const { error } = await supabase.from('slides').update({
          image: slide.image,
          title: slide.title,
          subtitle: slide.subtitle
      }).eq('id', slide.id);
      if (error) throw error;
  }
  
  async deleteSlide(id: string): Promise<void> {
      const { error } = await supabase.from('slides').delete().eq('id', id);
      if (error) throw error;
  }

  // --- MESSAGES ---

  async getMessages(): Promise<Message[]> {
      try {
        // Changed to ascending: true so messages flow naturally (oldest top, newest bottom)
        const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
        if (error) return [];
        if (!data) return [];
        
        return data.map((m: any) => ({
            ...m,
            userId: m.user_id,
            userName: m.user_name,
            createdAt: m.created_at ? Number(m.created_at) : Date.now(),
            isRead: m.is_read
        }));
      } catch (e) {
          return [];
      }
  }

  async getUserMessages(userId: string): Promise<Message[]> {
      try {
        // Changed to ascending: true so messages flow naturally (oldest top, newest bottom)
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
            
        if (error) return [];
        if (!data) return [];

        return data.map((m: any) => ({
            ...m,
            userId: m.user_id,
            userName: m.user_name,
            createdAt: m.created_at ? Number(m.created_at) : Date.now(),
            isRead: m.is_read
        }));
      } catch (e) {
          return [];
      }
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

  async deleteMessage(id: string): Promise<void> {
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) throw error;
  }
}

export const dbService = new DBService();
    