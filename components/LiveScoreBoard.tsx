import React from 'react';
import { LiveMatch, MatchStatus } from '../types';
import { Clock, Trophy, AlertCircle } from 'lucide-react';

interface LiveScoreBoardProps {
  matches: LiveMatch[];
  loading: boolean;
}

export const LiveScoreBoard: React.FC<LiveScoreBoardProps> = ({ matches, loading }) => {
  const [filter, setFilter] = React.useState<'ALL' | 'LIVE' | 'FINISHED'>('ALL');

  const filteredMatches = matches.filter(m => {
      if (filter === 'LIVE') return m.status === 'LIVE';
      if (filter === 'FINISHED') return m.status === 'FINISHED';
      return true;
  });

  const getStatusColor = (status: MatchStatus) => {
      switch(status) {
          case 'LIVE': return 'text-brazil-green animate-pulse';
          case 'FINISHED': return 'text-slate-500';
          case 'UPCOMING': return 'text-slate-400';
          case 'HT': return 'text-brazil-yellow';
          default: return 'text-white';
      }
  };

  const formatStatus = (match: LiveMatch) => {
      if (match.status === 'LIVE') return `${match.minute}'`;
      if (match.status === 'HT') return 'HT';
      if (match.status === 'FINISHED') return 'FT';
      if (match.status === 'UPCOMING') return new Date(match.kickoffTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      return match.status;
  };

  if (loading) {
      return (
          <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brazil-yellow"></div>
          </div>
      );
  }

  // Group by League
  const matchesByLeague = filteredMatches.reduce((groups, match) => {
      if (!groups[match.league]) groups[match.league] = [];
      groups[match.league].push(match);
      return groups;
  }, {} as Record<string, LiveMatch[]>);

  return (
    <div className="space-y-6">
       {/* Filter Tabs */}
       <div className="flex space-x-2 bg-slate-900/50 p-1 rounded-lg w-full md:w-fit overflow-x-auto">
           {['ALL', 'LIVE', 'FINISHED'].map(f => (
               <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
               >
                   {f === 'LIVE' && <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>}
                   {f}
               </button>
           ))}
       </div>

       {Object.keys(matchesByLeague).length === 0 ? (
           <div className="text-center py-12 text-slate-500 bg-slate-800/50 rounded-2xl border border-slate-700/50">
               <Trophy size={48} className="mx-auto mb-3 opacity-20"/>
               <p>No matches found for this filter.</p>
           </div>
       ) : (
           Object.entries(matchesByLeague).map(([league, leagueMatches]) => (
               <div key={league} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                   <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-700 flex items-center">
                       <span className="w-1 h-4 bg-brazil-yellow rounded mr-3"></span>
                       <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">{league}</h3>
                   </div>
                   <div className="divide-y divide-slate-700/50">
                       {leagueMatches.map(match => (
                           <div key={match.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                               <div className="flex items-center justify-between">
                                   {/* Status / Time */}
                                   <div className={`w-12 text-center text-xs font-bold ${getStatusColor(match.status)}`}>
                                       {formatStatus(match)}
                                   </div>

                                   {/* Teams */}
                                   <div className="flex-1 px-4">
                                       <div className="flex justify-between items-center mb-2">
                                           <div className="flex items-center space-x-2">
                                               <span className={`text-sm md:text-base font-medium ${match.status !== 'UPCOMING' && match.homeScore > match.awayScore ? 'text-white font-bold' : 'text-slate-300'}`}>
                                                   {match.homeTeam}
                                               </span>
                                           </div>
                                           <span className="text-lg font-bold text-white">{match.status === 'UPCOMING' ? '-' : match.homeScore}</span>
                                       </div>
                                       <div className="flex justify-between items-center">
                                           <div className="flex items-center space-x-2">
                                               <span className={`text-sm md:text-base font-medium ${match.status !== 'UPCOMING' && match.awayScore > match.homeScore ? 'text-white font-bold' : 'text-slate-300'}`}>
                                                   {match.awayTeam}
                                               </span>
                                           </div>
                                           <span className="text-lg font-bold text-white">{match.status === 'UPCOMING' ? '-' : match.awayScore}</span>
                                       </div>
                                   </div>

                                   {/* Live Events Indicator */}
                                   {match.events.length > 0 && match.status === 'LIVE' && (
                                       <div className="hidden md:block w-32 border-l border-slate-700 pl-4">
                                           {match.events.slice(-2).reverse().map((ev, i) => (
                                               <div key={i} className="text-[10px] text-slate-400 mb-1 flex items-center">
                                                   {ev.type === 'goal' ? '⚽' : '🟥'} {ev.minute}' {ev.player}
                                               </div>
                                           ))}
                                       </div>
                                   )}
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           ))
       )}
    </div>
  );
};