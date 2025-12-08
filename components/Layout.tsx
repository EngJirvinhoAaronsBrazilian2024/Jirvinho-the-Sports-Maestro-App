
import React from 'react';
import { LogOut, LayoutDashboard, Newspaper, Settings, BarChart3, MessageSquare, Activity, Trophy, Menu } from 'lucide-react';
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
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'scores', label: 'Live', icon: Activity },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'contact', label: user?.role === UserRole.ADMIN ? 'Inbox' : 'Chat', icon: MessageSquare },
    ...(user?.role === UserRole.ADMIN ? [{ id: 'admin', label: 'Admin', icon: Settings }] : [])
  ];

  return (
    <div className="min-h-screen bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-20 text-slate-100 font-sans selection:bg-brazil-green selection:text-white pb-24 md:pb-0">
      
      {/* --- DESKTOP & MOBILE TOP HEADER --- */}
      <header className="fixed top-0 inset-x-0 z-40 glass-panel h-20 flex items-center justify-between px-4 md:px-8 shadow-2xl transition-all duration-300">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="relative">
            <div className="absolute inset-0 bg-brazil-green blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-full"></div>
            <div className="relative w-11 h-11 bg-gradient-to-br from-brazil-green to-blue-900 rounded-2xl flex items-center justify-center shadow-inner border border-white/10 transform group-hover:rotate-6 transition-transform duration-300">
               <Trophy size={22} className="text-brazil-yellow drop-shadow-md" />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none drop-shadow-sm">
              JIRVINHO
            </h1>
            <span className="text-[10px] md:text-xs font-bold text-brazil-yellow tracking-[0.2em] uppercase opacity-90">Sports Maestro</span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-900/40 p-1.5 rounded-full border border-white/5 backdrop-blur-md">
           {navItems.map(item => (
             <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-full transition-all duration-300 font-bold text-sm ${
                    activeTab === item.id 
                    ? 'bg-gradient-to-r from-brazil-green to-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] transform scale-105' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
             >
                <item.icon size={18} strokeWidth={activeTab === item.id ? 3 : 2} />
                <span>{item.label}</span>
             </button>
           ))}
        </div>

        {/* User Profile / Logout */}
        <div className="flex items-center gap-4">
            {user ? (
                <div className="flex items-center gap-4 pl-6 border-l border-white/5">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-bold text-white leading-none">{user.displayName}</p>
                        <p className="text-[10px] text-brazil-green font-bold uppercase mt-1 tracking-wider">{user.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-b from-slate-700 to-slate-800 border-2 border-white/10 flex items-center justify-center text-sm font-bold text-white shadow-lg relative">
                        {user.displayName?.charAt(0).toUpperCase()}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-brazil-green rounded-full border-2 border-slate-900"></div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2.5 hover:bg-red-500/10 rounded-xl"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            ) : (
                <button className="bg-brazil-green hover:bg-green-600 text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-lg shadow-green-900/20 transition-all hover:scale-105">
                    Login
                </button>
            )}
        </div>
      </header>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="md:hidden fixed bottom-6 inset-x-4 z-50 glass-panel rounded-2xl h-[70px] flex items-center justify-around px-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10">
        {navItems.map(item => {
           const isActive = activeTab === item.id;
           return (
               <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative group`}
               >
                  <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                      isActive 
                      ? 'bg-brazil-green text-white shadow-lg shadow-green-500/30 -translate-y-4 scale-110' 
                      : 'text-slate-500 group-hover:text-white'
                  }`}>
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[9px] font-bold tracking-wide transition-opacity duration-300 ${isActive ? 'text-white opacity-100 translate-y-[-8px]' : 'text-slate-500 opacity-0 group-hover:opacity-100'}`}>
                      {item.label}
                  </span>
               </button>
           );
        })}
      </nav>

      {/* --- CONTENT AREA --- */}
      <main className="pt-24 px-4 md:px-8 max-w-7xl mx-auto min-h-[calc(100vh-80px)] animate-in fade-in duration-500">
           {children}
      </main>

    </div>
  );
};
