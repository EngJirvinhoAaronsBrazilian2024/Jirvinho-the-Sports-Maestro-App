import React, { useEffect, useState } from 'react';
import { Activity, Maximize2, X } from 'lucide-react';

export const LiveScoreBoard: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Inject the ScoreBat script required for the iframe to function correctly
    const script = document.createElement('script');
    script.src = "//www.scorebat.com/embed/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      try {
        if (document.body.contains(script)) {
            document.body.removeChild(script);
        }
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  // Lock body scroll when expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  return (
    <div className={`transition-all duration-300 ease-in-out ${
      isExpanded 
        ? 'fixed inset-0 z-[100] bg-slate-950 p-0 flex flex-col' 
        : 'space-y-6 animate-in fade-in duration-700'
    }`}>
      
      {/* Header Section */}
      <div className={`flex items-center justify-between ${
        isExpanded 
          ? 'p-4 bg-slate-900 border-b border-white/10 shadow-lg shrink-0' 
          : 'mb-2'
      }`}>
        <h2 className={`${isExpanded ? 'text-lg' : 'text-2xl'} font-black italic text-white flex items-center gap-2 transition-all`}>
          <Activity className="text-brazil-green" size={isExpanded ? 20 : 28} /> 
          LIVE SCORES
        </h2>
        
        <div className="flex items-center gap-3">
          {!isExpanded && (
            <span className="hidden md:inline-block text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                Powered by ScoreBat
            </span>
          )}
          <button 
             onClick={() => setIsExpanded(!isExpanded)}
             className={`p-2 rounded-full transition-all active:scale-95 border border-white/10 ${
               isExpanded 
                 ? 'bg-slate-800 text-white hover:bg-slate-700' 
                 : 'bg-slate-800 text-brazil-yellow hover:bg-slate-700 hover:text-white'
             }`}
             title={isExpanded ? "Close Fullscreen" : "Fullscreen"}
          >
             {isExpanded ? <X size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className={`transition-all duration-300 ${
        isExpanded
          ? 'flex-1 w-full bg-slate-950 overflow-hidden'
          : 'bg-slate-900 rounded-3xl p-1 md:p-2 border border-slate-800 shadow-2xl overflow-hidden relative'
      }`}>
         <div className={`w-full h-full bg-slate-950 overflow-hidden ${isExpanded ? '' : 'rounded-2xl min-h-[800px]'}`}>
            <iframe 
                src="https://www.scorebat.com/embed/livescore/" 
                frameBorder="0" 
                width="600" 
                height="760" 
                allowFullScreen 
                allow="autoplay; fullscreen" 
                style={{ 
                  width: '100%', 
                  height: isExpanded ? '100%' : '800px', 
                  overflow: 'hidden', 
                  display: 'block' 
                }} 
                className="_scorebat_embedded_iframe"
                title="Live Scores Widget"
            />
         </div>
      </div>
    </div>
  );
};