
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, UserRole, Tip, NewsPost, MaestroStats, TipStatus, TipCategory, TipLeg, Message, Slide } from './types';
// SWITCHED TO LOCAL DB SERVICE
import { dbService } from './services/mockDb'; 
import { generateMatchAnalysis, checkBetResult } from './services/geminiService';
import { Layout } from './components/Layout';
import { TipCard } from './components/TipCard';
import { StatsWidget } from './components/StatsWidget';
import { ImageSlider } from './components/ImageSlider';
import { LiveScoreBoard } from './components/LiveScoreBoard';
import { 
  PlayCircle, Lock, Mail, ChevronRight, Plus, Trash2, Save, FileText, Check, X, 
  Smartphone, TrendingUp, Award, Target, UserPlus, XCircle, Trophy, 
  Flame, Eye, EyeOff, MessageSquare, Send, Globe, Newspaper, Calendar, Database, 
  Wand2, Upload, ExternalLink, Users, Shield, ShieldAlert, Edit3, ArrowLeft, 
  Activity, LayoutDashboard, Image as ImageIcon, UploadCloud, AlertTriangle, Sparkles,
  List
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

// --- Constants ---

const LEAGUES = [
  "England - Premier League", "England - Championship", "England - League One", "England - League Two", "England - FA Cup", "England - EFL Cup",
  "Spain - La Liga", "Spain - La Liga 2", "Spain - Copa del Rey",
  "Italy - Serie A", "Italy - Serie B", "Italy - Coppa Italia",
  "Germany - Bundesliga", "Germany - 2. Bundesliga", "Germany - DFB Pokal",
  "France - Ligue 1", "France - Ligue 2", "France - Coupe de France",
  "Brazil - Brasileirão Serie A", "Brazil - Brasileirão Serie B", "Brazil - Copa do Brasil", "Brazil - Paulistão", "Brazil - Carioca",
  "International - Champions League", "International - Europa League", "International - Conference League", "International - World Cup", "International - Euro", "International - Copa America", "International - Nations League", "International - Friendlies", "International - Club World Cup",
  "Portugal - Primeira Liga",
  "Netherlands - Eredivisie",
  "Turkey - Süper Lig",
  "USA - MLS",
  "Saudi Arabia - Pro League",
  "Argentina - Liga Profesional",
  "Mexico - Liga MX",
  "Japan - J1 League",
  "South Korea - K League 1",
  "Australia - A-League",
  "Scotland - Premiership",
  "Belgium - Pro League",
  "Switzerland - Super League",
  "Austria - Bundesliga",
  "Russia - Premier League",
  "Ukraine - Premier League",
  "Greece - Super League",
  "Denmark - Superliga",
  "Sweden - Allsvenskan",
  "Norway - Eliteserien",
  "China - Super League",
  "India - Super League",
  "South Africa - Premiership",
  "Egypt - Premier League",
  "Morocco - Botola Pro",
  "Basketball - NBA", "Basketball - EuroLeague",
  "American Football - NFL",
  "Tennis - Grand Slam", "Tennis - ATP", "Tennis - WTA",
  "Baseball - MLB",
  "Ice Hockey - NHL",
  "Cricket - IPL", "Cricket - World Cup", "Cricket - T20",
  "Multiple (Accumulator)"
];

// --- App Component ---

export const App: React.FC = () => {
  // Auth State
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
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
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  
  const [newTip, setNewTip] = useState<Partial<Tip>>({
    category: TipCategory.SINGLE,
    teams: '', league: LEAGUES[0], prediction: '', odds: 1.50, confidence: 'Medium', sport: 'Football', bettingCode: '', legs: [], kickoffTime: '', analysis: ''
  });
  const [multiLegInput, setMultiLegInput] = useState<TipLeg>({ teams: '', league: LEAGUES[0], prediction: '' });
  
  const [newNews, setNewNews] = useState<Partial<NewsPost>>({ title: '', category: 'Football', source: '', body: '', imageUrl: '', videoUrl: '', matchDate: '' });
  const [newSlide, setNewSlide] = useState<Partial<Slide>>({ title: '', subtitle: '', image: '' });
  
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  // User Contact State
  const [contactMessage, setContactMessage] = useState('');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Track IDs of messages currently being replied to, to prevent polling overwrites
  const pendingActionsRef = useRef<Set<string>>(new Set());

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
            const serverMsgs = currentUser.role === UserRole.ADMIN 
                ? await dbService.getMessages() 
                : await dbService.getUserMessages(currentUser.uid);
            
            // SMART MERGE: 
            // We must merge server data with local optimistic state to prevent flickering.
            setMessages(prev => {
                const serverIds = new Set(serverMsgs.map(m => m.id));
                const pendingTempMessages = prev.filter(m => !serverIds.has(m.id));
                
                const mergedServerMessages = serverMsgs.map(serverMsg => {
                    if (pendingActionsRef.current.has(serverMsg.id)) {
                        const localMsg = prev.find(p => p.id === serverMsg.id);
                        if (localMsg) {
                            return { ...serverMsg, reply: localMsg.reply }; // Keep optimistic reply
                        }
                    }
                    return serverMsg;
                });

                return [...mergedServerMessages, ...pendingTempMessages];
            });

            if (currentUser.role === UserRole.ADMIN) {
                const uList = await dbService.getAllUsers();
                setAllUsers(uList);
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
    const { data: authListener } = dbService.onAuthStateChange(async (u) => {
        if (!mounted) return;
        
        setUser(u);
        
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
  }, [fetchData]);

  // --- Polling ---
  useEffect(() => {
      if (!user) return;
      // Frequent polling for local DB is cheap
      const interval = setInterval(() => {
          fetchData(user);
      }, 3000);
      return () => clearInterval(interval);
  }, [user, fetchData]);

  // --- Auto Scroll for Chat ---
  useEffect(() => {
      if (activeTab === 'contact' || (activeTab === 'admin' && adminTab === 'messages')) {
          setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
      }
  }, [messages.length, activeTab, adminTab]);


  // --- Handlers ---

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        await dbService.login(email, password);
      } else if (authMode === 'signup') {
        try {
          await dbService.signUp(email, password, displayName);
          const u = await dbService.getCurrentUser();
          if (!u) {
             try {
                await dbService.login(email, password);
             } catch (loginErr) {
                 setAuthError('Account created! Please check email.');
                 setAuthMode('login');
             }
          }
        } catch (signUpError: any) {
           const errStr = (signUpError.message || '').toLowerCase();
           if (errStr.includes('already registered') || errStr.includes('unique constraint') || errStr.includes('already exists')) {
              try {
                  await dbService.login(email, password);
              } catch (loginErr: any) {
                  if (loginErr.message?.toLowerCase().includes('invalid login credentials')) {
                      setAuthError('Account exists. Incorrect password.');
                  } else {
                      setAuthError(loginErr.message || "Login failed.");
                  }
              }
           } else {
              throw signUpError;
           }
        }
      } else {
        await dbService.resetPassword(email);
        alert('Password reset link sent!');
        setAuthMode('login');
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    }
  };

  const handleLogout = async () => {
    setUser(null);
    setTips([]);
    setNews([]);
    setMessages([]);
    setActiveTab('dashboard');
    try {
        await dbService.logout();
    } catch(e) {
        console.error("Signout error:", e);
    }
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
      
      setIsSaving(true);
      try {
          if (editingTipId) {
             const updatedTip = { ...newTip, id: editingTipId } as Tip;
             await dbService.updateTip(updatedTip);
             setEditingTipId(null);
          } else {
             const cleanTip = {
                 ...newTip,
                 kickoffTime: newTip.kickoffTime || new Date().toISOString()
             };
             await dbService.addTip(cleanTip as Omit<Tip, 'id' | 'createdAt' | 'status' | 'votes'>);
          }
          
          setNewTip({
            category: TipCategory.SINGLE,
            teams: '', league: LEAGUES[0], prediction: '', odds: 1.50, confidence: 'Medium', sport: 'Football', bettingCode: '', legs: [], kickoffTime: '', analysis: ''
          });
          if (user) await fetchData(user);
      } catch (e: any) {
          console.error("Save Error:", e);
          alert("Error saving tip: " + (e.message || "Unknown Error. Check permissions."));
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteTip = async (id: string) => {
      if (window.confirm('Delete this tip?')) {
          await dbService.deleteTip(id);
          fetchData(user); // Force Refresh
      }
  };

  const handleSettleTip = async (id: string, status: TipStatus, score: string) => {
      let finalScore = score;
      if (!finalScore || finalScore === '1-0' || finalScore === '0-1') {
         const input = window.prompt(`Enter Final Score for this ${status} tip (e.g. 2-1):`, "");
         if (input === null) return; // User cancelled
         finalScore = input || (status === TipStatus.WON ? "Win" : "Loss");
      }
      
      await dbService.settleTip(id, status, finalScore);
      if (user) fetchData(user);
  };

  const handleVerifyResult = async (tip: Tip) => {
      alert(`Verifying result for ${tip.teams}... Please wait.`);
      const result = await checkBetResult(tip);
      if (result.status !== 'UNKNOWN' && result.status !== 'ERROR') {
          const confirmMsg = `AI Verification Result:\nStatus: ${result.status}\nScore: ${result.score}\nReason: ${result.reason}\n\nUpdate this tip?`;
          if (window.confirm(confirmMsg)) {
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
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel) adminPanel.scrollIntoView({ behavior: 'smooth' });
  }

  // --- Image Upload Helper ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
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
      setIsSaving(true);
      try {
        if (editingNewsId) {
             const updatedNews = { ...newNews, id: editingNewsId } as NewsPost;
             await dbService.updateNews(updatedNews);
             setEditingNewsId(null);
        } else {
             await dbService.addNews(newNews as Omit<NewsPost, 'id' | 'createdAt'>);
        }
        
        setNewNews({ title: '', category: 'Football', source: '', body: '', imageUrl: '', videoUrl: '', matchDate: '' });
        if (user) await fetchData(user);
      } catch (e: any) {
          alert("Error: " + e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleEditNews = (post: NewsPost) => {
      setNewNews(post);
      setEditingNewsId(post.id);
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel) adminPanel.scrollIntoView({ behavior: 'smooth' });
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
      setIsSaving(true);
      try {
        if (editingSlideId) {
             const updatedSlide = { ...newSlide, id: editingSlideId } as Slide;
             await dbService.updateSlide(updatedSlide);
             setEditingSlideId(null);
        } else {
             await dbService.addSlide(newSlide);
        }
        
        setNewSlide({ title: '', subtitle: '', image: '' });
        if (user) await fetchData(user);
      } catch (e: any) {
          alert("Error: " + e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleEditSlide = (slide: Slide) => {
      setNewSlide(slide);
      setEditingSlideId(slide.id);
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel) adminPanel.scrollIntoView({ behavior: 'smooth' });
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
      
      const msgContent = contactMessage;
      setContactMessage(''); // Clear input immediately
      
      // Optimistic update
      const tempId = Date.now().toString();
      const optimisticMsg: Message = {
          id: tempId,
          userId: user.uid,
          userName: user.displayName || 'User',
          content: msgContent,
          createdAt: Date.now(),
          isRead: false
      };
      
      setMessages(prev => [...prev, optimisticMsg]); // Append to end

      try {
        const savedMsg = await dbService.sendMessage(user.uid, user.displayName || 'User', msgContent);
        if (savedMsg) {
            setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m));
        } else {
            await fetchData(user);
        }
      } catch (e: any) {
          console.error(e);
          setMessages(prev => prev.filter(m => m.id !== tempId));
      }
  };

  const handleReplyMessage = async (msgId: string) => {
      const text = replyText[msgId];
      if (!text) return;
      
      pendingActionsRef.current.add(msgId);
      setReplyText(prev => ({ ...prev, [msgId]: '' }));
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reply: text, isRead: true } : m));

      try {
          await dbService.replyToMessage(msgId, text);
          if (user) await fetchData(user);
      } catch (e: any) {
          console.error("Reply failed", e);
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reply: undefined, isRead: false } : m));
          setReplyText(prev => ({ ...prev, [msgId]: text }));
      } finally {
          pendingActionsRef.current.delete(msgId);
      }
  };
  
  const handleDeleteMessage = async (msgId: string) => {
      if (window.confirm("Delete this message?")) {
          setMessages(prev => prev.filter(m => m.id !== msgId));
          try {
              await dbService.deleteMessage(msgId);
              fetchData(user); 
          } catch(e) {
              console.error("Failed to delete", e);
              alert("Failed to delete message.");
              fetchData(user);
          }
      }
  };

  // --- RENDER HELPERS ---

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/30 via-slate-950 to-slate-950"></div>
        <Trophy size={80} className="text-brazil-yellow animate-bounce mb-8 relative z-10 drop-shadow-[0_0_15px_rgba(255,223,0,0.5)]" />
        <h1 className="text-4xl font-black italic text-white tracking-tighter relative z-10 animate-pulse">JIRVINHO</h1>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-brazil-green/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute -bottom-[10%] -left-[10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px]"></div>
        </div>
        
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10">
          <div className="text-center mb-10">
             <div className="w-20 h-20 bg-gradient-to-br from-brazil-green to-blue-900 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-green-500/20 mb-6 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                 <Trophy size={40} className="text-brazil-yellow" />
             </div>
             <h2 className="text-4xl font-black text-white italic tracking-tighter mb-2">JIRVINHO</h2>
             <p className="text-slate-400 font-medium tracking-wide">Elite Sports Analysis</p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-2xl mb-6 flex items-center justify-center font-bold">
              <ShieldAlert size={18} className="mr-2"/> {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
             <div className="space-y-5">
                {authMode === 'signup' && (
                    <div className="relative group">
                        <Smartphone className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-brazil-green transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Display Name"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-brazil-green focus:ring-1 focus:ring-brazil-green transition-all"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                        />
                    </div>
                )}
                
                <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-brazil-green transition-colors" size={20} />
                    <input
                        type="email"
                        placeholder="Email Address"
                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-brazil-green focus:ring-1 focus:ring-brazil-green transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-brazil-green transition-colors" size={20} />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-brazil-green focus:ring-1 focus:ring-brazil-green transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3.5 text-slate-500 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
             </div>

             <div className="flex justify-between items-center text-xs text-slate-400 pt-2 px-1">
                 <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="hover:text-brazil-green transition-colors font-bold uppercase tracking-wider">
                     {authMode === 'login' ? 'Create Account' : 'Back to Login'}
                 </button>
                 {authMode === 'login' && (
                     <button type="button" onClick={() => setAuthMode('forgot')} className="hover:text-white transition-colors">
                         Forgot password?
                     </button>
                 )}
             </div>

             <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-brazil-green to-green-600 hover:from-green-500 hover:to-green-400 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-green-900/30 active:scale-[0.98] transition-all duration-300 mt-4"
             >
                {authMode === 'login' ? 'Enter Arena' : authMode === 'signup' ? 'Join Now' : 'Send Reset Link'}
             </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN APP UI ---

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
        
        {/* --- DASHBOARD TAB --- */}
        {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* WELCOME BANNER - NEW ADDITION */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-green-900/60 via-slate-900/80 to-slate-900/80 border border-white/10 p-8 shadow-2xl relative group">
                   <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity duration-1000">
                      <Trophy size={200} className="transform rotate-12 text-white" />
                   </div>
                   <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-brazil-green/10 to-transparent"></div>
                   
                   <div className="relative z-10 max-w-2xl">
                      <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={16} className="text-brazil-yellow animate-pulse" />
                          <span className="text-brazil-yellow text-xs font-bold uppercase tracking-widest">Premium Member</span>
                      </div>
                      <h1 className="text-3xl md:text-5xl font-black italic text-white mb-3 leading-tight">
                         Welcome back, <br/>
                         <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{user.displayName}!</span>
                      </h1>
                      <p className="text-slate-300 font-medium text-sm md:text-base max-w-md leading-relaxed">
                         The arena is set for victory. Analyze the stats, check the latest insights, and make your move.
                      </p>
                   </div>
                </div>

                {/* Stats & Banner Section */}
                <div className="space-y-8">
                   <ImageSlider slides={slides} />
                   <StatsWidget stats={stats} />
                </div>

                {/* Categories Tabs (Mobile Optimized) */}
                <div className="sticky top-20 z-30 bg-slate-950/80 backdrop-blur-xl py-4 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-none border-b border-white/5 md:border-0">
                    <div className="flex space-x-3 overflow-x-auto pb-1 scrollbar-hide md:justify-center">
                        {[TipCategory.SINGLE, TipCategory.ODD_2_PLUS, TipCategory.ODD_4_PLUS].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setMobileTab(cat)}
                                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-lg border ${
                                    mobileTab === cat 
                                    ? 'bg-white text-slate-900 border-white scale-105' 
                                    : 'bg-slate-800/50 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tips Grid */}
                <div>
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <div className="p-2 bg-brazil-yellow/10 rounded-lg">
                            <Target className="text-brazil-yellow" size={24} />
                        </div>
                        <h2 className="text-2xl font-black italic text-white tracking-tight">{mobileTab.toUpperCase()}</h2>
                    </div>

                    {tips.filter(t => t.category === mobileTab).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {tips.filter(t => t.category === mobileTab).map(tip => (
                                <TipCard key={tip.id} tip={tip} isAdmin={user.role === UserRole.ADMIN} onVote={handleVote} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-slate-900/30 rounded-[2rem] border border-dashed border-slate-800 backdrop-blur-sm">
                            <Target className="mx-auto h-16 w-16 text-slate-700 mb-4 opacity-50" />
                            <h3 className="text-slate-400 font-bold text-lg">No tips available yet</h3>
                            <p className="text-slate-600 text-sm mt-1">Check back later for new predictions.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- STATS TAB --- */}
        {activeTab === 'stats' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-brazil-green/10 rounded-xl">
                        <Award className="text-brazil-green" size={28}/> 
                    </div>
                    <h2 className="text-3xl font-black italic text-white tracking-tight">PERFORMANCE STATS</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                     <div className="glass-panel p-8 rounded-[2rem]">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Win/Loss Distribution</h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Won', value: stats.wonTips },
                                    { name: 'Total', value: stats.totalTips },
                                    { name: 'Win %', value: stats.winRate }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12, fontWeight: 700}} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'}}
                                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    />
                                    <Bar dataKey="value" fill="#009c3b" radius={[6, 6, 6, 6]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                     </div>
                </div>
                
                <div className="bg-gradient-to-br from-slate-900 to-black p-10 rounded-[2.5rem] border border-white/5 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brazil-yellow/5 rounded-full blur-[80px]"></div>
                    <Trophy size={56} className="text-brazil-yellow mx-auto mb-6 relative z-10" />
                    <h3 className="text-4xl font-black text-white mb-4 tracking-tight relative z-10">MAESTRO TRUST</h3>
                    <p className="text-slate-400 max-w-lg mx-auto leading-relaxed relative z-10">
                        Our AI-driven analysis coupled with expert human oversight delivers consistent results. 
                        We maintain transparency with every tip settled.
                    </p>
                </div>
            </div>
        )}

        {/* --- NEWS TAB --- */}
        {activeTab === 'news' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                        <Newspaper className="text-blue-400" size={28}/> 
                    </div>
                    <h2 className="text-3xl font-black italic text-white tracking-tight">LATEST NEWS</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {news.map(post => (
                        <div key={post.id} className="glass-panel rounded-[2rem] overflow-hidden hover:border-white/20 transition-all group duration-500 hover:-translate-y-1">
                             <div className="h-56 bg-slate-800 relative overflow-hidden">
                                {post.imageUrl ? (
                                    <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                        <Newspaper size={48} className="text-slate-700"/>
                                    </div>
                                )}
                                <div className="absolute top-4 left-4 bg-brazil-blue/90 backdrop-blur text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg uppercase tracking-wider">
                                    {post.category}
                                </div>
                             </div>
                             <div className="p-8">
                                 <div className="flex items-center text-[10px] text-slate-400 mb-4 font-bold uppercase tracking-wider space-x-2">
                                     <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                     {post.source && <span className="text-brazil-green">• {post.source}</span>}
                                 </div>
                                 <h3 className="text-xl font-bold text-white mb-4 leading-tight group-hover:text-brazil-yellow transition-colors">{post.title}</h3>
                                 <p className="text-slate-400 text-sm line-clamp-3 mb-6 leading-relaxed">{post.body}</p>
                                 <button className="text-brazil-green text-xs font-black flex items-center hover:text-white transition-colors uppercase tracking-widest">
                                     READ FULL STORY <ChevronRight size={14} className="ml-1"/>
                                 </button>
                             </div>
                        </div>
                    ))}
                    {news.length === 0 && (
                        <div className="col-span-full text-center py-24 text-slate-500 font-medium">No news articles yet.</div>
                    )}
                </div>
            </div>
        )}

        {/* --- SCORES TAB --- */}
        {activeTab === 'scores' && (
             <LiveScoreBoard />
        )}

        {/* --- CONTACT / CHAT TAB --- */}
        {activeTab === 'contact' && (
            // FIX: Using fixed positioning on mobile to ensure full viewport height usage without getting hidden by nav
            <div className="fixed inset-x-0 top-20 bottom-24 md:static md:h-[calc(100vh-140px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 z-30">
                 <div className="flex-1 glass-panel md:rounded-[2.5rem] overflow-hidden flex flex-col relative shadow-2xl h-full border-x-0 md:border-x border-y-0 md:border-y border-white/10">
                     {/* Chat Header */}
                     <div className="p-4 md:p-6 bg-slate-900/50 border-b border-white/5 flex items-center justify-between backdrop-blur-md shrink-0">
                         <h2 className="text-lg md:text-xl font-black italic text-white flex items-center gap-3">
                            <MessageSquare className="text-brazil-green" size={24}/> 
                            {user.role === UserRole.ADMIN ? 'USER MESSAGES' : 'ASK THE MAESTRO'}
                         </h2>
                     </div>
                     
                     {/* Chat Messages Area */}
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-950/30">
                         {messages.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                 <MessageSquare size={64} className="mb-4"/>
                                 <p className="text-sm font-bold tracking-widest uppercase">Start the conversation...</p>
                             </div>
                         ) : (
                             messages.map(msg => (
                                 <div key={msg.id} className={`flex flex-col ${msg.userId === user.uid ? 'items-end' : 'items-start'}`}>
                                     <div className={`max-w-[85%] rounded-3xl p-5 shadow-lg group relative ${msg.userId === user.uid ? 'bg-gradient-to-br from-brazil-green/80 to-green-800 text-white rounded-tr-none' : 'bg-slate-800 border border-white/5 text-slate-200 rounded-tl-none'}`}>
                                         {user.role === UserRole.ADMIN && msg.userId !== user.uid && (
                                             <div className="text-[10px] text-brazil-yellow font-bold mb-2 uppercase tracking-wider">{msg.userName}</div>
                                         )}
                                         <p className="text-sm leading-relaxed">{msg.content}</p>
                                         <span className="text-[10px] opacity-50 mt-3 block text-right font-medium">{new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                         
                                         {/* Delete Button for Owner */}
                                         {msg.userId === user.uid && (
                                             <button 
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-red-500 bg-slate-900/50 rounded-full transition-all opacity-60 hover:opacity-100"
                                                title="Delete Message"
                                             >
                                                 <Trash2 size={14}/>
                                             </button>
                                         )}
                                     </div>
                                     
                                     {/* Admin Reply Display - IMPROVED VISIBILITY */}
                                     {msg.reply && (
                                         <div className="mt-2 ml-4 max-w-[85%] bg-gradient-to-r from-blue-900/40 to-slate-900/40 border border-blue-500/30 p-4 rounded-3xl rounded-tl-none text-slate-200 text-sm flex gap-3 shadow-lg">
                                             <div className="w-1 bg-blue-500 rounded-full shrink-0 shadow-[0_0_10px_#3b82f6]"></div>
                                             <div className="w-full">
                                                 <span className="text-[10px] text-blue-400 font-bold uppercase block mb-1 tracking-wider flex items-center gap-1">
                                                     <Sparkles size={10} /> Jirvinho Reply
                                                 </span>
                                                 <p className="leading-relaxed font-medium">{msg.reply}</p>
                                             </div>
                                         </div>
                                     )}

                                     {/* Admin Reply Input */}
                                     {user.role === UserRole.ADMIN && !msg.reply && msg.userId !== user.uid && (
                                         <div className="mt-3 flex w-full max-w-[85%] gap-2 animate-in fade-in slide-in-from-top-1">
                                             <input 
                                                type="text" 
                                                placeholder="Write a reply..."
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:border-brazil-green focus:outline-none focus:ring-1 focus:ring-brazil-green/50 transition-all"
                                                value={replyText[msg.id] || ''}
                                                onChange={(e) => setReplyText({...replyText, [msg.id]: e.target.value})}
                                             />
                                             <button 
                                                onClick={() => handleReplyMessage(msg.id)}
                                                disabled={!replyText[msg.id]}
                                                className="bg-slate-800 hover:bg-brazil-green disabled:opacity-50 disabled:hover:bg-slate-800 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95"
                                             >
                                                 <Send size={16}/>
                                             </button>
                                         </div>
                                     )}
                                 </div>
                             ))
                         )}
                         <div ref={messagesEndRef} className="h-4" />
                     </div>

                     {/* Chat Input (User Only) */}
                     {user.role !== UserRole.ADMIN && (
                         <div className="p-4 md:p-6 bg-slate-900/80 border-t border-white/5 backdrop-blur-md shrink-0">
                             <div className="flex gap-3">
                                 <input 
                                    type="text"
                                    value={contactMessage}
                                    onChange={(e) => setContactMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-slate-800 border-none rounded-2xl px-6 py-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-brazil-green/50 focus:outline-none shadow-inner"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                 />
                                 <button 
                                    onClick={handleSendMessage}
                                    disabled={!contactMessage.trim()}
                                    className="bg-brazil-green hover:bg-green-600 disabled:opacity-50 disabled:hover:bg-brazil-green text-white p-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-green-900/30"
                                 >
                                     <Send size={24}/>
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
            </div>
        )}

        {/* --- ADMIN TAB --- */}
        {activeTab === 'admin' && user.role === UserRole.ADMIN && (
            <div id="admin-panel" className="animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
                <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
                     <h2 className="text-3xl font-black italic text-white flex items-center gap-3">
                        <Shield className="text-brazil-green" size={32}/> ADMIN PANEL
                     </h2>
                     {/* Sub-nav for Admin */}
                     <div className="flex bg-slate-900/80 rounded-xl p-1.5 border border-white/5 backdrop-blur-md shadow-lg">
                        {['overview', 'tips', 'news', 'slides', 'users'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setAdminTab(t as any)}
                                className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${adminTab === t ? 'bg-slate-700 text-white shadow-lg transform scale-105' : 'text-slate-500 hover:text-white'}`}
                            >
                                {t}
                            </button>
                        ))}
                     </div>
                </div>

                {/* OVERVIEW SUB-TAB */}
                {adminTab === 'overview' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="glass-panel p-6 rounded-[2rem] text-center">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Users</p>
                            <p className="text-4xl font-black text-white">{allUsers.length}</p>
                        </div>
                        <div className="glass-panel p-6 rounded-[2rem] text-center">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Active Tips</p>
                            <p className="text-4xl font-black text-white">{tips.filter(t => t.status === TipStatus.PENDING).length}</p>
                        </div>
                        <div className="glass-panel p-6 rounded-[2rem] text-center">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Messages</p>
                            <p className="text-4xl font-black text-white">{messages.length}</p>
                        </div>
                        <div className="glass-panel p-6 rounded-[2rem] text-center border-brazil-green/30 relative overflow-hidden">
                             <div className="absolute inset-0 bg-brazil-green/5"></div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Win Rate</p>
                            <p className="text-4xl font-black text-brazil-green">{stats.winRate}%</p>
                        </div>
                    </div>
                )}

                {/* SLIDES MANAGEMENT */}
                {adminTab === 'slides' && (
                    <div className="space-y-8">
                        {/* Slide Form */}
                        <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                {editingSlideId ? <Edit3 size={18}/> : <Plus size={18}/>}
                                {editingSlideId ? 'Edit Slide' : 'Add New Slide'}
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Image URL (or Base64)</label>
                                    <div className="flex gap-3">
                                        <input 
                                            type="text" 
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-brazil-green focus:outline-none transition-colors"
                                            value={newSlide.image || ''}
                                            onChange={(e) => setNewSlide({...newSlide, image: e.target.value})}
                                            placeholder="https://..."
                                        />
                                        <label className="bg-slate-800 hover:bg-slate-700 text-white px-6 rounded-xl flex items-center cursor-pointer transition-colors border border-white/5">
                                            <UploadCloud size={20} />
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (val) => setNewSlide({...newSlide, image: val}))} />
                                        </label>
                                    </div>
                                    {newSlide.image && (
                                        <div className="mt-4 h-40 w-full rounded-2xl bg-cover bg-center border border-slate-700 shadow-lg" style={{backgroundImage: `url(${newSlide.image})`}}></div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Title</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm font-bold focus:border-brazil-green focus:outline-none transition-colors"
                                        value={newSlide.title || ''}
                                        onChange={(e) => setNewSlide({...newSlide, title: e.target.value})}
                                        placeholder="e.g. WEEKEND MEGA JACKPOT"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Subtitle</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-brazil-green focus:outline-none transition-colors"
                                        value={newSlide.subtitle || ''}
                                        onChange={(e) => setNewSlide({...newSlide, subtitle: e.target.value})}
                                        placeholder="e.g. Win Big with 50+ Odds"
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    {editingSlideId && (
                                        <button 
                                            onClick={() => { setEditingSlideId(null); setNewSlide({title:'', subtitle:'', image:''}); }}
                                            className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleSaveSlide} 
                                        disabled={isSaving}
                                        className="flex-1 bg-brazil-green hover:bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-900/20 disabled:opacity-50 uppercase tracking-widest transition-all"
                                    >
                                        {isSaving ? 'Saving...' : (editingSlideId ? 'Update Slide' : 'Publish Slide')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Slides List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {slides.map(slide => (
                                <div key={slide.id} className="group relative h-48 rounded-[2rem] overflow-hidden border border-slate-800 shadow-lg">
                                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{backgroundImage: `url(${slide.image})`}}></div>
                                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors"></div>
                                    <div className="absolute bottom-0 left-0 p-6">
                                        <p className="text-white font-black text-lg italic">{slide.title}</p>
                                        <p className="text-xs text-slate-300 font-medium">{slide.subtitle}</p>
                                    </div>
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                        <button onClick={() => handleEditSlide(slide)} className="p-2 bg-white text-slate-900 rounded-full hover:scale-110 transition-transform"><Edit3 size={16}/></button>
                                        <button onClick={() => handleDeleteSlide(slide.id)} className="p-2 bg-red-600 text-white rounded-full hover:scale-110 transition-transform"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TIPS MANAGEMENT */}
                {adminTab === 'tips' && (
                    <div className="space-y-8">
                        {/* Add/Edit Tip Form */}
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    {editingTipId ? <Edit3 size={20}/> : <Plus size={20}/>}
                                    {editingTipId ? 'Edit Tip' : 'Add New Tip'}
                                </h3>
                                {editingTipId && (
                                    <button 
                                        onClick={() => { setEditingTipId(null); setNewTip({ category: TipCategory.SINGLE, teams: '', league: LEAGUES[0], prediction: '', odds: 1.50, confidence: 'Medium', sport: 'Football', bettingCode: '', legs: [], kickoffTime: '', analysis: '' }); }}
                                        className="text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-wider bg-red-500/10 px-4 py-2 rounded-lg"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Category</label>
                                        <select 
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-brazil-green outline-none transition-colors"
                                            value={newTip.category}
                                            onChange={(e) => setNewTip({...newTip, category: e.target.value as TipCategory})}
                                        >
                                            {Object.values(TipCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Kickoff Time</label>
                                        <input 
                                            type="datetime-local" 
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-brazil-green outline-none transition-colors"
                                            value={newTip.kickoffTime ? new Date(newTip.kickoffTime).toISOString().slice(0, 16) : ''}
                                            onChange={(e) => setNewTip({...newTip, kickoffTime: new Date(e.target.value).toISOString()})}
                                        />
                                    </div>
                                </div>

                                {newTip.category === TipCategory.ODD_4_PLUS || newTip.category.includes('Multiple') ? (
                                    // ACCUMULATOR BUILDER
                                    <div className="bg-slate-950/50 p-6 rounded-2xl border border-dashed border-slate-700">
                                        <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2"><List size={14}/> Accumulator Legs</h4>
                                        <div className="space-y-3 mb-4">
                                            {newTip.legs?.map((leg, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl text-sm border border-slate-700">
                                                    <span className="text-slate-200 font-medium">{leg.teams} <span className="text-slate-500">({leg.prediction})</span></span>
                                                    <button onClick={() => handleRemoveLeg(idx)} className="text-red-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded"><X size={16}/></button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <input 
                                                placeholder="Teams (e.g. Chelsea vs Arsenal)" 
                                                className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-brazil-green outline-none"
                                                value={multiLegInput.teams}
                                                onChange={(e) => setMultiLegInput({...multiLegInput, teams: e.target.value})}
                                            />
                                            <input 
                                                placeholder="Prediction" 
                                                className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-brazil-green outline-none"
                                                value={multiLegInput.prediction}
                                                onChange={(e) => setMultiLegInput({...multiLegInput, prediction: e.target.value})}
                                            />
                                            <button 
                                                onClick={handleAddLeg}
                                                className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl shadow-lg"
                                            >
                                                Add Leg
                                            </button>
                                        </div>
                                        <div className="mt-5">
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Summary Title</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Premier League Treble"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-brazil-green outline-none transition-colors"
                                                value={newTip.teams || ''}
                                                onChange={(e) => setNewTip({...newTip, teams: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    // SINGLE MATCH INPUTS
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Teams</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Real Madrid vs Barcelona"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-brazil-green outline-none transition-colors"
                                                value={newTip.teams || ''}
                                                onChange={(e) => setNewTip({...newTip, teams: e.target.value})}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">League</label>
                                                <select 
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-brazil-green outline-none transition-colors"
                                                    value={newTip.league}
                                                    onChange={(e) => setNewTip({...newTip, league: e.target.value})}
                                                >
                                                    {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Prediction</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. Home Win & Over 2.5"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-brazil-green outline-none transition-colors"
                                                    value={newTip.prediction || ''}
                                                    onChange={(e) => setNewTip({...newTip, prediction: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Odds</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-brazil-green outline-none transition-colors"
                                            value={newTip.odds}
                                            onChange={(e) => setNewTip({...newTip, odds: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Booking Code (Opt)</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. 8X92K"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm font-mono tracking-wider focus:border-brazil-green outline-none transition-colors"
                                            value={newTip.bettingCode || ''}
                                            onChange={(e) => setNewTip({...newTip, bettingCode: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis</label>
                                        <button 
                                            onClick={handleGenerateAnalysis}
                                            disabled={isGeneratingAI}
                                            className="text-[10px] text-brazil-green font-bold flex items-center hover:text-white transition-colors disabled:opacity-50 uppercase tracking-widest bg-green-900/10 px-3 py-1 rounded-full border border-green-900/20"
                                        >
                                            <Wand2 size={12} className="mr-1"/> {isGeneratingAI ? 'Generating...' : 'AI Generate'}
                                        </button>
                                    </div>
                                    <textarea 
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm h-32 focus:border-brazil-green outline-none resize-none transition-colors"
                                        placeholder="Expert insights about this match..."
                                        value={newTip.analysis || ''}
                                        onChange={(e) => setNewTip({...newTip, analysis: e.target.value})}
                                    />
                                </div>

                                <button 
                                    onClick={handleSaveTip}
                                    disabled={isSaving}
                                    className="w-full bg-gradient-to-r from-brazil-green to-green-600 hover:from-green-500 hover:to-green-400 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-xl shadow-green-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'SAVING...' : (editingTipId ? 'UPDATE TIP' : 'PUBLISH TIP')}
                                </button>
                            </div>
                        </div>

                        {/* Existing Tips List */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-white mb-4 pl-2">Manage Tips</h3>
                            {tips.length === 0 && <p className="text-slate-500 pl-2">No tips found.</p>}
                            {tips.map(tip => (
                                <TipCard 
                                    key={tip.id} 
                                    tip={tip} 
                                    isAdmin={true} 
                                    onSettle={handleSettleTip} 
                                    onDelete={handleDeleteTip}
                                    onVerify={handleVerifyResult}
                                    onEdit={handleEditTip}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* NEWS MANAGEMENT */}
                {adminTab === 'news' && (
                    <div className="space-y-8">
                         <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                             <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                {editingNewsId ? <Edit3 size={18}/> : <Plus size={18}/>}
                                {editingNewsId ? 'Edit News' : 'Add News Article'}
                            </h3>
                             <div className="space-y-6">
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Title</label>
                                     <input 
                                         type="text" 
                                         className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-brazil-green focus:outline-none transition-colors"
                                         value={newNews.title || ''}
                                         onChange={(e) => setNewNews({...newNews, title: e.target.value})}
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Image URL (or upload)</label>
                                     <div className="flex gap-3">
                                        <input 
                                            type="text" 
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-brazil-green focus:outline-none transition-colors"
                                            value={newNews.imageUrl || ''}
                                            onChange={(e) => setNewNews({...newNews, imageUrl: e.target.value})}
                                        />
                                        <label className="bg-slate-800 hover:bg-slate-700 text-white px-6 rounded-xl flex items-center cursor-pointer transition-colors border border-white/5">
                                            <UploadCloud size={20} />
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (val) => setNewNews({...newNews, imageUrl: val}))} />
                                        </label>
                                     </div>
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Content</label>
                                     <textarea 
                                         className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm h-40 resize-none focus:border-brazil-green focus:outline-none transition-colors"
                                         value={newNews.body || ''}
                                         onChange={(e) => setNewNews({...newNews, body: e.target.value})}
                                     />
                                 </div>
                                 <div className="flex gap-4">
                                     {editingNewsId && (
                                         <button onClick={() => { setEditingNewsId(null); setNewNews({ title: '', category: 'Football', source: '', body: '', imageUrl: '', videoUrl: '', matchDate: '' }); }} className="px-6 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors">Cancel</button>
                                     )}
                                     <button onClick={handleSaveNews} disabled={isSaving} className="flex-1 bg-brazil-green hover:bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-900/20 disabled:opacity-50 uppercase tracking-widest transition-all">
                                         {isSaving ? 'Saving...' : (editingNewsId ? 'Update Article' : 'Publish Article')}
                                     </button>
                                 </div>
                             </div>
                         </div>
                         
                         <div className="space-y-4">
                             {news.map(post => (
                                 <div key={post.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center shadow-lg hover:border-white/10 transition-colors">
                                     <div className="flex items-center gap-5">
                                         {post.imageUrl && <img src={post.imageUrl} className="w-16 h-16 rounded-xl object-cover shadow-md" alt="" />}
                                         <div>
                                             <h4 className="text-white font-bold text-lg">{post.title}</h4>
                                             <p className="text-xs text-slate-500 mt-1 font-medium">{new Date(post.createdAt).toLocaleDateString()}</p>
                                         </div>
                                     </div>
                                     <div className="flex gap-2">
                                         <button onClick={() => handleEditNews(post)} className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 hover:scale-110 transition-all"><Edit3 size={18}/></button>
                                         <button onClick={() => handleDeleteNews(post.id)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white hover:scale-110 transition-all"><Trash2 size={18}/></button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                )}

                {/* USERS MANAGEMENT */}
                {adminTab === 'users' && (
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                        <h3 className="text-xl font-bold text-white mb-8">User Management</h3>
                        <div className="space-y-4">
                            {allUsers.map(u => (
                                <div key={u.uid} className="flex items-center justify-between bg-slate-950 p-5 rounded-2xl border border-slate-800">
                                    <div>
                                        <p className="text-white font-bold text-lg">{u.displayName || 'No Name'}</p>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">{u.email} • <span className={u.role === UserRole.ADMIN ? 'text-brazil-green font-bold' : 'text-slate-500'}>{u.role}</span></p>
                                    </div>
                                    <div className="flex gap-3">
                                        {u.role !== UserRole.ADMIN && (
                                            <button 
                                                onClick={() => handleUserAction(u.uid, 'make_admin')}
                                                className="px-4 py-2 bg-blue-900/20 text-blue-400 text-xs font-bold uppercase rounded-xl hover:bg-blue-500 hover:text-white transition-all tracking-wider"
                                            >
                                                Make Admin
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleUserAction(u.uid, 'delete')}
                                            className="p-2 text-slate-600 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-xl"
                                            title="Delete User"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

    </Layout>
  );
};
