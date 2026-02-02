
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Tip, NewsPost, MaestroStats, TipStatus, TipCategory, TipLeg, Message, Slide } from './types';
// Switch back to mockDb so the user's "admin@jirvinho.com" credentials work without Firebase setup
import { dbService } from './services/mockDb'; 
import { generateMatchAnalysis, checkBetResult } from './services/geminiService';
import { Layout } from './components/Layout';
import { TipCard } from './components/TipCard';
import { StatsWidget } from './components/StatsWidget';
import { ImageSlider } from './components/ImageSlider';
import { LiveScoreBoard } from './components/LiveScoreBoard';
import { ImageCropper } from './components/ImageCropper';
import { 
  Lock, Mail, ChevronRight, Plus, Trash2, Smartphone, Target, Trophy, 
  Flame, Eye, EyeOff, MessageSquare, Send, Newspaper, 
  Wand2, UploadCloud, Edit3, Activity, List, Search, UserCog, Sparkles, Shield, ShieldAlert,
  BarChart3, Check, X, LayoutDashboard, Settings, Info, Calendar, Clock, Hash, Globe,
  MoreVertical, UserCheck, UserMinus, AlertCircle, RefreshCcw
} from 'lucide-react';
import { CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts';

const LEAGUES = [
  "England - Premier League", "Spain - La Liga", "Italy - Serie A", "Germany - Bundesliga", 
  "France - Ligue 1", "Brazil - Brasileirão Serie A", "International - Champions League", 
  "Basketball - NBA", "Tennis - Grand Slam", "Cricket - IPL", "Multiple (Accumulator)"
];

export const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tips, setTips] = useState<Tip[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [stats, setStats] = useState<MaestroStats>({ winRate: 0, totalTips: 0, wonTips: 0, streak: [] });
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [mobileTab, setMobileTab] = useState<TipCategory>(TipCategory.SINGLE);
  const [adminTab, setAdminTab] = useState<'overview' | 'tips' | 'news' | 'slides' | 'users' | 'messages'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit States
  const [editingTipId, setEditingTipId] = useState<string | null>(null);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  
  // Form States
  const [newTip, setNewTip] = useState<Partial<Tip>>({ 
    category: TipCategory.SINGLE, teams: '', league: LEAGUES[0], prediction: '', odds: 1.50, 
    confidence: 'Medium', sport: 'Football', bettingCode: '', legs: [], kickoffTime: '', analysis: '' 
  });
  const [multiLegInput, setMultiLegInput] = useState<TipLeg>({ teams: '', league: LEAGUES[0], prediction: '' });
  const [newNews, setNewNews] = useState<Partial<NewsPost>>({ title: '', category: 'Football', body: '' });
  const [newSlide, setNewSlide] = useState<Partial<Slide>>({ title: '', subtitle: '', image: '' });
  
  // Media states
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [cropCallback, setCropCallback] = useState<((base64: string) => void) | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Chat states
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [contactMessage, setContactMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeAuth = dbService.onAuthStateChange((u) => {
        setUser(u);
        setIsInitializing(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubTips = dbService.subscribeToTips((data) => setTips(data));
    const unsubNews = dbService.subscribeToNews((data) => setNews(data));
    const unsubSlides = dbService.subscribeToSlides((data) => setSlides(data));
    const unsubMessages = dbService.subscribeToMessages(user, (data) => setMessages(data));
    
    let unsubUsers = () => {};
    if (user.role === UserRole.ADMIN) { 
        unsubUsers = dbService.subscribeToAllUsers((data) => setAllUsers(data)); 
    }
    
    return () => { unsubTips(); unsubNews(); unsubSlides(); unsubMessages(); unsubUsers(); };
  }, [user]);

  useEffect(() => {
      const settledTips = tips.filter(t => t.status !== TipStatus.PENDING);
      const totalTips = settledTips.length;
      const wonTips = settledTips.filter(t => t.status === TipStatus.WON).length;
      const winRate = totalTips > 0 ? parseFloat(((wonTips / totalTips) * 100).toFixed(1)) : 0;
      const streak = settledTips.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10).map(t => t.status);
      setStats({ winRate, totalTips, wonTips, streak });
  }, [tips]);

  useEffect(() => {
    if (activeTab === 'contact' || (activeTab === 'admin' && adminTab === 'messages')) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, adminTab]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') { await dbService.login(email, password); } 
      else if (authMode === 'signup') { await dbService.signUp(email, password, displayName); } 
      else { await dbService.resetPassword(email); setAuthMode('login'); }
    } catch (err: any) { setAuthError(err.message || "Auth Error"); }
  };

  const handleLogout = () => dbService.logout();
  const handleVote = (id: string, type: 'agree' | 'disagree') => dbService.voteOnTip(id, type);

  // --- ADMIN ACTIONS ---

  const handleSaveTip = async () => {
      setIsSaving(true);
      try {
          if (editingTipId) {
              await dbService.updateTip({ ...newTip, id: editingTipId } as Tip);
          } else {
              await dbService.addTip(newTip as Omit<Tip, 'id' | 'createdAt' | 'status' | 'votes'>);
          }
          setNewTip({ category: TipCategory.SINGLE, teams: '', league: LEAGUES[0], prediction: '', odds: 1.50, confidence: 'Medium', sport: 'Football', bettingCode: '', legs: [], kickoffTime: '', analysis: '' });
          setEditingTipId(null);
      } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleAIGenerateAnalysis = async () => {
      if (!newTip.teams || !newTip.league) return;
      setIsGeneratingAI(true);
      const analysis = await generateMatchAnalysis(newTip.teams, newTip.league);
      setNewTip(prev => ({ ...prev, analysis }));
      setIsGeneratingAI(false);
  };

  const handleAIVerifyTip = async (tip: Tip) => {
      setIsGeneratingAI(true);
      const result = await checkBetResult(tip);
      if (result.status !== 'PENDING' && result.status !== 'ERROR') {
          await dbService.settleTip(tip.id, result.status as TipStatus, result.score);
      } else {
          alert(`Verification Result: ${result.reason}`);
      }
      setIsGeneratingAI(false);
  };

  const handleImageUpload = (callback: (base64: string) => void) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (file) {
              const reader = new FileReader();
              reader.onload = (re) => {
                  setCroppingImage(re.target?.result as string);
                  setCropCallback(() => callback);
              };
              reader.readAsDataURL(file);
          }
      };
      input.click();
  };

  const handleSendMessage = async () => {
    if (!contactMessage.trim() || !user) return;
    const content = contactMessage.trim();
    setContactMessage('');
    try {
      await dbService.sendMessage(user.uid, user.displayName || 'User', content);
    } catch (err) { console.error("Failed to send message:", err); }
  };

  const handleAdminReply = async (msgId: string) => {
      const reply = replyText[msgId];
      if (!reply?.trim()) return;
      await dbService.replyToMessage(msgId, reply);
      setReplyText(prev => ({ ...prev, [msgId]: '' }));
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="relative">
            <div className="absolute inset-0 bg-brazil-green/30 blur-[60px] animate-pulse rounded-full"></div>
            <Trophy size={80} className="text-brazil-yellow animate-bounce relative z-10" />
        </div>
        <h1 className="text-4xl font-black italic text-white tracking-tighter mt-8">JIRVINHO</h1>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-3xl relative overflow-hidden stagger-in">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-brazil-green/10 rounded-full blur-[50px]"></div>
          <div className="text-center mb-10">
             <div className="w-20 h-20 bg-gradient-to-br from-brazil-green to-brazil-blue rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl mb-6">
                 <Trophy size={40} className="text-brazil-yellow" />
             </div>
             <h2 className="text-4xl font-black text-white italic tracking-tighter mb-2">JIRVINHO</h2>
             <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Elite Sports Maestro</p>
          </div>
          {authError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-2xl mb-6 font-bold">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
             {authMode === 'signup' && (
                <div className="relative"><Smartphone className="absolute left-4 top-4 text-slate-500" size={18}/><input type="text" placeholder="Your Full Name" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-brazil-green outline-none" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required/></div>
             )}
             <div className="relative"><Mail className="absolute left-4 top-4 text-slate-500" size={18}/><input type="email" placeholder="Email Address" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-brazil-green outline-none" value={email} onChange={(e) => setEmail(e.target.value)} required/></div>
             <div className="relative"><Lock className="absolute left-4 top-4 text-slate-500" size={18}/><input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-white focus:border-brazil-green outline-none" value={password} onChange={(e) => setPassword(e.target.value)} required/><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-500">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
             <button type="submit" className="w-full bg-brazil-green text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-green-900/30 active:scale-95 transition-all mt-4">{authMode === 'login' ? 'Enter Arena' : 'Join the Club'}</button>
             <div className="text-center pt-4"><button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-slate-500 hover:text-brazil-green text-[10px] font-black uppercase tracking-widest">{authMode === 'login' ? 'Request Access' : 'Existing Member?'}</button></div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
        {croppingImage && <ImageCropper imageSrc={croppingImage} aspect={16 / 9} onCancel={() => setCroppingImage(null)} onCropComplete={(val) => { cropCallback?.(val); setCroppingImage(null); }}/>}
        
        {/* --- DASHBOARD VIEW --- */}
        {activeTab === 'dashboard' && (
            <div className="space-y-10 pb-20 stagger-in">
                <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 p-10 md:p-14 shadow-3xl">
                   <div className="absolute top-0 right-0 p-12 opacity-[0.03]"><Trophy size={280} className="text-white"/></div>
                   <div className="relative z-10 max-w-2xl">
                      <div className="flex items-center gap-2 mb-4">
                          <div className="px-3 py-1 bg-brazil-yellow/10 border border-brazil-yellow/20 rounded-full flex items-center gap-1.5">
                             <Sparkles size={12} className="text-brazil-yellow"/>
                             <span className="text-brazil-yellow text-[9px] font-black uppercase tracking-widest">Maestro Certified</span>
                          </div>
                      </div>
                      <h1 className="text-5xl md:text-7xl font-black italic text-white mb-6 leading-[0.9] tracking-tighter uppercase">
                         BOM DIA, <br/>
                         <span className="text-transparent bg-clip-text bg-gradient-to-r from-brazil-green to-emerald-400">
                             {user.displayName || 'MAESTRO'}!
                         </span>
                      </h1>
                      <p className="text-slate-400 font-medium text-base md:text-lg max-w-lg leading-relaxed">The arena is live. Every prediction is backed by Maestro's elite data algorithms. Choose your play wisely.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                   <div className="xl:col-span-2"><ImageSlider slides={slides} /></div>
                   <div className="xl:col-span-1"><StatsWidget stats={stats} /></div>
                </div>

                <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
                    {[TipCategory.SINGLE, TipCategory.ODD_2_PLUS, TipCategory.ODD_4_PLUS].map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => setMobileTab(cat)} 
                          className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                            mobileTab === cat 
                              ? 'bg-white text-slate-950 border-white shadow-2xl scale-105' 
                              : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {tips.filter(t => t.category === mobileTab).map(tip => (
                        <TipCard key={tip.id} tip={tip} isAdmin={user.role === UserRole.ADMIN} onVote={handleVote} onVerify={handleAIVerifyTip} />
                    ))}
                    {tips.filter(t => t.category === mobileTab).length === 0 && (
                        <div className="col-span-full text-center py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                            <Target size={48} className="mx-auto text-slate-800 mb-4"/>
                            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No active predictions available</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- INSIGHTS VIEW --- */}
        {activeTab === 'stats' && (
            <div className="stagger-in pb-20">
                <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-brazil-green/10 rounded-2xl"><BarChart3 className="text-brazil-green" size={32}/></div>
                    <h2 className="text-4xl font-black italic text-white tracking-tighter uppercase">Maestro Insights</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                     <div className="glass-panel p-10 rounded-[3rem] shadow-2xl">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">Performance Distribution</h3>
                        <div className="h-72 w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={[
                                { name: 'WON', value: stats.wonTips }, 
                                { name: 'LOSS', value: stats.totalTips - stats.wonTips }, 
                                { name: 'VOID', value: 0 }
                              ]}>
                                 <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false}/>
                                 <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 10, fontWeight: 900}} axisLine={false} tickLine={false}/>
                                 <YAxis hide/>
                                 <Tooltip contentStyle={{backgroundColor: '#020617', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)'}} cursor={{fill: 'rgba(255,255,255,0.05)'}}/>
                                 <Bar dataKey="value" fill="#009c3b" radius={[8, 8, 0, 0]} barSize={50}/>
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                     <div className="bg-gradient-to-br from-brazil-green/20 to-brazil-blue/20 p-10 rounded-[3rem] border border-white/10 flex flex-col justify-center items-center text-center">
                        <Trophy size={64} className="text-brazil-yellow mb-6 shadow-2xl"/>
                        <h4 className="text-3xl font-black text-white italic mb-4">ELITE VERIFIED</h4>
                        <p className="text-slate-400 text-sm leading-relaxed max-sm">Every tip is verified by the Arena Master. We maintain a strict win rate tracking for full transparency.</p>
                     </div>
                </div>
            </div>
        )}

        {/* --- LIVE SCORES VIEW --- */}
        {activeTab === 'scores' && <LiveScoreBoard />}

        {/* --- NEWS VIEW --- */}
        {activeTab === 'news' && (
            <div className="stagger-in pb-20">
                <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-brazil-blue/10 rounded-2xl"><Newspaper className="text-brazil-blue" size={32}/></div>
                    <h2 className="text-4xl font-black italic text-white tracking-tighter uppercase">News</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {news.map(post => (
                        <div key={post.id} className="glass-panel rounded-[2.5rem] overflow-hidden hover:border-white/20 transition-all duration-500 group">
                             <div className="h-56 bg-slate-800 relative overflow-hidden">
                                {post.imageUrl && <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"/>}
                                <div className="absolute top-4 left-4 bg-brazil-green text-white text-[9px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest">{post.category}</div>
                             </div>
                             <div className="p-8">
                                <h3 className="text-xl font-bold text-white mb-4 leading-tight group-hover:text-brazil-yellow transition-colors">{post.title}</h3>
                                <p className="text-slate-400 text-xs line-clamp-3 mb-6 leading-relaxed">{post.body}</p>
                                <button className="text-brazil-green text-[10px] font-black uppercase tracking-widest flex items-center group/btn">
                                    Full Dispatch <ChevronRight size={14} className="ml-2 group-hover/btn:translate-x-1 transition-transform"/>
                                </button>
                             </div>
                        </div>
                    ))}
                    {news.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                            <Newspaper size={48} className="mx-auto text-slate-800 mb-4"/>
                            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No dispatches currently available</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- CHAT VIEW (User) --- */}
        {activeTab === 'contact' && user.role !== UserRole.ADMIN && (
            <div className="fixed inset-x-0 top-20 bottom-24 md:static md:h-[calc(100vh-140px)] flex flex-col stagger-in z-30 px-4 md:px-0 pb-6">
                 <div className="flex-1 glass-panel rounded-[2.5rem] overflow-hidden flex flex-col relative shadow-3xl">
                     <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                        <h2 className="text-xl font-black italic text-white flex items-center gap-3">
                            <MessageSquare className="text-brazil-green" size={24}/> CHAT
                        </h2>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                         {messages.map(msg => (
                             <div key={msg.id} className={`flex flex-col ${msg.userId === user.uid ? 'items-end' : 'items-start'}`}>
                                 <div className={`max-w-[85%] rounded-[1.5rem] p-4 shadow-xl ${msg.userId === user.uid ? 'bg-brazil-green text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                                    <p className="text-sm">{msg.content}</p>
                                    <span className="text-[8px] opacity-40 mt-2 block text-right font-black uppercase">{new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                 </div>
                                 {msg.reply && <div className="mt-2 ml-4 max-w-[85%] bg-brazil-blue/10 border border-brazil-blue/20 p-3 rounded-2xl text-blue-100 text-xs italic">Maestro: {msg.reply}</div>}
                             </div>
                         ))}
                         <div ref={messagesEndRef} />
                     </div>
                     <div className="p-6 bg-white/[0.02] border-t border-white/5">
                        <div className="flex gap-3">
                            <input 
                                type="text" 
                                value={contactMessage} 
                                onChange={(e) => setContactMessage(e.target.value)} 
                                placeholder="Chat with the Maestro..." 
                                className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-brazil-green outline-none transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button onClick={handleSendMessage} className="bg-brazil-green text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"><Send size={24}/></button>
                        </div>
                     </div>
                 </div>
            </div>
        )}

        {/* --- ADMIN DASHBOARD --- */}
        {activeTab === 'admin' && user.role === UserRole.ADMIN && (
            <div className="stagger-in pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brazil-yellow/10 rounded-2xl"><Settings className="text-brazil-yellow" size={32}/></div>
                        <h2 className="text-4xl font-black italic text-white tracking-tighter uppercase">Maestro Control</h2>
                    </div>
                    
                    <div className="flex overflow-x-auto bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 scrollbar-hide">
                        {[
                            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                            { id: 'tips', label: 'Tips', icon: Target },
                            { id: 'news', label: 'News', icon: Newspaper },
                            { id: 'slides', icon: Globe, label: 'Banners' },
                            { id: 'users', label: 'Users', icon: UserCog },
                            { id: 'messages', label: 'Inbox', icon: MessageSquare }
                        ].map(sub => (
                            <button 
                                key={sub.id} 
                                onClick={() => setAdminTab(sub.id as any)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                    adminTab === sub.id ? 'bg-brazil-green text-white shadow-lg' : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <sub.icon size={14}/> {sub.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ADMIN OVERVIEW */}
                {adminTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Win Rate', val: `${stats.winRate}%`, icon: Trophy, color: 'text-brazil-yellow' },
                            { label: 'Total Tips', val: stats.totalTips, icon: Target, color: 'text-blue-500' },
                            { label: 'Total Users', val: allUsers.length, icon: UserCog, color: 'text-purple-500' },
                            { label: 'Unread Msgs', val: messages.filter(m => !m.isRead).length, icon: MessageSquare, color: 'text-red-500' }
                        ].map((stat, i) => (
                            <div key={i} className="glass-panel p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-125 transition-transform duration-500"><stat.icon size={120}/></div>
                                <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-2">{stat.label}</p>
                                <p className={`text-4xl font-black italic ${stat.color}`}>{stat.val}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ADMIN TIPS MANAGEMENT */}
                {adminTab === 'tips' && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                         {/* Tip Form */}
                         <div className="xl:col-span-1 glass-panel p-8 rounded-[2.5rem] border border-white/10 h-fit sticky top-28">
                             <h3 className="text-xl font-black text-white italic mb-8 uppercase flex items-center gap-2">
                                 {editingTipId ? <Edit3 size={20}/> : <Plus size={20}/>} {editingTipId ? 'Refine Tip' : 'Draft New Tip'}
                             </h3>
                             <div className="space-y-5">
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-500 ml-1 mb-1.5 block">Category</label>
                                        <select 
                                            value={newTip.category} 
                                            onChange={(e) => setNewTip({...newTip, category: e.target.value as TipCategory})}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-brazil-green outline-none"
                                        >
                                            {Object.values(TipCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-500 ml-1 mb-1.5 block">League</label>
                                        <select 
                                            value={newTip.league} 
                                            onChange={(e) => setNewTip({...newTip, league: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-brazil-green outline-none"
                                        >
                                            {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                 </div>

                                 <div>
                                     <label className="text-[9px] font-black uppercase text-slate-500 ml-1 mb-1.5 block">Teams / Event Name</label>
                                     <input 
                                        type="text" value={newTip.teams} 
                                        onChange={(e) => setNewTip({...newTip, teams: e.target.value})}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-brazil-green outline-none" 
                                        placeholder="e.g. Brazil vs Argentina"
                                     />
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <label className="text-[9px] font-black uppercase text-slate-500 ml-1 mb-1.5 block">Prediction</label>
                                         <input 
                                            type="text" value={newTip.prediction} 
                                            onChange={(e) => setNewTip({...newTip, prediction: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-brazil-green outline-none" 
                                            placeholder="e.g. Over 2.5"
                                         />
                                     </div>
                                     <div>
                                         <label className="text-[9px] font-black uppercase text-slate-500 ml-1 mb-1.5 block">Odds</label>
                                         <input 
                                            type="number" step="0.01" value={newTip.odds} 
                                            onChange={(e) => setNewTip({...newTip, odds: parseFloat(e.target.value)})}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-brazil-green outline-none" 
                                         />
                                     </div>
                                 </div>

                                 <div>
                                     <label className="text-[9px] font-black uppercase text-slate-500 ml-1 mb-1.5 block">Kickoff Time</label>
                                     <input 
                                        type="datetime-local" value={newTip.kickoffTime} 
                                        onChange={(e) => setNewTip({...newTip, kickoffTime: e.target.value})}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-brazil-green outline-none" 
                                     />
                                 </div>

                                 <div>
                                     <div className="flex justify-between items-center mb-1.5">
                                         <label className="text-[9px] font-black uppercase text-slate-500 ml-1 block">AI Analysis</label>
                                         <button 
                                            onClick={handleAIGenerateAnalysis} 
                                            disabled={isGeneratingAI || !newTip.teams}
                                            className="text-[9px] font-black text-brazil-green uppercase flex items-center gap-1 hover:text-white transition-colors disabled:opacity-30"
                                         >
                                             <Sparkles size={10}/> Generate with Gemini
                                         </button>
                                     </div>
                                     <textarea 
                                        value={newTip.analysis} 
                                        onChange={(e) => setNewTip({...newTip, analysis: e.target.value})}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-brazil-green outline-none h-24 resize-none" 
                                        placeholder="Add expert insight..."
                                     />
                                 </div>

                                 <button 
                                    onClick={handleSaveTip} 
                                    disabled={isSaving || !newTip.teams || !newTip.prediction}
                                    className="w-full bg-brazil-green text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-green-900/30 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                 >
                                     {isSaving ? <RefreshCcw className="animate-spin" size={18}/> : <Check size={18}/>}
                                     {editingTipId ? 'UPDATE ARENA' : 'DEPLOY TIP'}
                                 </button>
                                 
                                 {editingTipId && (
                                     <button 
                                        onClick={() => { setEditingTipId(null); setNewTip({ category: TipCategory.SINGLE, teams: '', league: LEAGUES[0], prediction: '', odds: 1.50, confidence: 'Medium', sport: 'Football', bettingCode: '', legs: [], kickoffTime: '', analysis: '' }); }}
                                        className="w-full bg-slate-800 text-slate-400 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-700 hover:text-white transition-all"
                                     >
                                         Cancel Edit
                                     </button>
                                 )}
                             </div>
                         </div>

                         {/* Tip List (Table-ish) */}
                         <div className="xl:col-span-2 space-y-4">
                             <div className="flex items-center gap-4 mb-4">
                                <Search className="text-slate-600" size={20}/>
                                <input 
                                    type="text" 
                                    placeholder="Search tips..." 
                                    className="flex-1 bg-transparent border-b border-white/5 py-2 text-white outline-none focus:border-brazil-green"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                             </div>
                             
                             {tips.filter(t => t.teams.toLowerCase().includes(searchTerm.toLowerCase())).map(tip => (
                                 <div key={tip.id} className="glass-panel p-6 rounded-[1.5rem] border border-white/5 flex items-center justify-between group">
                                     <div className="flex items-center gap-5">
                                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black italic border ${
                                             tip.status === TipStatus.WON ? 'bg-brazil-green/10 text-brazil-green border-brazil-green/20' :
                                             tip.status === TipStatus.LOST ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                             'bg-slate-800 text-slate-500 border-white/5'
                                         }`}>
                                             {tip.status === TipStatus.WON ? 'W' : tip.status === TipStatus.LOST ? 'L' : '?'}
                                         </div>
                                         <div>
                                             <h4 className="text-white font-black text-sm">{tip.teams}</h4>
                                             <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest">{tip.league} • {tip.prediction}</p>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-2">
                                         {tip.status === TipStatus.PENDING && (
                                            <>
                                                <button onClick={() => handleAIVerifyTip(tip)} title="AI Verify Result" className="p-2.5 bg-brazil-blue/10 text-brazil-blue rounded-xl hover:bg-brazil-blue hover:text-white transition-all"><Sparkles size={16}/></button>
                                                <button onClick={() => dbService.settleTip(tip.id, TipStatus.WON, 'WIN')} className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"><Check size={16}/></button>
                                                <button onClick={() => dbService.settleTip(tip.id, TipStatus.LOST, 'LOSS')} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={16}/></button>
                                            </>
                                         )}
                                         <button onClick={() => { setEditingTipId(tip.id); setNewTip(tip); }} className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-white hover:text-slate-900 transition-all"><Edit3 size={16}/></button>
                                         <button onClick={() => dbService.deleteTip(tip.id)} className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                )}

                {/* ADMIN NEWS MANAGEMENT */}
                {adminTab === 'news' && (
                    <div className="space-y-10">
                        <div className="glass-panel p-10 rounded-[3rem] border border-white/10">
                            <h3 className="text-2xl font-black text-white italic mb-10 uppercase flex items-center gap-3">
                                <Edit3 size={24}/> {editingNewsId ? 'Refine Dispatch' : 'Compose News'}
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block">Article Title</label>
                                        <input 
                                            type="text" value={newNews.title} 
                                            onChange={(e) => setNewNews({...newNews, title: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-brazil-green outline-none" 
                                            placeholder="Breaking headlines..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block">Category</label>
                                            <select 
                                                value={newNews.category} 
                                                onChange={(e) => setNewNews({...newNews, category: e.target.value})}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-brazil-green outline-none"
                                            >
                                                <option value="Football">Football</option>
                                                <option value="Basketball">Basketball</option>
                                                <option value="Maestro Spec">Maestro Exclusive</option>
                                                <option value="Transfer">Transfer News</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block">Source (Optional)</label>
                                            <input 
                                                type="text" value={newNews.source} 
                                                onChange={(e) => setNewNews({...newNews, source: e.target.value})}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-brazil-green outline-none" 
                                                placeholder="e.g. ESPN"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block">Body Text</label>
                                        <textarea 
                                            value={newNews.body} 
                                            onChange={(e) => setNewNews({...newNews, body: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-brazil-green outline-none h-40 resize-none" 
                                            placeholder="Details of the dispatch..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div 
                                        onClick={() => handleImageUpload((b64) => setNewNews(prev => ({ ...prev, imageUrl: b64 })))}
                                        className="h-64 bg-black/40 border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-brazil-green transition-all group relative overflow-hidden"
                                    >
                                        {newNews.imageUrl ? (
                                            <img src={newNews.imageUrl} className="w-full h-full object-cover"/>
                                        ) : (
                                            <>
                                                <UploadCloud className="text-slate-600 group-hover:text-brazil-green transition-colors mb-3" size={48}/>
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Featured Media</span>
                                            </>
                                        )}
                                        {newNews.imageUrl && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-black text-xs uppercase tracking-widest">Change Media</div>}
                                    </div>
                                    
                                    <button 
                                        onClick={async () => {
                                            setIsSaving(true);
                                            if (editingNewsId) await dbService.updateNews({ ...newNews, id: editingNewsId } as NewsPost);
                                            else await dbService.addNews(newNews as Omit<NewsPost, 'id' | 'createdAt'>);
                                            setNewNews({ title: '', category: 'Football', body: '' });
                                            setEditingNewsId(null);
                                            setIsSaving(false);
                                        }}
                                        disabled={isSaving || !newNews.title || !newNews.body}
                                        className="w-full bg-brazil-blue text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isSaving ? <RefreshCcw className="animate-spin"/> : <Check/>}
                                        {editingNewsId ? 'PUBLISH UPDATES' : 'RELEASE DISPATCH'}
                                    </button>
                                    
                                    {editingNewsId && (
                                        <button 
                                            onClick={() => { setEditingNewsId(null); setNewNews({ title: '', category: 'Football', body: '' }); }}
                                            className="w-full py-4 rounded-[2rem] font-bold text-slate-500 uppercase tracking-widest text-xs hover:text-white transition-colors"
                                        >
                                            Cancel Editing
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {news.map(post => (
                                <div key={post.id} className="glass-panel rounded-[2rem] overflow-hidden group border border-white/5">
                                    <div className="h-48 bg-slate-800 relative">
                                        {post.imageUrl && <img src={post.imageUrl} className="w-full h-full object-cover"/>}
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <button onClick={() => { setEditingNewsId(post.id); setNewNews(post); }} className="p-2 bg-white text-slate-900 rounded-lg hover:bg-brazil-green hover:text-white transition-all"><Edit3 size={14}/></button>
                                            <button onClick={() => dbService.deleteNews(post.id)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h4 className="text-white font-black text-lg mb-2 truncate">{post.title}</h4>
                                        <p className="text-slate-500 text-xs line-clamp-2">{post.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ADMIN USERS MANAGEMENT */}
                {adminTab === 'users' && (
                    <div className="glass-panel rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-white/[0.02] border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Profile</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Email Address</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Current Role</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">Arena Access</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {allUsers.map(u => (
                                    <tr key={u.uid} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-white border border-white/5 group-hover:border-brazil-green transition-all uppercase">
                                                    {u.displayName?.charAt(0)}
                                                </div>
                                                <span className="text-sm font-black text-white">{u.displayName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-slate-400 font-mono">{u.email}</td>
                                        <td className="px-8 py-6">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${
                                                u.role === UserRole.ADMIN ? 'text-brazil-yellow border-brazil-yellow/20 bg-brazil-yellow/5' : 'text-slate-500 border-white/10'
                                            }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => dbService.updateUserRole(u.uid, u.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN)}
                                                    className="p-2.5 bg-white/5 text-slate-400 rounded-xl hover:bg-white hover:text-slate-900 transition-all"
                                                    title="Toggle Role"
                                                >
                                                    {u.role === UserRole.ADMIN ? <UserMinus size={18}/> : <UserCheck size={18}/>}
                                                </button>
                                                <button 
                                                    onClick={() => { if(confirm('Eject this user from the Arena?')) dbService.deleteUser(u.uid); }}
                                                    className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                    title="Revoke Access"
                                                >
                                                    <Trash2 size={18}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ADMIN MESSAGES MANAGEMENT */}
                {adminTab === 'messages' && (
                    <div className="flex flex-col h-[700px] glass-panel rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
                         <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
                            {messages.map(msg => (
                                <div key={msg.id} className="flex flex-col items-start max-w-4xl">
                                     <div className="flex items-center gap-3 mb-3">
                                         <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-white">{msg.userName.charAt(0)}</div>
                                         <div>
                                             <span className="text-xs font-black text-white uppercase tracking-widest">{msg.userName}</span>
                                             <span className="text-[9px] text-slate-500 ml-3">{new Date(msg.createdAt).toLocaleString()}</span>
                                         </div>
                                     </div>
                                     <div className="bg-slate-800 p-6 rounded-[1.5rem] rounded-tl-none border border-white/5 shadow-xl w-full">
                                         <p className="text-slate-200 text-sm leading-relaxed mb-6">{msg.content}</p>
                                         
                                         {msg.reply ? (
                                             <div className="bg-brazil-green/10 border border-brazil-green/20 p-5 rounded-2xl flex items-start gap-4">
                                                 <Trophy size={16} className="text-brazil-green mt-0.5"/>
                                                 <div>
                                                     <p className="text-[9px] font-black text-brazil-green uppercase tracking-widest mb-1">Maestro's Answer</p>
                                                     <p className="text-xs text-slate-300 italic">"{msg.reply}"</p>
                                                 </div>
                                             </div>
                                         ) : (
                                             <div className="flex gap-3">
                                                 <input 
                                                     type="text" 
                                                     placeholder="Your official response..." 
                                                     value={replyText[msg.id] || ''} 
                                                     onChange={(e) => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                                     className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-brazil-green transition-all"
                                                     onKeyDown={(e) => e.key === 'Enter' && handleAdminReply(msg.id)}
                                                 />
                                                 <button onClick={() => handleAdminReply(msg.id)} className="bg-brazil-green text-white px-5 rounded-xl shadow-lg active:scale-95 transition-all"><Send size={18}/></button>
                                             </div>
                                         )}
                                     </div>
                                     <button onClick={() => dbService.deleteMessage(msg.id)} className="mt-2 text-[9px] font-black text-slate-600 uppercase hover:text-red-500 transition-colors ml-2">Archive Thread</button>
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20">
                                    <MessageSquare size={120}/>
                                    <p className="text-2xl font-black uppercase tracking-[0.3em] mt-8 italic">No Incoming Signals</p>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                         </div>
                    </div>
                )}

                {/* ADMIN SLIDES (BANNERS) */}
                {adminTab === 'slides' && (
                    <div className="space-y-10">
                        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row gap-10 items-center">
                            <div 
                                onClick={() => handleImageUpload((b64) => setNewSlide(prev => ({ ...prev, image: b64 })))}
                                className="w-full md:w-80 aspect-video bg-black/40 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-brazil-green transition-all group overflow-hidden shrink-0"
                            >
                                {newSlide.image ? (
                                    <img src={newSlide.image} className="w-full h-full object-cover"/>
                                ) : (
                                    <>
                                        <ImageIcon className="text-slate-600 mb-2" size={32}/>
                                        <span className="text-[9px] font-black uppercase text-slate-500">Banner Asset</span>
                                    </>
                                )}
                            </div>
                            <div className="flex-1 space-y-4 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input 
                                        type="text" value={newSlide.title} 
                                        onChange={(e) => setNewSlide({...newSlide, title: e.target.value})}
                                        className="bg-black/40 border border-white/5 rounded-xl px-5 py-3 text-white focus:border-brazil-green outline-none text-sm" 
                                        placeholder="Banner Title"
                                    />
                                    <input 
                                        type="text" value={newSlide.subtitle} 
                                        onChange={(e) => setNewSlide({...newSlide, subtitle: e.target.value})}
                                        className="bg-black/40 border border-white/5 rounded-xl px-5 py-3 text-white focus:border-brazil-green outline-none text-sm" 
                                        placeholder="Banner Subtitle"
                                    />
                                </div>
                                <button 
                                    onClick={async () => {
                                        setIsSaving(true);
                                        await dbService.addSlide(newSlide);
                                        setNewSlide({ title: '', subtitle: '', image: '' });
                                        setIsSaving(false);
                                    }}
                                    disabled={isSaving || !newSlide.image}
                                    className="w-full bg-brazil-green text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <RefreshCcw className="animate-spin" size={16}/> : <Plus size={16}/>} Deploy Banner
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {slides.map(s => (
                                <div key={s.id} className="glass-panel rounded-[2rem] overflow-hidden group border border-white/5 aspect-video relative">
                                    <img src={s.image} className="w-full h-full object-cover"/>
                                    <div className="absolute inset-0 bg-black/60 p-6 flex flex-col justify-end">
                                        <h4 className="text-white font-black italic uppercase tracking-tighter text-lg">{s.title}</h4>
                                        <p className="text-slate-400 text-xs font-medium">{s.subtitle}</p>
                                    </div>
                                    <button 
                                        onClick={() => dbService.deleteSlide(s.id)}
                                        className="absolute top-4 right-4 p-2.5 bg-red-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
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

const ImageIcon: React.FC<{className?: string, size?: number}> = ({className, size=24}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </svg>
);
