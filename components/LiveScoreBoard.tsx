import React, { useEffect, useState } from 'react';
import { liveScoreService, LiveMatch } from '../services/liveScoreService';
import { RefreshCw, Clock, Trophy, Activity } from 'lucide-react';

export const LiveScoreBoard: React.FC = () => {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchScores = async () => {
    setLoading(true);
    try {
      const data = await liveScoreService.getLiveMatches();
      setMatches(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch scores", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchScores, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE': return 'text-red-500 animate-pulse';
      case 'HT': return 'text-orange-400';
      case 'FT': return 'text-slate-500';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-black italic text-white flex items-center gap-2">
          <Activity className="text-brazil-green" /> LIVE SCORES
        </h2>
        <button 
          onClick={fetchScores} 
          disabled={loading}
          className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid gap-4">
        {matches.map((match) => (
          <div key={match.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
            {/* Live Indicator Strip */}
            {match.status === 'LIVE' && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600"></div>
            )}
            
            {/* Status & Time */}
            <div className="flex flex-col items-center justify-center w-16 mr-4">
              <span className={`text-xs font-black ${getStatusColor(match.status)}`}>
                {match.status === 'LIVE' ? `${match.minute}'` : match.status}
              </span>
              {match.status === 'LIVE' && <span className="w-2 h-2 bg-red-500 rounded-full animate-ping mt-1"></span>}
            </div>

            {/* Match Details */}
            <div className="flex-1 flex items-center justify-between gap-4">
              {/* Home Team */}
              <div className="flex-1 text-right">
                <span className="text-white font-bold text-sm md:text-lg">{match.homeTeam}</span>
              </div>

              {/* Score */}
              <div className="bg-slate-950 px-4 py-2 rounded-xl border border-white/5 font-mono text-xl md:text-2xl font-black text-white tracking-widest min-w-[80px] text-center">
                 {match.status === 'NS' ? 'vs' : `${match.homeScore} - ${match.awayScore}`}
              </div>

              {/* Away Team */}
              <div className="flex-1 text-left">
                <span className="text-white font-bold text-sm md:text-lg">{match.awayTeam}</span>
              </div>
            </div>

            {/* League Label (Desktop) */}
            <div className="hidden md:block absolute top-2 right-4">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{match.league}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center text-xs text-slate-600 mt-4">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
};
