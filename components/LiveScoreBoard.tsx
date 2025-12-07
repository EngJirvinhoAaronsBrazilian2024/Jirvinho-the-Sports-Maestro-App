import React, { useEffect } from 'react';
import { Activity } from 'lucide-react';

export const LiveScoreBoard: React.FC = () => {
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

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-black italic text-white flex items-center gap-2">
          <Activity className="text-brazil-green" /> LIVE SCORES
        </h2>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            Powered by ScoreBat
        </span>
      </div>

      <div className="bg-slate-900 rounded-3xl p-1 md:p-2 border border-slate-800 shadow-2xl overflow-hidden relative">
         <div className="w-full h-full min-h-[800px] bg-slate-950 rounded-2xl overflow-hidden">
            <iframe 
                src="https://www.scorebat.com/embed/livescore/" 
                frameBorder="0" 
                width="600" 
                height="760" 
                allowFullScreen 
                allow="autoplay; fullscreen" 
                style={{ width: '100%', height: '800px', overflow: 'hidden', display: 'block' }} 
                className="_scorebat_embedded_iframe"
                title="Live Scores Widget"
            />
         </div>
      </div>
    </div>
  );
};