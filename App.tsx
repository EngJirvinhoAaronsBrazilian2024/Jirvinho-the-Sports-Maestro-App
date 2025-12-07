
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Tip, NewsPost, MaestroStats, TipStatus, TipCategory, TipLeg, Message, Slide } from './types';
// Using Mock DB as per current configuration
import { mockDB as dbService } from './services/mockDb';
import { generateMatchAnalysis, checkBetResult } from './services/geminiService';
import { Layout } from './components/Layout';
import { TipCard } from './components/TipCard';
import { StatsWidget } from './components/StatsWidget';
import { ImageSlider } from './components/ImageSlider';
import { LiveScoreBoard } from './components/LiveScoreBoard';
import { 
  PlayCircle, Lock, Mail, ChevronRight, Plus, Trash2, Save, FileText, Check, X, 
  RefreshCw, Smartphone, TrendingUp, Award, Target, UserPlus, XCircle, Trophy, 
  Flame, Eye, EyeOff, MessageSquare, Send, Globe, Newspaper, Calendar, Database, 
  Wand2, Upload, ExternalLink, Users, Shield, ShieldAlert, Edit3, ArrowLeft, 
  Activity, LayoutDashboard, Image as ImageIcon, UploadCloud
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

// --- Constants ---

const LEAGUES = [
  "Brasileirão Serie A", "Brasileirão Serie B", "Copa do Brasil",
  "Premier League (England)", "La Liga (Spain)", "Bundesliga (Germany)", "Serie A (Italy)", "Ligue 1 (France)",
  "Champions League", "Europa League", "Copa Libertadores", "Copa Sudamericana",
  "MLS (USA)", "Saudi Pro League", "Eredivisie (Netherlands)", "Primeira Liga (Portugal)",
  "Süper Lig (Turkey)", "Championship (England)", "NBA (Basketball)", "NFL (American Football)"
];

// --- App Component ---

export const App: React.FC = () => {
  // Auth State
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // App Data State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tips, setTips] = useState<Tip[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [stats, setStats] = useState<MaestroStats>({ winRate: 0, totalTips: 0, wonTips: 0, streak: [] });
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // Dashboard Specific State
  const [mobileTab, setMobileTab] = useState<TipCategory>(TipCategory.SINGLE);
  
  // Admin State
  const [adminTab, setAdminTab] = useState<'overview' | 'tips' | 'news' | 'slides' | 'users' | 'messages'>('overview');
  const [editingTipId, setEditingTipId] = useState<string | null>(null);
  
  const [newTip, setNewTip] = useState<Partial<Tip>>({
    category: TipCategory.SINGLE,
    teams: '', league: LEAGUES[0], prediction: '', odds: 1.50, confidence: 'Medium', sport: 'Football', bettingCode: '', legs: [], kickoffTime: '', analysis: ''
  });
  const [multiLegInput, setMultiLegInput] = useState<TipLeg>({ teams: '', league: LEAGUES[0], prediction: '' });
  
  const [newNews, setNewNews] = useState<Partial<NewsPost>>({ title: '', category: 'Football', source: '', body: '', imageUrl: '', videoUrl: '', matchDate: '' });
  const [newSlide, setNewSlide] = useState<Partial<Slide>>({ title: '', subtitle: '', image: '' });
  
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  // User Contact State
  const [contactMessage, setContactMessage] = useState('');

  // --- Optimized Fetch Data ---
  const fetchData = useCallback(async (currentUser: User | null) => {
    try {
        const [tipsData, newsData, statsData, slidesData] = await Promise.all([
            dbService.getTips(),
            dbService.getNews(),
            dbService.getStats(),
            dbService.getSlides()
        ]);
        
        setTips(tipsData);
        setNews(newsData);
        setStats(statsData);
        setSlides(slidesData);

        if (currentUser) {
            const msgs = currentUser.role === UserRole.ADMIN 
                ? await dbService.getMessages() 
                : await dbService.getUserMessages(currentUser.uid);
            setMessages(msgs);

            if (currentUser.role === UserRole.ADMIN) {
                // @ts-ignore - mockDb specific method
                if(dbService.getAllUsers) {
                    // @ts-ignore
                    const uList = await dbService.getAllUsers();
                    setAllUsers(uList);
                }
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
  }, []); // Stable callback with no dependencies

  // --- Initialization ---
  useEffect(() => {
    let mounted = true;

    // Subscribe to auth changes
    // @ts-ignore
    const { data: authListener } = dbService.onAuthStateChange((u) => {
        if (!mounted) return;
        
        // Deep comparison to prevent loop if object reference changes but content is same
        setUser(prev => {
            if (JSON.stringify(prev) === JSON.stringify(u)) return prev;
            return u;
        });
        
        if (u) {
             fetchData(u);
        } else {
             setTips([]); setNews([]); setSlides([]); setStats({winRate:0, totalTips:0, wonTips:0, streak:[]});
        }
        setIsInitializing(false);
    });

    return () => {
        mounted = false;
        if (authListener?.subscription) authListener.subscription.unsubscribe();
    };
  }, [fetchData]); // Only depends on stable fetchData

  // --- Polling ---
  useEffect(() => {
      if (!user) return;
      const interval = setInterval(() => {
          fetchData(user);
      }, 15000);
      return () => clearInterval(interval);
  }, [user, fetchData]);


  // --- Handlers ---

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setAuthError('');
    try {
      if (authMode === 'login') {
        await dbService.login(email, password);
      } else if (authMode === 'signup') {
        await dbService.signUp(email, password, displayName);
      } else {
        await dbService.resetPassword(email);
        alert('Password reset link sent!');
        setAuthMode('login');
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await dbService.logout();
    setActiveTab('dashboard');
  };

  const handleVote = async (id: string, type: 'agree' | 'disagree') => {
    await dbService.voteOnTip(id, type);
    if (user) fetchData(user);
  };

  // --- Admin Handlers ---

  const handleGenerateAnalysis = async () => {
    if (!newTip.teams || !newTip.league) {
        alert("Please enter Teams and League first.");
        return;
    }
    setIsGeneratingAI(true);
    const analysis = await generateMatchAnalysis(newTip.teams, newTip.league);
    setNewTip({ ...newTip, analysis });
    setIsGeneratingAI(false);
  };

  const handleAddLeg = () => {
    if (multiLegInput.teams && multiLegInput.prediction) {
      setNewTip({ ...newTip, legs: [...(newTip.legs || []), multiLegInput] });
      setMultiLegInput({ teams: '', league: LEAGUES[0], prediction: '' });
    }
  };

  const handleRemoveLeg = (idx: number) => {
      const updated = [...(newTip.legs || [])];
      updated.splice(idx, 1);
      setNewTip({ ...newTip, legs: updated });
  };

  const handleSaveTip = async () => {
      if (!newTip.teams || !newTip.prediction || !newTip.odds) {
          alert("Please fill in Teams, Prediction and Odds.");
          return;
      }
      
      try {
          if (editingTipId) {
             const updatedTip = { ...newTip, id: editingTipId } as Tip;
             await dbService.updateTip(updatedTip);
             setEditingTipId(null);
          } else {
             // @ts-ignore
             await dbService.addTip(newTip);
          }
          
          setNewTip({
            category: TipCategory.SINGLE,
            teams: '', league: LEAGUES[0], prediction: '', odds: 1.50, confidence: 'Medium', sport: 'Football', bettingCode: '', legs: [], kickoffTime: '', analysis: ''
          });
          if (user) fetchData(user);
          alert(editingTipId ? "Tip Updated!" : "Tip Added!");
      } catch (e) {
          alert("Error saving tip.");
      }
  };

  const handleDeleteTip = async (id: string) => {
      if (window.confirm('Delete this tip?')) {
          await dbService.deleteTip(id);
          fetchData(user); // Force Refresh
      }
  };

  const handleSettleTip = async (id: string, status: TipStatus, score: string) => {
      await dbService.settleTip(id, status, score);
      if (user) fetchData(user);
  };

  const handleVerifyResult = async (tip: Tip) => {
      alert(`Verifying result for ${tip.teams}... Please wait.`);
      const result = await checkBetResult(tip);
      if (result.status !== 'UNKNOWN' && result.status !== 'ERROR') {
          const confirmMsg = `AI Verification Result:\nStatus: ${result.status}\nScore: ${result.score}\nReason: ${result.reason}\n\nUpdate this tip?`;
          if (window.confirm(confirmMsg)) {
              // @ts-ignore
              await dbService.settleTip(tip.id, result.status as TipStatus, result.score);
              if (user) fetchData(user);
          }
      } else {
          alert(`Could not verify automatically.\nReason: ${result.reason}`);
      }
  };

  const handleEditTip = (tip: Tip) => {
      setNewTip(tip);
      setEditingTipId(tip.id);
      setAdminTab('tips');
  }

  // --- Image Upload Helper ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (e.g., limit to 2MB for mock db strings)
      if (file.size > 2 * 1024 * 1024) {
          alert("File size too large! Please upload under 2MB.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNews = async () => {
      if (!newNews.title || !newNews.body) return;
      // @ts-ignore
      await dbService.addNews(newNews);
      setNewNews({ title: '', category: 'Football', source: '', body: '', imageUrl: '', videoUrl: '', matchDate: '' });
      if (user) fetchData(user);
      alert("News Posted!");
  };

  const handleDeleteNews = async (id: string) => {
      if (window.confirm('Delete this news?')) {
          await dbService.deleteNews(id);
          fetchData(user); // Force refresh
      }
  };

  // --- Slides Handlers ---
  const handleSaveSlide = async () => {
      if (!newSlide.image || !newSlide.title) {
          alert("Image and Title are required.");
          return;
      }
      await dbService.addSlide(newSlide);
      setNewSlide({ title: '', subtitle: '', image: '' });
      if (user) fetchData(user);
      alert("Slide Added!");
  };

  const handleDeleteSlide = async (id: string) => {
      if (window.confirm("Delete this slide?")) {
          await dbService.deleteSlide(id);
          fetchData(user); // Force refresh
      }
  };

  const handleUserAction = async (uid: string, action: 'make_admin' | 'delete') => {
      if (action === 'make_admin') {
          await dbService.updateUserRole(uid, UserRole.ADMIN);
      } else {
          await dbService.deleteUser(uid);
      }
      fetchData(user); // Force refresh
  };

  const handleSendMessage = async () => {
      if (!contactMessage.trim() || !user) return;
      await dbService.sendMessage(user.uid, user.displayName || 'User', contactMessage);
      setContactMessage('');
      fetchData(user);
      alert("Message sent!");
  };

  const handleReplyMessage = async (msgId: string) => {
      const text = replyText[msgId];
      if (!text) return;
      await dbService.replyToMessage(msgId, text);
      setReplyText({ ...replyText, [msgId]: '' });
      if (user) fetchData(user);
  };

  // --- RENDER HELPERS ---

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-slate-950 to-slate-950"></div>
        <Trophy size={64} className="text-brazil-yellow animate-bounce mb-6 relative z-10" />
        <h1 className="text-3xl font-black italic text-white tracking-tighter relative z-10">JIRVINHO</h1>
        <p className="text-brazil-green font-bold tracking-widest text-sm relative z-10 animate-pulse">THE SPORTS MAESTRO</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-brazil-green/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-[10%] -left-[10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10">
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-gradient-to-br from-brazil-green to-blue-900 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-green-500/20 mb-4 transform -rotate-3">
                 <Trophy size={32} className="text-brazil-yellow" />
             </div>
             <h2 className="text-3xl font-black text-white italic tracking-tighter">JIRVINHO</h2>
             <p className="text-slate-400 text-sm font-medium mt-1">Join the elite sports analysis platform</p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl mb-6 flex items-center">
              <ShieldAlert size={16} className="mr-2"/> {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
             <div className="space-y-4">
                {authMode === 'signup' && (
                    <div className="relative group">
                        <Smartphone className="absolute left-3 top-3 text-slate-500 group-focus-within:text-brazil-green transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Display Name"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-brazil-green focus:ring-1 focus:ring-brazil-green transition-all"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                        />
                    </div>
                )}
                <div className="relative group">
                    <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within:text-brazil-green transition-colors" size={18} />
                    <input
                        type="email"
                        placeholder="Email Address"
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-brazil-green focus:ring-1 focus:ring-brazil-green transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                {authMode !== 'forgot' && (
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-brazil-green transition-colors" size={18} />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-brazil-green focus:ring-1 focus:ring-brazil-green transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                         <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-500 hover:text-white"
                        >
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                )}
             </div>

             <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-brazil-green to-green-600 hover:from-green-500 hover:to-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-900/30 transition-all active:scale-[0.98] flex items-center justify-center"
             >
                {loading ? <RefreshCw className="animate-spin" /> : 
                 authMode === 'login' ? 'Sign In' : 
                 authMode === 'signup' ? 'Create Account' : 'Send Reset Link'}
             </button>
          </form>

          <div className="mt-6 flex justify-between items-center text-sm">
             {authMode === 'login' ? (
                 <>
                    <button onClick={() => setAuthMode('forgot')} className="text-slate-500 hover:text-white transition-colors">Forgot Password?</button>
                    <button onClick={() => setAuthMode('signup')} className="text-brazil-yellow hover:text-yellow-300 font-bold transition-colors">Sign Up Free</button>
                 </>
             ) : (
                 <button onClick={() => setAuthMode('login')} className="text-slate-500 hover:text-white w-full text-center transition-colors">Back to Login</button>
             )}
          </div>
        </div>
      </div>
    );
  }

  // --- Main Content ---
  
  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
           <ImageSlider slides={slides} />

           {/* Tip Filters */}
           <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
               {Object.values(TipCategory).map(cat => (
                   <button
                      key={cat}
                      onClick={() => setMobileTab(cat)}
                      className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                          mobileTab === cat 
                          ? 'bg-white text-slate-900 border-white' 
                          : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                   >
                       {cat}
                   </button>
               ))}
           </div>

           {/* Tips List */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {tips.filter(t => t.category === mobileTab).length > 0 ? (
                   tips.filter(t => t.category === mobileTab).map(tip => (
                       <TipCard 
                          key={tip.id} 
                          tip={tip} 
                          isAdmin={user?.role === UserRole.ADMIN} 
                          onVote={handleVote}
                          onSettle={handleSettleTip}
                          onDelete={handleDeleteTip}
                          onVerify={handleVerifyResult}
                          onEdit={handleEditTip}
                        />
                   ))
               ) : (
                   <div className="col-span-full py-20 text-center text-slate-500">
                       <LayoutDashboard size={48} className="mx-auto mb-4 opacity-20"/>
                       <p>No tips available in this category yet.</p>
                   </div>
               )}
           </div>
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === 'stats' && (
          <div className="space-y-8">
              <h2 className="text-2xl font-black italic text-white mb-4">PERFORMANCE CENTER</h2>
              <StatsWidget stats={stats} />
              
              <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
                 <h3 className="text-lg font-bold text-white mb-6 flex items-center"><TrendingUp className="mr-2 text-brazil-green"/> Performance History</h3>
                 <div className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={stats.streak.map((s, i) => ({ name: i+1, win: s === TipStatus.WON ? 1 : 0 }))}>
                             <defs>
                                 <linearGradient id="colorWin" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="#009c3b" stopOpacity={0.3}/>
                                     <stop offset="95%" stopColor="#009c3b" stopOpacity={0}/>
                                 </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                             <XAxis dataKey="name" hide />
                             <YAxis hide />
                             <Tooltip 
                                contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '8px'}}
                                itemStyle={{color: '#fff'}}
                             />
                             <Area type="monotone" dataKey="win" stroke="#009c3b" strokeWidth={3} fillOpacity={1} fill="url(#colorWin)" />
                         </AreaChart>
                     </ResponsiveContainer>
                 </div>
              </div>
          </div>
      )}

      {/* NEWS TAB */}
      {activeTab === 'news' && (
          <div className="space-y-6">
              <h2 className="text-2xl font-black italic text-white">LATEST NEWS</h2>
              <div className="grid gap-6">
                  {news.map(post => (
                      <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all group">
                          {post.imageUrl && (
                              <div className="h-48 overflow-hidden relative">
                                  <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                  <div className="absolute top-4 left-4 bg-brazil-blue text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                      {post.category}
                                  </div>
                              </div>
                          )}
                          <div className="p-6">
                              <div className="flex justify-between items-start mb-3">
                                  <span className="text-brazil-yellow text-xs font-bold uppercase">{post.source}</span>
                                  <span className="text-slate-500 text-xs">{new Date(post.createdAt).toLocaleDateString()}</span>
                              </div>
                              <h3 className="text-xl font-bold text-white mb-3 leading-tight group-hover:text-brazil-green transition-colors">{post.title}</h3>
                              <p className="text-slate-400 text-sm leading-relaxed mb-4">{post.body}</p>
                              {user?.role === UserRole.ADMIN && (
                                  <button onClick={() => handleDeleteNews(post.id)} type="button" className="text-red-500 text-xs font-bold hover:underline">DELETE POST</button>
                              )}
                          </div>
                      </div>
                  ))}
                  {news.length === 0 && <div className="text-center text-slate-500 py-10">No news yet.</div>}
              </div>
          </div>
      )}

      {/* SCORES TAB */}
      {activeTab === 'scores' && (
          <LiveScoreBoard />
      )}

      {/* CONTACT/MESSAGES TAB */}
      {activeTab === 'contact' && (
          <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl font-black italic text-white">{user?.role === UserRole.ADMIN ? 'USER MESSAGES' : 'ASK THE MAESTRO'}</h2>
              
              {user?.role === UserRole.ADMIN ? (
                  <div className="space-y-4">
                      {messages.map(msg => (
                          <div key={msg.id} className={`p-5 rounded-2xl border ${msg.isRead ? 'bg-slate-900 border-slate-800' : 'bg-slate-800 border-brazil-green/50'}`}>
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <p className="font-bold text-white">{msg.userName}</p>
                                      <p className="text-xs text-slate-500">ID: {msg.userId}</p>
                                  </div>
                                  <span className="text-xs text-slate-500">{new Date(msg.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-slate-300 text-sm mb-4 bg-black/20 p-3 rounded-lg">{msg.content}</p>
                              
                              {msg.reply ? (
                                  <div className="pl-4 border-l-2 border-brazil-green">
                                      <p className="text-xs text-brazil-green font-bold mb-1">MAESTRO REPLY:</p>
                                      <p className="text-sm text-white">{msg.reply}</p>
                                  </div>
                              ) : (
                                  <div className="flex gap-2">
                                      <input 
                                        type="text" 
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 text-sm text-white"
                                        placeholder="Type reply..."
                                        value={replyText[msg.id] || ''}
                                        onChange={(e) => setReplyText({...replyText, [msg.id]: e.target.value})}
                                      />
                                      <button onClick={() => handleReplyMessage(msg.id)} className="bg-brazil-green px-4 py-2 rounded-lg text-white text-xs font-bold">Reply</button>
                                  </div>
                              )}
                          </div>
                      ))}
                      {messages.length === 0 && <div className="text-center text-slate-500">No messages.</div>}
                  </div>
              ) : (
                  <>
                    {/* User Chat Interface */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[60vh]">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Welcome Msg */}
                            <div className="flex justify-start">
                                <div className="bg-slate-800 rounded-2xl rounded-tl-none p-3 max-w-[80%] text-sm text-slate-300">
                                    Hello! How can I help you today?
                                </div>
                            </div>
                            
                            {messages.map(msg => (
                                <div key={msg.id} className="space-y-4">
                                    <div className="flex justify-end">
                                        <div className="bg-brazil-green text-white rounded-2xl rounded-tr-none p-3 max-w-[80%] text-sm shadow-lg">
                                            {msg.content}
                                        </div>
                                    </div>
                                    {msg.reply && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-800 border border-brazil-green/30 rounded-2xl rounded-tl-none p-3 max-w-[80%] text-sm text-white">
                                                <span className="block text-[10px] font-bold text-brazil-green mb-1">MAESTRO</span>
                                                {msg.reply}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
                            <input 
                                type="text"
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-brazil-green outline-none"
                                placeholder="Type your message..."
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                            />
                            <button onClick={handleSendMessage} className="bg-brazil-green text-white p-3 rounded-xl hover:bg-green-600 transition-colors">
                                <Send size={20}/>
                            </button>
                        </div>
                    </div>
                  </>
              )}
          </div>
      )}

      {/* ADMIN TAB */}
      {activeTab === 'admin' && user?.role === UserRole.ADMIN && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 min-h-[80vh]">
              <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2">
                  {[
                    {id: 'overview', icon: LayoutDashboard}, 
                    {id: 'tips', icon: Target}, 
                    {id: 'news', icon: Newspaper}, 
                    {id: 'slides', icon: ImageIcon},
                    {id: 'users', icon: Users}
                  ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setAdminTab(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${adminTab === tab.id ? 'bg-white text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                      >
                          <tab.icon size={16}/> <span className="uppercase">{tab.id}</span>
                      </button>
                  ))}
              </div>

              {/* Admin: Overview */}
              {adminTab === 'overview' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                          <p className="text-slate-400 text-xs font-bold uppercase">Total Tips</p>
                          <p className="text-3xl font-black text-white mt-2">{tips.length}</p>
                      </div>
                      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                          <p className="text-slate-400 text-xs font-bold uppercase">Pending</p>
                          <p className="text-3xl font-black text-brazil-yellow mt-2">{tips.filter(t => t.status === TipStatus.PENDING).length}</p>
                      </div>
                      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                          <p className="text-slate-400 text-xs font-bold uppercase">Win Rate</p>
                          <p className="text-3xl font-black text-brazil-green mt-2">{stats.winRate}%</p>
                      </div>
                      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                          <p className="text-slate-400 text-xs font-bold uppercase">Users</p>
                          <p className="text-3xl font-black text-white mt-2">{allUsers.length}</p>
                      </div>
                  </div>
              )}

              {/* Admin: Tips Management */}
              {adminTab === 'tips' && (
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Form */}
                          <div className="space-y-4">
                              <h3 className="font-bold text-white flex items-center"><Plus size={16} className="mr-2"/> {editingTipId ? 'Edit Tip' : 'New Tip'}</h3>
                              <select 
                                className="w-full bg-slate-950 p-3 rounded-xl text-white border border-slate-700"
                                value={newTip.category}
                                onChange={e => setNewTip({...newTip, category: e.target.value as TipCategory})}
                              >
                                  {Object.values(TipCategory).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              
                              {(newTip.category === TipCategory.ODD_4_PLUS || newTip.category === TipCategory.ODD_2_PLUS) && (
                                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
                                      <p className="text-xs font-bold text-slate-400 uppercase">Accumulator Legs</p>
                                      {newTip.legs?.map((leg, idx) => (
                                          <div key={idx} className="flex justify-between items-center bg-slate-900 p-2 rounded text-sm">
                                              <span className="text-white">{leg.teams} - {leg.prediction}</span>
                                              <button onClick={() => handleRemoveLeg(idx)} className="text-red-500"><X size={14}/></button>
                                          </div>
                                      ))}
                                      <div className="grid grid-cols-2 gap-2">
                                          <input placeholder="Teams" className="bg-slate-900 p-2 rounded text-white text-sm" value={multiLegInput.teams} onChange={e => setMultiLegInput({...multiLegInput, teams: e.target.value})} />
                                          <input placeholder="Pick" className="bg-slate-900 p-2 rounded text-white text-sm" value={multiLegInput.prediction} onChange={e => setMultiLegInput({...multiLegInput, prediction: e.target.value})} />
                                      </div>
                                      <button onClick={handleAddLeg} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded transition-colors">Add Leg</button>
                                  </div>
                              )}

                              <input 
                                className="w-full bg-slate-950 p-3 rounded-xl text-white border border-slate-700"
                                placeholder={newTip.category === TipCategory.SINGLE ? "Teams (e.g. Real Madrid vs Barcelona)" : "Summary Title"}
                                value={newTip.teams}
                                onChange={e => setNewTip({...newTip, teams: e.target.value})}
                              />
                              <select
                                className="w-full bg-slate-950 p-3 rounded-xl text-white border border-slate-700"
                                value={newTip.league}
                                onChange={e => setNewTip({...newTip, league: e.target.value})}
                              >
                                  <option value="Multiple">Multiple (Accumulator)</option>
                                  {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                              <div className="flex gap-2">
                                  <input 
                                    className="w-1/2 bg-slate-950 p-3 rounded-xl text-white border border-slate-700"
                                    placeholder="Prediction"
                                    value={newTip.prediction}
                                    onChange={e => setNewTip({...newTip, prediction: e.target.value})}
                                  />
                                  <input 
                                    type="number"
                                    className="w-1/2 bg-slate-950 p-3 rounded-xl text-white border border-slate-700"
                                    placeholder="Odds"
                                    step="0.01"
                                    value={newTip.odds}
                                    onChange={e => setNewTip({...newTip, odds: parseFloat(e.target.value)})}
                                  />
                              </div>
                              
                              <div className="relative">
                                  <textarea 
                                    className="w-full bg-slate-950 p-3 rounded-xl text-white border border-slate-700 h-24"
                                    placeholder="Analysis..."
                                    value={newTip.analysis}
                                    onChange={e => setNewTip({...newTip, analysis: e.target.value})}
                                  />
                                  <button 
                                    onClick={handleGenerateAnalysis}
                                    disabled={isGeneratingAI}
                                    className="absolute bottom-3 right-3 bg-brazil-blue/20 hover:bg-brazil-blue text-blue-400 hover:text-white p-2 rounded-lg transition-all"
                                    title="Generate AI Analysis"
                                  >
                                      {isGeneratingAI ? <RefreshCw size={14} className="animate-spin"/> : <Wand2 size={14}/>}
                                  </button>
                              </div>
                              <input 
                                type="datetime-local"
                                className="w-full bg-slate-950 p-3 rounded-xl text-white border border-slate-700"
                                value={newTip.kickoffTime ? new Date(newTip.kickoffTime).toISOString().slice(0, 16) : ''}
                                onChange={e => setNewTip({...newTip, kickoffTime: new Date(e.target.value).toISOString()})}
                              />
                              <input 
                                className="w-full bg-slate-950 p-3 rounded-xl text-white border border-slate-700"
                                placeholder="Betting Code (Optional)"
                                value={newTip.bettingCode}
                                onChange={e => setNewTip({...newTip, bettingCode: e.target.value})}
                              />

                              <div className="flex gap-2">
                                  {editingTipId && (
                                      <button onClick={() => {setEditingTipId(null); setNewTip({category: TipCategory.SINGLE, teams: '', league: LEAGUES[0], prediction: '', odds: 1.50, confidence: 'Medium', sport: 'Football', bettingCode: '', legs: [], kickoffTime: '', analysis: ''});}} className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-bold">Cancel</button>
                                  )}
                                  <button onClick={handleSaveTip} className="flex-1 bg-brazil-green hover:bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all">
                                      {editingTipId ? 'Update Tip' : 'Post Tip'}
                                  </button>
                              </div>
                          </div>
                          
                          {/* List */}
                          <div className="bg-slate-950/50 rounded-2xl p-4 max-h-[600px] overflow-y-auto">
                              <h3 className="text-slate-400 text-xs font-bold uppercase mb-4">Recent Tips</h3>
                              {tips.map(tip => (
                                  <div key={tip.id} className="mb-2 bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center group hover:border-slate-600">
                                      <div>
                                          <p className="font-bold text-white text-sm">{tip.teams}</p>
                                          <p className="text-xs text-slate-500">{tip.league}</p>
                                      </div>
                                      <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => handleEditTip(tip)} className="p-1.5 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-600 hover:text-white"><Edit3 size={14}/></button>
                                          <button onClick={() => handleDeleteTip(tip.id)} className="p-1.5 bg-red-900/30 text-red-400 rounded hover:bg-red-600 hover:text-white"><Trash2 size={14}/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {/* Admin: News */}
              {adminTab === 'news' && (
                  <div className="space-y-4 max-w-2xl">
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">News Image Upload</label>
                          <div className="flex items-center gap-4">
                              <label className="cursor-pointer flex items-center justify-center bg-slate-900 hover:bg-slate-950 text-white border border-dashed border-slate-600 rounded-lg p-6 w-full transition-all group">
                                  <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, (base64) => setNewNews({...newNews, imageUrl: base64}))} />
                                  <div className="flex flex-col items-center gap-2">
                                      <UploadCloud className="text-slate-400 group-hover:text-brazil-green transition-colors" size={24} />
                                      <span className="text-sm font-bold text-slate-400 group-hover:text-white">Click to Upload Image</span>
                                  </div>
                              </label>
                              {newNews.imageUrl && (
                                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/20 shrink-0">
                                      <img src={newNews.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                  </div>
                              )}
                          </div>
                      </div>

                      <input 
                        className="w-full bg-slate-950 p-3 rounded-xl text-white border border-slate-700"
                        placeholder="News Headline"
                        value={newNews.title}
                        onChange={e => setNewNews({...newNews, title: e.target.value})}
                      />
                      <textarea 
                        className="w-full bg-slate-950 p-3 rounded-xl text-white border border-slate-700 h-32"
                        placeholder="Body content..."
                        value={newNews.body}
                        onChange={e => setNewNews({...newNews, body: e.target.value})}
                      />
                      <div className="flex gap-2">
                        <input 
                            className="w-1/2 bg-slate-950 p-3 rounded-xl text-white border border-slate-700"
                            placeholder="Category"
                            value={newNews.category}
                            onChange={e => setNewNews({...newNews, category: e.target.value})}
                        />
                         <input 
                            className="w-1/2 bg-slate-950 p-3 rounded-xl text-white border border-slate-700"
                            placeholder="Source"
                            value={newNews.source}
                            onChange={e => setNewNews({...newNews, source: e.target.value})}
                        />
                      </div>
                      <button onClick={handleSaveNews} className="w-full bg-brazil-green text-white py-3 rounded-xl font-bold">Publish News</button>
                  </div>
              )}

              {/* Admin: Slides Management */}
              {adminTab === 'slides' && (
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           {/* Add Slide Form */}
                           <div className="md:col-span-1 space-y-4">
                               <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                  <h3 className="font-bold text-white mb-4 flex items-center"><Plus size={16} className="mr-2"/> Add New Slide</h3>
                                  
                                  {/* Image Upload */}
                                  <div className="mb-4">
                                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Slide Image</label>
                                      <label className="cursor-pointer block w-full aspect-video bg-slate-900 hover:bg-slate-950 border border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center transition-all group overflow-hidden relative">
                                          <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, (base64) => setNewSlide({...newSlide, image: base64}))} />
                                          {newSlide.image ? (
                                              <img src={newSlide.image} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                          ) : (
                                              <>
                                                  <UploadCloud className="text-slate-500 group-hover:text-brazil-green mb-2" size={24} />
                                                  <span className="text-xs text-slate-500">Upload Banner</span>
                                              </>
                                          )}
                                      </label>
                                  </div>

                                  <input 
                                    className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-600 mb-2"
                                    placeholder="Main Title"
                                    value={newSlide.title}
                                    onChange={e => setNewSlide({...newSlide, title: e.target.value})}
                                  />
                                  <input 
                                    className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-600 mb-4"
                                    placeholder="Subtitle"
                                    value={newSlide.subtitle}
                                    onChange={e => setNewSlide({...newSlide, subtitle: e.target.value})}
                                  />
                                  <button onClick={handleSaveSlide} className="w-full bg-brazil-green text-white py-3 rounded-xl font-bold">Add Slide</button>
                               </div>
                           </div>

                           {/* Existing Slides List */}
                           <div className="md:col-span-2 space-y-4">
                               <h3 className="font-bold text-white">Active Slides</h3>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   {slides.map(slide => (
                                       <div key={slide.id} className="relative group rounded-xl overflow-hidden border border-slate-700 aspect-video">
                                           <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                               <h4 className="text-white font-bold">{slide.title}</h4>
                                               <p className="text-xs text-slate-300">{slide.subtitle}</p>
                                               <button 
                                                  onClick={() => handleDeleteSlide(slide.id)}
                                                  type="button"
                                                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                               >
                                                   <Trash2 size={16} />
                                               </button>
                                           </div>
                                       </div>
                                   ))}
                                   {slides.length === 0 && <p className="text-slate-500 text-sm">No slides added yet.</p>}
                               </div>
                           </div>
                      </div>
                  </div>
              )}

              {/* Admin: Users */}
              {adminTab === 'users' && (
                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                          <thead>
                              <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                                  <th className="p-3">User</th>
                                  <th className="p-3">Email</th>
                                  <th className="p-3">Role</th>
                                  <th className="p-3 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              {allUsers.map(u => (
                                  <tr key={u.uid} className="border-b border-slate-800 hover:bg-slate-800/50">
                                      <td className="p-3 text-white font-medium">{u.displayName}</td>
                                      <td className="p-3 text-slate-400 text-sm">{u.email}</td>
                                      <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${u.role === UserRole.ADMIN ? 'bg-brazil-green/20 text-brazil-green' : 'bg-slate-700 text-slate-300'}`}>{u.role}</span></td>
                                      <td className="p-3 text-right">
                                          {u.role !== UserRole.ADMIN && (
                                              <button onClick={() => handleUserAction(u.uid, 'make_admin')} className="text-xs text-brazil-green font-bold mr-3 hover:underline">PROMOTE</button>
                                          )}
                                          <button onClick={() => handleUserAction(u.uid, 'delete')} className="text-xs text-red-500 font-bold hover:underline">REMOVE</button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      )}

    </Layout>
  );
};