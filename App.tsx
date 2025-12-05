import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, UserRole, Tip, NewsPost, MaestroStats, TipStatus, TipCategory, TipLeg, Message } from './types';
import { dbService } from './services/db';
import { generateMatchAnalysis, checkBetResult } from './services/geminiService';
import { Layout } from './components/Layout';
import { TipCard } from './components/TipCard';
import { StatsWidget } from './components/StatsWidget';
import { PlayCircle, Lock, Mail, ChevronRight, Plus, Trash2, Save, FileText, Check, X, RefreshCw, Smartphone, TrendingUp, Award, Target, UserPlus, XCircle, Trophy, Flame, Eye, EyeOff, MessageSquare, Send, Globe, Newspaper, Calendar, Database, Wand2, Upload, User as UserIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

// --- Constants ---

const LEAGUES = [
  "Brasileirão Serie A", "Brasileirão Serie B", "Copa do Brasil",
  "Premier League (England)", "La Liga (Spain)", "Bundesliga (Germany)", "Serie A (Italy)", "Ligue 1 (France)",
  "Champions League", "Europa League", "Copa Libertadores", "Copa Sudamericana",
  "MLS (USA)", "Saudi Pro League", "Eredivisie (Netherlands)", "Primeira Liga (Portugal)",
  "Süper Lig (Turkey)", "Championship (England)", "NBA (Basketball)", "NFL (American Football)"
];

const STATIC_TICKER_ITEMS = [
  "🇧🇷 JIRVINHO: The Sports Maestro is LIVE!",
  "💰 Join the VIP channel for exclusive plays.",
];

// --- App Component ---

export const App: React.FC = () => {
  // Auth State
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
  const [stats, setStats] = useState<MaestroStats>({ winRate: 0, totalTips: 0, wonTips: 0, streak: [] });
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Dashboard Specific State
  const [mobileTab, setMobileTab] = useState<TipCategory>(TipCategory.SINGLE);
  
  // Admin State
  const [adminTab, setAdminTab] = useState<'tips' | 'news' | 'messages'>('tips');
  const [newTip, setNewTip] = useState<Partial<Tip>>({
    category: TipCategory.SINGLE,
    teams: '', league: LEAGUES[0], prediction: '', odds: 1.50, confidence: 'Medium', sport: 'Football', bettingCode: '', legs: [], kickoffTime: '', analysis: ''
  });
  const [multiLegInput, setMultiLegInput] = useState<TipLeg>({ teams: '', league: LEAGUES[0], prediction: '' });
  
  const [newNews, setNewNews] = useState<Partial<NewsPost>>({ title: '', category: 'Football', source: '', body: '', imageUrl: '', videoUrl: '', matchDate: '' });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  // User Contact State
  const [contactMessage, setContactMessage] = useState('');

  // Swipe Refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // --- Effects ---

  useEffect(() => {
    // 1. Subscribe to Auth Changes
    const { data: authListener } = dbService.onAuthStateChange((newUser) => {
        setUser(newUser);
        if (newUser) fetchData(newUser);
    });

    // 2. Initial Data Fetch Interval
    const interval = setInterval(() => {
       if(user) fetchData(user); 
    }, 15000);
    
    return () => {
        authListener.subscription.unsubscribe();
        clearInterval(interval);
    };
  }, [user?.uid, activeTab]);

  // Optimized Fetch Data (Parallel)
  const fetchData = async (currentUser = user) => {
    try {
        const [tipsData, newsData, statsData] = await Promise.all([
            dbService.getTips(),
            dbService.getNews(),
            dbService.getStats()
        ]);
        
        setTips(tipsData);
        setNews(newsData);
        setStats(statsData);

        if (currentUser) {
            const msgs = currentUser.role === UserRole.ADMIN 
                ? await dbService.getMessages() 
                : await dbService.getUserMessages(currentUser.uid);
            setMessages(msgs);
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
  };

  // --- Auth Handlers ---

  const handleGuestAccess = () => {
      const guestUser: User = {
          uid: 'guest-user',
          email: 'guest@jirvinho.com',
          role: UserRole.GUEST,
          displayName: 'Guest Fan'
      };
      setUser(guestUser);
      fetchData(guestUser);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      let loggedUser;
      if (authMode === 'login') {
         loggedUser = await dbService.login(email, password);
      } else if (authMode === 'signup') {
         loggedUser = await dbService.signUp(email, password, displayName);
      } else {
         await dbService.resetPassword(email);
         alert('Password reset link sent to your email.');
         setAuthMode('login');
         setLoading(false);
         return;
      }
      // Note: onAuthStateChange will handle setting the user
      setLoading(false);
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (user?.role === UserRole.GUEST) {
        setUser(null);
        setTips([]);
        setNews([]);
        return;
    }
    await dbService.logout();
    setUser(null);
    setTips([]);
    setNews([]);
  };

  // --- Admin Handlers ---

  const handleSeedDB = async () => {
      if (!window.confirm("Initialize empty database with sample data?")) return;
      setLoading(true);
      try {
          await dbService.seedDatabase();
          await fetchData();
          alert("Database seeded successfully!");
      } catch (e) {
          alert("Error seeding database.");
      } finally {
          setLoading(false);
      }
  };

  const handleGenerateAI = async () => {
      if (!newTip.teams || !newTip.league) {
          alert("Please enter Teams and League first.");
          return;
      }
      
      setIsGeneratingAI(true);
      try {
          const analysisText = await generateMatchAnalysis(newTip.teams, newTip.league);
          setNewTip(prev => ({ ...prev, analysis: analysisText }));
      } catch (e) {
          alert("AI Generation failed.");
      } finally {
          setIsGeneratingAI(false);
      }
  };

  const handleAddTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTip.teams && !newTip.legs?.length) return;

    try {
      await dbService.addTip({
        category: newTip.category!,
        teams: newTip.category === TipCategory.SINGLE ? newTip.teams! : 'Accumulator Bet',
        league: newTip.category === TipCategory.SINGLE ? newTip.league! : 'Multiple',
        kickoffTime: newTip.kickoffTime || new Date().toISOString(),
        sport: newTip.sport || 'Football',
        prediction: newTip.category === TipCategory.SINGLE ? newTip.prediction! : 'See Selections',
        odds: Number(newTip.odds),
        confidence: newTip.confidence as any,
        analysis: newTip.analysis || "No analysis provided.", // Use edited analysis
        bettingCode: newTip.bettingCode,
        legs: newTip.category === TipCategory.SINGLE ? [] : newTip.legs
      });

      setNewTip({ category: newTip.category, teams: '', league: LEAGUES[0], prediction: '', odds: 1.50, confidence: 'Medium', sport: 'Football', bettingCode: '', legs: [], kickoffTime: '', analysis: '' });
      fetchData();
      alert('Tip Posted Successfully!');
    } catch (e) {
      alert('Failed to post tip. Ensure you are an Admin.');
    }
  };

  const handleAddLeg = () => {
      if (multiLegInput.teams && multiLegInput.prediction) {
          const currentLegs = newTip.legs || [];
          setNewTip({ ...newTip, legs: [...currentLegs, multiLegInput] });
          setMultiLegInput({ teams: '', league: LEAGUES[0], prediction: '' });
      }
  };

  const removeLeg = (index: number) => {
      const currentLegs = newTip.legs || [];
      setNewTip({ ...newTip, legs: currentLegs.filter((_, i) => i !== index) });
  };

  const handleSettleTip = async (id: string, status: TipStatus, score: string) => {
    await dbService.settleTip(id, status, score);
    fetchData();
  };

  const handleDeleteTip = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tip?')) {
      await dbService.deleteTip(id);
      fetchData();
    }
  };

  const handleVerifyTip = async (tip: Tip) => {
      if (!window.confirm(`Use AI to verify result for ${tip.teams}?`)) return;
      
      const result = await checkBetResult(tip);
      
      // Allow Admin to edit the score found by AI
      const confirmedScore = window.prompt(
          `AI Verification:\nStatus: ${result.status}\nReason: ${result.reason}\n\nConfirm or Correct the Score:`, 
          result.score
      );

      if (confirmedScore !== null) {
          // Map AI status string to Enum
          let statusToApply = TipStatus.PENDING;
          if (result.status === 'WON') statusToApply = TipStatus.WON;
          else if (result.status === 'LOST') statusToApply = TipStatus.LOST;
          else if (result.status === 'VOID') statusToApply = TipStatus.VOID;
          
          if (statusToApply !== TipStatus.PENDING) {
              await handleSettleTip(tip.id, statusToApply, confirmedScore);
          } else {
              alert(`AI returned status '${result.status}'. Please settle manually.`);
          }
      }
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNews.title || !newNews.body) return;
    
    await dbService.addNews({
      title: newNews.title!,
      category: newNews.category || 'Football',
      source: newNews.source || 'Jirvinho News',
      body: newNews.body!,
      imageUrl: newNews.imageUrl,
      videoUrl: newNews.videoUrl,
      matchDate: newNews.matchDate
    });
    
    setNewNews({ title: '', category: 'Football', source: '', body: '', imageUrl: '', videoUrl: '', matchDate: '' });
    fetchData();
    alert('News Published!');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setNewNews({ ...newNews, imageUrl: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDeleteNews = async (id: string) => {
      if (window.confirm('Delete this news post?')) {
          await dbService.deleteNews(id);
          fetchData();
      }
  };

  const handleReplyMessage = async (msgId: string) => {
      if (replyText[msgId]) {
          await dbService.replyToMessage(msgId, replyText[msgId]);
          setReplyText({ ...replyText, [msgId]: '' });
          fetchData();
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!contactMessage.trim() || !user) return;
      await dbService.sendMessage(user.uid, user.displayName || 'User', contactMessage);
      setContactMessage('');
      fetchData();
  };

  // --- User Handlers ---
  
  const handleVote = async (id: string, type: 'agree' | 'disagree') => {
      await dbService.voteOnTip(id, type);
      fetchData(); 
  };

  // --- Helper Logic ---

  const getFilteredTips = (category: TipCategory) => {
      return tips.filter(t => t.category === category);
  };

  const getPartitionStats = (category: TipCategory) => {
      const catTips = tips.filter(t => t.category === category && t.status !== TipStatus.PENDING);
      const wins = catTips.filter(t => t.status === TipStatus.WON).length;
      return {
          winRate: catTips.length > 0 ? parseFloat(((wins / catTips.length) * 100).toFixed(1)) : 0,
          total: catTips.length,
          won: wins,
          streak: catTips.sort((a,b) => b.createdAt - a.createdAt).slice(0, 5).map(t => t.status)
      };
  };

  const getNewsCategoryStyle = (category: string) => {
      return 'bg-brazil-yellow text-brazil-green border border-brazil-green shadow-[0_0_10px_rgba(255,223,0,0.3)]';
  };

  const getAllHeadlines = () => {
      // Prioritize actual news posted by admin
      const newsTitles = news.map(n => `🚨 ${n.title}`);
      
      // If we have real news, use it. Otherwise use static.
      // Or mix them if you want both.
      if (newsTitles.length > 0) {
          return [...newsTitles, ...STATIC_TICKER_ITEMS];
      }
      return STATIC_TICKER_ITEMS;
  };

  // --- Swipe Logic ---

  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
      if (activeTab !== 'dashboard') return;
      
      const distance = touchStartX.current - touchEndX.current;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;

      if (isLeftSwipe) {
          if (mobileTab === TipCategory.SINGLE) setMobileTab(TipCategory.ODD_2_PLUS);
          else if (mobileTab === TipCategory.ODD_2_PLUS) setMobileTab(TipCategory.ODD_4_PLUS);
      }
      
      if (isRightSwipe) {
          if (mobileTab === TipCategory.ODD_4_PLUS) setMobileTab(TipCategory.ODD_2_PLUS);
          else if (mobileTab === TipCategory.ODD_2_PLUS) setMobileTab(TipCategory.SINGLE);
      }
  };

  // --- Render Sections ---

  // --- Login Screen ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
        <div className="relative z-10 bg-slate-950 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800">
          
          <div className="flex flex-col items-center mb-8">
             <div className="w-20 h-20 bg-gradient-to-br from-brazil-green to-brazil-blue rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/20">
                <Trophy size={40} className="text-brazil-yellow" />
             </div>
             <h1 className="text-3xl font-black italic text-center tracking-tighter text-white">
                JIRVINHO
             </h1>
             <p className="text-sm font-bold text-brazil-yellow tracking-widest mt-1">THE SPORTS MAESTRO</p>
          </div>

          <h2 className="text-xl font-bold text-white mb-6 text-center">
             {authMode === 'login' ? 'Welcome Back' : authMode === 'signup' ? 'Join the Winning Team' : 'Reset Password'}
          </h2>

          {authError && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-4 text-sm flex items-center">
               <XCircle size={16} className="mr-2"/> {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4" autoComplete="off">
            {authMode === 'signup' && (
                <div>
                    <label className="block text-slate-400 text-xs font-bold mb-1 uppercase">Display Name</label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brazil-green"
                        required
                        autoComplete="off"
                        id={`name-${Math.random()}`} 
                        name="random-name-field"
                    />
                </div>
            )}
            
            <div>
              <label className="block text-slate-400 text-xs font-bold mb-1 uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-brazil-green"
                  required
                  autoComplete="off"
                  id={`email-${Math.random()}`}
                  name="random-email-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-bold mb-1 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white focus:outline-none focus:border-brazil-green"
                  required={authMode !== 'forgot'}
                  autoComplete="new-password"
                  id={`password-${Math.random()}`}
                  name="random-password-field"
                />
                <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brazil-green to-green-600 hover:from-green-500 hover:to-green-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-green-900/20 flex items-center justify-center"
            >
              {loading ? <RefreshCw className="animate-spin" /> : 
                authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Send Reset Link'
              }
            </button>
          </form>

          {/* GUEST ACCESS BUTTON */}
          <div className="mt-4 pt-4 border-t border-slate-800">
             <button 
                onClick={handleGuestAccess}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center border border-slate-700 hover:border-slate-500"
             >
                <UserIcon size={18} className="mr-2" /> Continue as Guest (No Login)
             </button>
          </div>

          <div className="mt-6 flex flex-col space-y-2 text-center text-sm">
             {authMode === 'login' ? (
                 <>
                    <button onClick={() => setAuthMode('forgot')} className="text-slate-400 hover:text-brazil-yellow">Forgot Password?</button>
                    <p className="text-slate-500">
                        Don't have an account? <button onClick={() => setAuthMode('signup')} className="text-brazil-green font-bold hover:underline">Sign Up</button>
                    </p>
                 </>
             ) : (
                 <button onClick={() => setAuthMode('login')} className="text-brazil-green font-bold hover:underline">Back to Login</button>
             )}
          </div>

        </div>
      </div>
    );
  }

  // --- Main Layout ---

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {/* --- DASHBOARD --- */}
      {activeTab === 'dashboard' && (
        <div 
            className="space-y-6 touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
          {/* Live Ticker - Horizontal Scroll (Now Dynamic) */}
          <div className="bg-gradient-to-r from-brazil-green to-brazil-blue h-10 rounded-lg mb-4 overflow-hidden shadow-lg border border-white/10 relative flex items-center">
              <div className="animate-scrollLeft absolute whitespace-nowrap flex items-center">
                  {getAllHeadlines().map((item, i) => (
                      <span key={i} className="inline-flex items-center text-sm font-bold text-white uppercase tracking-wide mx-6">
                          <Flame size={14} className="mr-2 text-brazil-yellow shrink-0"/> {item}
                      </span>
                  ))}
              </div>
          </div>

          <header className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-black text-white italic tracking-tight">MAESTRO <span className="text-brazil-yellow">DASHBOARD</span></h2>
              <p className="text-slate-400 text-sm">Welcome back, <span className="text-white font-bold">{user?.displayName || 'Maestro Fan'}</span></p>
            </div>
            {/* Mobile Swipe Hint */}
            <div className="md:hidden text-xs text-slate-500 flex items-center animate-pulse">
                <Smartphone size={14} className="mr-1"/> Swipe to switch
            </div>
          </header>

          {/* Mobile Tabs for Partitions */}
          <div className="md:hidden flex bg-slate-800 p-1 rounded-xl mb-6 shadow-inner">
             {Object.values(TipCategory).map(cat => (
                 <button
                    key={cat}
                    onClick={() => setMobileTab(cat)}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${mobileTab === cat ? 'bg-slate-700 text-brazil-yellow shadow' : 'text-slate-500'}`}
                 >
                     {cat === TipCategory.ODD_4_PLUS ? 'Masavu (4+)' : cat}
                 </button>
             ))}
          </div>

          {/* Desktop Grid Layout (3 Columns) */}
          <div className="hidden md:grid grid-cols-3 gap-6">
             {Object.values(TipCategory).map(cat => (
                 <div key={cat} className="flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
                     <h3 className="text-center font-black text-brazil-yellow uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">{cat}</h3>
                     
                     {/* Mini Partition Stats */}
                     <div className="mb-4 bg-slate-800 p-3 rounded-xl flex justify-between items-center">
                         <div>
                             <p className="text-[10px] text-slate-400 uppercase">Win Rate</p>
                             <p className="text-lg font-bold text-white">{getPartitionStats(cat).winRate}%</p>
                         </div>
                         <div className="flex gap-1">
                             {getPartitionStats(cat).streak.map((s, i) => (
                                 <div key={i} className={`w-2 h-2 rounded-full ${s === TipStatus.WON ? 'bg-green-500' : 'bg-red-500'}`}></div>
                             ))}
                         </div>
                     </div>

                     <div className="space-y-4 overflow-y-auto max-h-[600px] scrollbar-hide">
                         {getFilteredTips(cat).length === 0 ? <p className="text-center text-slate-600 text-sm italic py-10">No active tips</p> : 
                            getFilteredTips(cat).map(tip => <TipCard key={tip.id} tip={tip} isAdmin={user?.role === UserRole.ADMIN} onVote={handleVote} onSettle={handleSettleTip} onDelete={handleDeleteTip} onVerify={handleVerifyTip}/>)
                         }
                     </div>
                 </div>
             ))}
          </div>

          {/* Mobile View (Filtered by Active Tab) */}
          <div className="md:hidden">
              <StatsWidget stats={getPartitionStats(mobileTab) as any} />
              
              <div className="space-y-4 min-h-[300px]">
                 {getFilteredTips(mobileTab).length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                         <Target size={40} className="mb-2 opacity-50"/>
                         <p>No tips in this category yet.</p>
                     </div>
                 ) : (
                     getFilteredTips(mobileTab).map(tip => (
                         <TipCard key={tip.id} tip={tip} isAdmin={user?.role === UserRole.ADMIN} onVote={handleVote} onSettle={handleSettleTip} onDelete={handleDeleteTip} onVerify={handleVerifyTip}/>
                     ))
                 )}
              </div>
          </div>
        </div>
      )}

      {/* --- STATS PAGE --- */}
      {activeTab === 'stats' && (
          <div className="space-y-8">
              <header>
                  <h2 className="text-3xl font-black text-white italic tracking-tight">PERFORMANCE <span className="text-brazil-green">STATS</span></h2>
                  <p className="text-slate-400 text-sm">Transparency is our key to success.</p>
              </header>

              {/* Overall Chart */}
              <div className="bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-700">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center"><TrendingUp className="mr-2 text-brazil-green"/> Overall Win Rate Trend</h3>
                  <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={[
                              {name: 'Day 1', rate: 60}, {name: 'Day 2', rate: 65}, {name: 'Day 3', rate: 55}, {name: 'Day 4', rate: 70}, {name: 'Day 5', rate: stats.winRate}
                          ]}>
                              <defs>
                                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#009c3b" stopOpacity={0.8}/>
                                      <stop offset="95%" stopColor="#009c3b" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                              <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 12}}/>
                              <YAxis stroke="#64748b" tick={{fontSize: 12}}/>
                              <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff'}}/>
                              <Area type="monotone" dataKey="rate" stroke="#009c3b" fillOpacity={1} fill="url(#colorRate)" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Stats by Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.values(TipCategory).map(cat => {
                      const s = getPartitionStats(cat);
                      return (
                          <div key={cat} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                              <h4 className="font-bold text-brazil-yellow uppercase tracking-wider mb-2 text-sm">{cat}</h4>
                              <div className="text-4xl font-black text-white mb-1">{s.winRate}%</div>
                              <p className="text-xs text-slate-500 mb-4">{s.won} wins / {s.total} tips</p>
                              <div className="w-full bg-slate-900 rounded-full h-2">
                                  <div className="bg-brazil-green h-2 rounded-full" style={{width: `${s.winRate}%`}}></div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* --- NEWS PAGE --- */}
      {activeTab === 'news' && (
        <div className="space-y-6">
          <h2 className="text-3xl font-black text-white italic tracking-tight">SPORTS <span className="text-brazil-blue">NEWS</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map(item => (
              <div key={item.id} className="bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-700 hover:border-brazil-blue transition-colors group">
                {item.imageUrl ? (
                  <div className="h-48 bg-cover bg-center group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url(${item.imageUrl})` }}></div>
                ) : (
                  <div className="h-48 bg-slate-900 flex items-center justify-center">
                    <Newspaper size={40} className="text-slate-600" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded inline-block ${getNewsCategoryStyle(item.category)}`}>
                        {item.category}
                      </span>
                      {item.source && (
                          <span className="text-[10px] font-black text-yellow-300 bg-red-600 px-2 py-1 rounded inline-block uppercase tracking-wide">
                              {item.source}
                          </span>
                      )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight">{item.title}</h3>
                  <p className="text-slate-400 text-sm line-clamp-3 mb-4">{item.body}</p>
                  
                  {item.matchDate && (
                      <div className="flex items-center text-xs text-brazil-yellow font-bold mb-3 bg-yellow-900/20 p-2 rounded border border-yellow-900/50 w-fit">
                          <Calendar size={14} className="mr-1.5"/>
                          Game: {new Date(item.matchDate).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                      </div>
                  )}

                  {item.videoUrl && (
                      <a href={item.videoUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs font-bold text-brazil-yellow hover:underline mb-2">
                          <PlayCircle size={16} className="mr-1"/> Watch Video
                      </a>
                  )}

                  <div className="mt-2 pt-4 border-t border-slate-700 text-xs text-slate-500 flex justify-between">
                     <span>Posted: {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- CONTACT PAGE --- */}
      {activeTab === 'contact' && (
          <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl font-black text-white italic tracking-tight text-center">CONTACT <span className="text-brazil-green">MAESTRO</span></h2>
              
              {/* Chat Interface */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col h-[60vh]">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                      {messages.length === 0 && (
                          <div className="text-center text-slate-500 mt-10">
                              <MessageSquare size={40} className="mx-auto mb-2 opacity-30"/>
                              <p>Send a message to the admin directly.</p>
                          </div>
                      )}
                      {messages.map(msg => (
                          <div key={msg.id} className="space-y-2">
                              {/* User Msg */}
                              <div className="flex justify-end">
                                  <div className="bg-brazil-blue text-white p-3 rounded-t-xl rounded-bl-xl max-w-[80%] text-sm">
                                      {msg.content}
                                  </div>
                              </div>
                              {/* Admin Reply */}
                              {msg.reply && (
                                  <div className="flex justify-start">
                                      <div className="bg-slate-700 text-slate-200 p-3 rounded-t-xl rounded-br-xl max-w-[80%] text-sm border-l-2 border-brazil-yellow">
                                          <p className="text-[10px] text-brazil-yellow font-bold mb-1">MAESTRO</p>
                                          {msg.reply}
                                      </div>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
                  <div className="p-4 bg-slate-800 border-t border-slate-700">
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                          <input 
                            type="text" 
                            value={contactMessage}
                            onChange={(e) => setContactMessage(e.target.value)}
                            placeholder="Type your question..." 
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brazil-green"
                          />
                          <button type="submit" className="bg-brazil-green hover:bg-green-600 text-white p-3 rounded-xl transition-colors">
                              <Send size={20} />
                          </button>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* --- ADMIN PAGE --- */}
      {activeTab === 'admin' && user?.role === UserRole.ADMIN && (
         <div className="space-y-6">
            <h2 className="text-3xl font-black text-white italic tracking-tight mb-6">ADMIN <span className="text-brazil-yellow">PANEL</span></h2>
            
            {/* Admin Tabs */}
            <div className="flex space-x-2 bg-slate-900/50 p-1 rounded-lg w-fit mb-6">
                {['tips', 'news', 'messages'].map(t => (
                    <button 
                        key={t}
                        onClick={() => setAdminTab(t as any)}
                        className={`px-4 py-2 rounded-md text-sm font-bold uppercase ${adminTab === t ? 'bg-slate-800 text-brazil-yellow shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* MESSAGES TAB */}
            {adminTab === 'messages' && (
                <div className="grid gap-4">
                    {messages.length === 0 ? <p className="text-slate-500">No messages yet.</p> : messages.map(msg => (
                        <div key={msg.id} className={`bg-slate-800 p-4 rounded-xl border ${msg.isRead ? 'border-slate-700' : 'border-brazil-green'}`}>
                             <div className="flex justify-between items-start mb-2">
                                 <div className="flex items-center">
                                     <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mr-3 text-brazil-yellow font-bold text-sm">
                                        {msg.userName.charAt(0).toUpperCase()}
                                     </div>
                                     <div>
                                         <span className="font-bold text-white block leading-none">{msg.userName}</span>
                                         <span className="text-[10px] text-slate-500">{new Date(msg.createdAt).toLocaleString()}</span>
                                     </div>
                                 </div>
                                 {!msg.isRead && <span className="text-[10px] bg-brazil-green text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">New</span>}
                             </div>
                             
                             <div className="ml-11">
                                <p className="text-slate-300 text-sm mb-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">{msg.content}</p>
                             
                                {msg.reply ? (
                                    <div className="pl-4 border-l-2 border-brazil-yellow mt-2">
                                        <p className="text-[10px] text-brazil-yellow font-bold mb-1 uppercase">Maestro Reply:</p>
                                        <p className="text-sm text-slate-400 italic">{msg.reply}</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 mt-2">
                                        <input 
                                        type="text" 
                                        placeholder="Type your reply here..." 
                                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-brazil-yellow outline-none"
                                        value={replyText[msg.id] || ''}
                                        onChange={(e) => setReplyText({...replyText, [msg.id]: e.target.value})}
                                        />
                                        <button 
                                        onClick={() => handleReplyMessage(msg.id)}
                                        className="bg-brazil-green hover:bg-green-600 text-white px-4 rounded-lg flex items-center transition-colors"
                                        title="Send Reply"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                )}
                             </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TIPS TAB */}
            {adminTab === 'tips' && (
                <>
                {/* Seed DB Button (If Empty) */}
                {tips.length === 0 && (
                    <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded-xl mb-6 flex justify-between items-center">
                        <div className="text-yellow-200 text-sm">
                            <span className="font-bold block mb-1">Database is Empty</span>
                            Click to add sample tips and news to get started.
                        </div>
                        <button 
                            onClick={handleSeedDB}
                            className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center transition-colors"
                        >
                            <Database size={14} className="mr-2"/> Initialize Sample Data
                        </button>
                    </div>
                )}

                {/* New Tip Form */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl mb-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center"><Plus className="mr-2" /> New Tip Entry</h3>
                    <form onSubmit={handleAddTip} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select 
                        value={newTip.category} 
                        onChange={(e) => setNewTip({...newTip, category: e.target.value as TipCategory})}
                        className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                        >
                        {Object.values(TipCategory).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        
                        <input 
                        type="datetime-local" 
                        value={newTip.kickoffTime || ''}
                        onChange={(e) => setNewTip({...newTip, kickoffTime: e.target.value})}
                        className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                        required
                        />
                    </div>

                    {newTip.category === TipCategory.SINGLE ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input 
                                    type="text" placeholder="Teams (e.g. Flamengo vs Fluminense)" 
                                    value={newTip.teams || ''} onChange={(e) => setNewTip({...newTip, teams: e.target.value})}
                                    className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                                    required
                                />
                                <select 
                                    value={newTip.league || ''} onChange={(e) => setNewTip({...newTip, league: e.target.value})}
                                    className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                                >
                                    {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input 
                                    type="text" placeholder="Prediction (e.g. Home Win)" 
                                    value={newTip.prediction || ''} onChange={(e) => setNewTip({...newTip, prediction: e.target.value})}
                                    className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                                    required
                                />
                                <input 
                                    type="number" step="0.01" placeholder="Odds" 
                                    value={newTip.odds} onChange={(e) => setNewTip({...newTip, odds: parseFloat(e.target.value)})}
                                    className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                                    required
                                />
                                <input 
                                    type="text" placeholder="Booking Code (Optional)" 
                                    value={newTip.bettingCode || ''} onChange={(e) => setNewTip({...newTip, bettingCode: e.target.value})}
                                    className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                                />
                            </div>
                            
                            {/* Analysis Section */}
                            <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-bold text-slate-300">Analysis / Reason</label>
                                    <button 
                                        type="button"
                                        onClick={handleGenerateAI}
                                        disabled={isGeneratingAI}
                                        className="text-xs bg-brazil-blue hover:bg-blue-700 text-white px-3 py-1.5 rounded flex items-center transition-colors disabled:opacity-50"
                                    >
                                        {isGeneratingAI ? <RefreshCw className="animate-spin w-3 h-3 mr-1"/> : <Wand2 className="w-3 h-3 mr-1"/>}
                                        {isGeneratingAI ? "Generating..." : "Generate AI Analysis"}
                                    </button>
                                </div>
                                <textarea 
                                    placeholder="Enter your analysis or generate it using AI..." 
                                    rows={3}
                                    value={newTip.analysis || ''}
                                    onChange={(e) => setNewTip({...newTip, analysis: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm focus:border-brazil-green outline-none"
                                />
                            </div>
                        </>
                    ) : (
                        // Multi Leg Form
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                            <h4 className="font-bold text-slate-300 mb-2">Accumulator Selections</h4>
                            
                            {/* List Existing Legs */}
                            {newTip.legs && newTip.legs.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {newTip.legs.map((leg, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-600">
                                            <span className="text-sm text-white">{leg.teams} <span className="text-brazil-yellow">({leg.prediction})</span></span>
                                            <button type="button" onClick={() => removeLeg(idx)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add New Leg */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                                <input 
                                    type="text" placeholder="Teams" 
                                    value={multiLegInput.teams} onChange={(e) => setMultiLegInput({...multiLegInput, teams: e.target.value})}
                                    className="bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white"
                                />
                                <select 
                                    value={multiLegInput.league} onChange={(e) => setMultiLegInput({...multiLegInput, league: e.target.value})}
                                    className="bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white"
                                >
                                    {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                                <input 
                                    type="text" placeholder="Prediction" 
                                    value={multiLegInput.prediction} onChange={(e) => setMultiLegInput({...multiLegInput, prediction: e.target.value})}
                                    className="bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white"
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <button type="button" onClick={handleAddLeg} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded">Add Match</button>
                                
                                <div className="flex items-center gap-2">
                                     <input 
                                        type="number" step="0.01" placeholder="Total Odds" 
                                        value={newTip.odds} onChange={(e) => setNewTip({...newTip, odds: parseFloat(e.target.value)})}
                                        className="bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white w-24"
                                    />
                                    <input 
                                        type="text" placeholder="Booking Code" 
                                        value={newTip.bettingCode || ''} onChange={(e) => setNewTip({...newTip, bettingCode: e.target.value})}
                                        className="bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white w-32"
                                    />
                                </div>
                            </div>
                            
                            {/* Analysis Section for Multi */}
                            <div className="mt-4">
                                <label className="text-sm font-bold text-slate-300 block mb-2">Analysis (Optional)</label>
                                <textarea 
                                    placeholder="Reason for accumulator..." 
                                    rows={2}
                                    value={newTip.analysis || ''}
                                    onChange={(e) => setNewTip({...newTip, analysis: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm focus:border-brazil-green outline-none"
                                />
                            </div>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isGeneratingAI}
                        className="w-full bg-brazil-green hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center shadow-lg"
                    >
                        <Save className="mr-2"/> Post Maestro Tip
                    </button>
                    </form>
                </div>

                {/* Manage Tips */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">Manage Active Tips</h3>
                    {tips.map(tip => (
                    <TipCard 
                        key={tip.id} 
                        tip={tip} 
                        isAdmin={true} 
                        onSettle={handleSettleTip} 
                        onDelete={handleDeleteTip} 
                        onVerify={handleVerifyTip}
                    />
                    ))}
                </div>
                </>
            )}

            {/* NEWS TAB */}
            {adminTab === 'news' && (
                <>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl mb-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center"><FileText className="mr-2" /> Publish News</h3>
                    <form onSubmit={handleAddNews} className="space-y-4">
                    <input 
                        type="text" placeholder="Headline Title" 
                        value={newNews.title || ''} onChange={(e) => setNewNews({...newNews, title: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                        required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                            type="text" placeholder="Category (e.g. Brazil Focus)" 
                            value={newNews.category || ''} onChange={(e) => setNewNews({...newNews, category: e.target.value})}
                            className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                        />
                        <input 
                            type="text" placeholder="Source (e.g. ESPN)" 
                            value={newNews.source || ''} onChange={(e) => setNewNews({...newNews, source: e.target.value})}
                            className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* IMAGE UPLOAD FIELD */}
                        <div className="relative">
                            <label className="flex items-center w-full cursor-pointer bg-slate-900 border border-slate-700 text-slate-400 rounded-lg p-3 hover:border-brazil-green transition-colors">
                                <Upload size={18} className="mr-2 text-brazil-yellow"/>
                                <span className="text-sm truncate">{newNews.imageUrl ? "Image Selected" : "Upload Image from Gallery"}</span>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </label>
                            {newNews.imageUrl && (
                                <img src={newNews.imageUrl} alt="Preview" className="mt-2 h-16 w-16 object-cover rounded border border-slate-600"/>
                            )}
                        </div>

                        <input 
                            type="datetime-local" 
                            value={newNews.matchDate || ''} onChange={(e) => setNewNews({...newNews, matchDate: e.target.value})}
                            className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                        />
                    </div>
                     <input 
                        type="text" placeholder="Video URL (Optional)" 
                        value={newNews.videoUrl || ''} onChange={(e) => setNewNews({...newNews, videoUrl: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                    />
                    <textarea 
                        placeholder="News Body Content..." 
                        rows={5}
                        value={newNews.body || ''} onChange={(e) => setNewNews({...newNews, body: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-brazil-green outline-none"
                        required
                    ></textarea>
                    <button type="submit" className="w-full bg-brazil-blue hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
                        Publish News
                    </button>
                    </form>
                </div>
                
                <div className="space-y-4">
                     <h3 className="text-xl font-bold text-white mb-4">Recent News</h3>
                     {news.map(n => (
                         <div key={n.id} className="bg-slate-800 p-4 rounded-xl flex justify-between items-center border border-slate-700">
                             <div>
                                 <h4 className="font-bold text-white">{n.title}</h4>
                                 <p className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleDateString()}</p>
                             </div>
                             <button onClick={() => handleDeleteNews(n.id)} className="text-red-500 hover:text-red-400 p-2"><Trash2 size={18}/></button>
                         </div>
                     ))}
                </div>
                </>
            )}
         </div>
      )}

    </Layout>
  );
};