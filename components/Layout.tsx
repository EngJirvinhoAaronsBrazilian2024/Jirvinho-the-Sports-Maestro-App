import React from 'react';
import { LogOut, LayoutDashboard, Newspaper, Settings, BarChart3, MessageSquare, Activity, Trophy } from 'lucide-react';
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
    { id: 'dashboard', label: 'Tips', icon: LayoutDashboard },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'scores', label: 'Scores', icon: Activity },
    { id: 'contact', label: user?.role === UserRole.ADMIN ? 'Msgs' : 'Chat', icon: MessageSquare },
    ...(user?.role === UserRole.ADMIN ? [{ id: 'admin', label: 'Admin', icon: Settings }] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brazil-green selection:text-white pb-20 md:pb-0">
      
      {/* --- DESKTOP & MOBILE TOP HEADER --- */}
      <header className="fixed top-0 inset-x-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-4 md:px-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brazil-green to-blue-900 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20 transform rotate-3">
             <Trophy size={20} className="text-brazil-yellow" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-black italic tracking-tighter text-white leading-none">
              JIRVINHO
            </h1>
            <span className="text-[10px] md:text-xs font-bold text-brazil-yellow tracking-widest uppercase">The Sports Maestro</span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center space-x-1 bg-slate-900/50 p-1 rounded-full border border-white/5">
           {navItems.map(item => (
             <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-5 py-2 rounded-full transition-all duration-300 font-bold text-sm ${
                    activeTab === item.id 
                    ? 'bg-gradient-to-r from-brazil-green to-green-600 text-white shadow-lg shadow-green-900/40' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
             >
                <item.icon size={16} />
                <span>{item.label}</span>
             </button>
           ))}
        </div>

        {/* User Profile / Logout */}
        <div className="flex items-center gap-4">
            {user ? (
                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-bold text-white leading-none">{user.displayName}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{user.role}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-brazil-green flex items-center justify-center text-xs font-bold text-white shadow shadow-green-500/30">
                        {user.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <button 
                        onClick={onLogout}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            ) : (
                <button className="bg-brazil-green hover:bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                    Login
                </button>
            )}
        </div>
      </header>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 h-[72px] pb-safe flex items-center justify-around px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {navItems.map(item => {
           const isActive = activeTab === item.id;
           return (
               <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative group ${
                      isActive ? 'text-brazil-yellow' : 'text-slate-500'
                  }`}
               >
                  {/* Active Indicator Light */}
                  {isActive && <div className="absolute top-0 w-8 h-1 bg-brazil-yellow rounded-b-full shadow-[0_0_10px_#ffdf00]"></div>}
                  
                  <div className={`p-1.5 rounded-xl transition-transform duration-300 ${isActive ? 'bg-white/5 -translate-y-1' : 'group-active:scale-95'}`}>
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                      {item.label}
                  </span>
               </button>
           );
        })}
      </nav>

      {/* --- CONTENT AREA --- */}
      <main className="pt-20 px-4 md:px-8 max-w-7xl mx-auto min-h-[calc(100vh-80px)] animate-in fade-in duration-500">
           {children}
      </main>

    </div>
  );
};