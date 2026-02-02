import React from 'react';
import { LogOut, LayoutDashboard, Newspaper, Settings, BarChart3, MessageSquare, Activity, Trophy, ShieldCheck } from 'lucide-react';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, setActiveTab }) => {
  
  const navItems = [
    { id: 'dashboard', label: 'Arena', icon: LayoutDashboard },
    { id: 'stats', label: 'Insights', icon: BarChart3 },
    { id: 'scores', label: 'Live', icon: Activity },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'contact', label: user?.role === UserRole.ADMIN ? 'Inbox' : 'Chat', icon: MessageSquare },
    ...(user?.role === UserRole.ADMIN ? [{ id: 'admin', label: 'Control', icon: Settings }] : [])
  ];

  return (
    <div className="min-h-screen text-slate-100 pb-24 md:pb-0">
      
      {/* --- PREMIUM TOP HEADER --- */}
      <header className="fixed top-0 inset-x-0 z-[60] glass-panel h-20 flex items-center justify-between px-6 md:px-12 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div 
          className="flex items-center gap-4 group cursor-pointer transition-all duration-300 active:scale-95" 
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-brazil-green blur-xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
            <div className="relative w-11 h-11 bg-gradient-to-br from-brazil-green via-green-700 to-brazil-blue rounded-2xl flex items-center justify-center shadow-xl border border-white/10 transform group-hover:rotate-6 transition-all duration-500">
               <Trophy size={22} className="text-brazil-yellow drop-shadow-md" />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-[900] italic tracking-tighter text-white leading-none">
              JIRVINHO
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-brazil-yellow animate-pulse"></div>
                <span className="text-[10px] font-black text-brazil-yellow tracking-[0.25em] uppercase opacity-90">Elite Maestro</span>
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center space-x-1.5 bg-white/5 p-1 rounded-2xl border border-white/5">
           {navItems.map(item => {
             const isActive = activeTab === item.id;
             return (
               <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm group ${
                      isActive 
                      ? 'bg-gradient-to-r from-brazil-green to-emerald-600 text-white shadow-lg shadow-green-500/20 scale-105' 
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
               >
                  <item.icon size={18} className={`${isActive ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                  <span>{item.label}</span>
               </button>
             );
           })}
        </div>

        {/* User Profile Section */}
        <div className="flex items-center gap-4">
            {user ? (
                <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                    <div className="hidden lg:block text-right">
                        <p className="text-sm font-black text-white leading-none">{user.displayName}</p>
                        <p className="text-[9px] text-brazil-green font-black uppercase mt-1 tracking-widest">{user.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-black text-white shadow-xl relative group cursor-pointer hover:border-brazil-green transition-all">
                        {user.displayName?.charAt(0).toUpperCase()}
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brazil-green rounded-full border-2 border-slate-950"></div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="text-slate-500 hover:text-red-500 transition-all p-2 rounded-lg"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            ) : (
                <button className="bg-brazil-green hover:bg-emerald-500 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest">
                    Enter Arena
                </button>
            )}
        </div>
      </header>

      {/* --- MOBILE NAVIGATION --- */}
      <nav className="md:hidden fixed bottom-6 inset-x-4 z-50 glass-panel rounded-[2.5rem] h-20 flex items-center justify-around px-2 shadow-2xl">
        {navItems.map(item => {
           const isActive = activeTab === item.id;
           return (
               <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-500 relative`}
               >
                  <div className={`p-2.5 rounded-2xl transition-all duration-500 ${
                      isActive 
                      ? 'bg-gradient-to-b from-brazil-green to-emerald-700 text-white shadow-xl -translate-y-4 scale-125 border border-white/20' 
                      : 'text-slate-500'
                  }`}>
                    <item.icon size={22} className={isActive ? 'animate-active-bounce' : ''} />
                  </div>
                  <span className={`text-[9px] font-black tracking-widest transition-all duration-300 uppercase ${isActive ? 'text-white translate-y-[-8px]' : 'text-slate-500 opacity-70'}`}>
                      {item.label}
                  </span>
               </button>
           );
        })}
      </nav>

      {/* --- MAIN STAGE --- */}
      <main className="pt-28 px-4 md:px-12 max-w-7xl mx-auto">
           {children}
      </main>

    </div>
  );
};