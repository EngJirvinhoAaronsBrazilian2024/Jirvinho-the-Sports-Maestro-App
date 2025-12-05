import React from 'react';
import { LogOut, LayoutDashboard, Newspaper, Settings, BarChart3, ChevronLeft, MessageSquare, Activity } from 'lucide-react';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, setActiveTab }) => {
  const handleBack = () => {
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-950 p-4 flex justify-between items-center border-b border-slate-800 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
            {activeTab !== 'dashboard' && (
                <button onClick={handleBack} className="text-slate-300 hover:text-white p-1 -ml-2">
                    <ChevronLeft size={28} />
                </button>
            )}
            <div className="flex flex-col">
                <h1 className="text-xl font-black italic tracking-tighter bg-gradient-to-r from-brazil-green to-brazil-yellow bg-clip-text text-transparent leading-none">
                JIRVINHO
                </h1>
                <span className="text-[10px] font-bold text-white tracking-widest mt-1">THE SPORTS MAESTRO</span>
            </div>
        </div>
        
        {user && (
          <button onClick={onLogout} className="text-slate-400 hover:text-white p-2">
            <LogOut size={20} />
          </button>
        )}
      </div>

      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className="fixed bottom-0 w-full md:relative md:w-64 md:h-screen bg-slate-950 border-t md:border-t-0 md:border-r border-slate-800 flex md:flex-col justify-between z-40 pb-safe md:pb-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] md:shadow-none">
        <div className="md:p-6 flex flex-row md:flex-col w-full md:space-y-8 overflow-x-auto md:overflow-visible no-scrollbar">
           <div className="hidden md:block">
            <h1 className="text-2xl font-black italic tracking-tighter text-white">
              JIRVINHO
              <span className="block text-sm font-normal text-brazil-yellow not-italic tracking-normal">The Sports Maestro</span>
            </h1>
           </div>

           {/* Navigation Items Container */}
           <div className="flex flex-row md:flex-col min-w-full md:min-w-0 md:space-y-2 p-2 md:p-0 items-center md:items-stretch justify-between md:justify-start gap-1 md:gap-2">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 md:flex-none p-2 md:p-3 rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 transition-colors ${activeTab === 'dashboard' ? 'bg-slate-800 text-brazil-yellow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <LayoutDashboard size={22} className="md:w-6 md:h-6" />
                <span className="text-[10px] md:text-base mt-1 md:mt-0 font-medium whitespace-nowrap">Tips</span>
              </button>

              <button 
                onClick={() => setActiveTab('scores')}
                className={`flex-1 md:flex-none p-2 md:p-3 rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 transition-colors relative ${activeTab === 'scores' ? 'bg-slate-800 text-brazil-yellow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <div className="relative">
                  <Activity size={22} className="md:w-6 md:h-6" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-slate-950"></span>
                </div>
                <span className="text-[10px] md:text-base mt-1 md:mt-0 font-medium whitespace-nowrap">Scores</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('stats')}
                className={`flex-1 md:flex-none p-2 md:p-3 rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 transition-colors ${activeTab === 'stats' ? 'bg-slate-800 text-brazil-yellow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <BarChart3 size={22} className="md:w-6 md:h-6" />
                <span className="text-[10px] md:text-base mt-1 md:mt-0 font-medium whitespace-nowrap">Stats</span>
              </button>

              <button 
                 onClick={() => setActiveTab('news')}
                 className={`flex-1 md:flex-none p-2 md:p-3 rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 transition-colors ${activeTab === 'news' ? 'bg-slate-800 text-brazil-yellow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Newspaper size={22} className="md:w-6 md:h-6" />
                <span className="text-[10px] md:text-base mt-1 md:mt-0 font-medium whitespace-nowrap">News</span>
              </button>

              <button 
                onClick={() => setActiveTab('contact')}
                className={`flex-1 md:flex-none p-2 md:p-3 rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 transition-colors ${activeTab === 'contact' ? 'bg-slate-800 text-brazil-yellow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <MessageSquare size={22} className="md:w-6 md:h-6" />
                <span className="text-[10px] md:text-base mt-1 md:mt-0 font-medium whitespace-nowrap">{user?.role === UserRole.ADMIN ? 'Msgs' : 'Chat'}</span>
              </button>

              {user?.role === UserRole.ADMIN && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`flex-1 md:flex-none p-2 md:p-3 rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 transition-colors ${activeTab === 'admin' ? 'bg-slate-800 text-brazil-yellow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Settings size={22} className="md:w-6 md:h-6" />
                  <span className="text-[10px] md:text-base mt-1 md:mt-0 font-medium whitespace-nowrap">Panel</span>
                </button>
              )}
           </div>
        </div>

        {/* Desktop Logout */}
        <div className="hidden md:block p-6">
          {user ? (
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-8 h-8 rounded-full bg-brazil-green flex items-center justify-center text-xs font-bold text-white">
                {user.displayName?.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user.role}</p>
              </div>
              <button onClick={onLogout} className="text-slate-400 hover:text-red-400">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="w-full bg-brazil-green hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
              Login
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {activeTab !== 'dashboard' && (
             <button onClick={handleBack} className="hidden md:flex items-center text-slate-400 hover:text-white mb-4 transition-colors">
                 <ChevronLeft size={20} className="mr-1"/> Back to Dashboard
             </button>
        )}
        {children}
      </main>
    </div>
  );
};