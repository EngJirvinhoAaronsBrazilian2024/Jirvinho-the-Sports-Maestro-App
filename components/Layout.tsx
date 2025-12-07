
import React, { useState } from 'react';
import { LogOut, LayoutDashboard, Newspaper, Settings, BarChart3, MessageSquare, Activity, Menu, X } from 'lucide-react';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Tips', icon: LayoutDashboard },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'scores', label: 'Scores', icon: Activity },
    { id: 'contact', label: user?.role === UserRole.ADMIN ? 'Msgs' : 'Chat', icon: MessageSquare },
    ...(user?.role === UserRole.ADMIN ? [{ id: 'admin', label: 'Panel', icon: Settings }] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-950 p-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30 h-16 shrink-0">
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="text-slate-300 hover:text-white p-1 rounded-lg active:bg-slate-800 transition-colors"
            >
                <Menu size={28} />
            </button>
            <div className="flex flex-col">
                <h1 className="text-xl font-black italic tracking-tighter bg-gradient-to-r from-brazil-green to-brazil-yellow bg-clip-text text-transparent leading-none">
                JIRVINHO
                </h1>
            </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-brazil-yellow">
            {user?.displayName?.charAt(0).toUpperCase() || 'J'}
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <nav className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 transform transition-transform duration-300 ease-out shadow-2xl
        md:relative md:translate-x-0 md:flex md:flex-col md:w-64 md:shadow-none md:h-screen
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
         {/* Sidebar Header */}
         <div className="p-6 flex justify-between items-center h-20 md:h-auto border-b border-slate-900 md:border-none shrink-0">
             <div>
                <h1 className="text-2xl font-black italic tracking-tighter text-white">
                JIRVINHO
                <span className="block text-sm font-normal text-brazil-yellow not-italic tracking-normal">The Sports Maestro</span>
                </h1>
             </div>
             <button 
                onClick={() => setIsSidebarOpen(false)} 
                className="md:hidden text-slate-400 hover:text-white p-2"
             >
                <X size={24} />
             </button>
         </div>

         {/* Nav Links */}
         <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
             {navItems.map(item => (
                 <button
                    key={item.id}
                    onClick={() => {
                        setActiveTab(item.id);
                        setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                        activeTab === item.id 
                        ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-brazil-yellow border border-slate-700 shadow-lg' 
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                 >
                    <item.icon size={22} className={`transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-brazil-green' : ''}`} />
                    <span className="font-semibold tracking-wide">{item.label}</span>
                 </button>
             ))}
         </div>

         {/* Sidebar Footer (Logout) */}
         <div className="p-4 border-t border-slate-800 bg-slate-950/50 pb-safe md:pb-4 shrink-0">
            {user ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-brazil-green flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-green-900/20 shrink-0">
                        {user.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-500 truncate tracking-wider">{user.role}</p>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            ) : (
                <button className="w-full bg-brazil-green hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 transition-all">
                    Sign In
                </button>
            )}
         </div>
      </nav>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen w-full bg-slate-900 p-4 md:p-8 relative">
           {children}
      </main>
    </div>
  );
};
