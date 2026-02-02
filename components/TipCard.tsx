import React from 'react';
import { Clock, CheckCircle2, XCircle, MinusCircle, ThumbsUp, ThumbsDown, Copy, Check, List, ShieldCheck, Wand2, Edit3, Sparkles, TrendingUp } from 'lucide-react';
import { Tip, TipStatus } from '../types';

interface TipCardProps {
  tip: Tip;
  isAdmin?: boolean;
  onSettle?: (id: string, status: TipStatus, score: string) => void;
  onDelete?: (id: string) => void;
  onVote?: (id: string, type: 'agree' | 'disagree') => void;
  onVerify?: (tip: Tip) => void;
  onEdit?: (tip: Tip) => void;
}

export const TipCard: React.FC<TipCardProps> = ({ tip, isAdmin, onSettle, onDelete, onVote, onVerify, onEdit }) => {
  const [hasVoted, setHasVoted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const getStatusStyles = (status: TipStatus) => {
    switch (status) {
      case TipStatus.WON: return { 
          border: 'border-brazil-green/50', 
          bg: 'bg-gradient-to-br from-green-950/20 to-slate-900', 
          accent: 'text-brazil-green',
          glow: 'shadow-[0_0_30px_rgba(34,197,94,0.1)]'
      };
      case TipStatus.LOST: return { 
          border: 'border-red-500/30', 
          bg: 'bg-gradient-to-br from-red-950/10 to-slate-900',
          accent: 'text-red-500',
          glow: ''
      };
      default: return { 
          border: 'border-white/5', 
          bg: 'glass-card',
          accent: 'text-slate-400',
          glow: ''
      };
    }
  };

  const styles = getStatusStyles(tip.status);

  const handleVote = (type: 'agree' | 'disagree') => {
      if (hasVoted || isAdmin) return;
      if (onVote) onVote(tip.id, type);
      setHasVoted(true);
  };

  const handleCopyCode = () => {
      if (tip.bettingCode) {
          navigator.clipboard.writeText(tip.bettingCode);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const totalVotes = tip.votes.agree + tip.votes.disagree;
  const agreePercent = totalVotes > 0 ? Math.round((tip.votes.agree / totalVotes) * 100) : 0;
  const isMulti = tip.legs && tip.legs.length > 0;

  return (
    <div className={`relative rounded-[2rem] overflow-hidden border transition-all duration-500 group ${styles.bg} ${styles.border} ${styles.glow}`}>
      
      {/* STATUS BADGE */}
      <div className="absolute top-5 right-5 z-10">
         {tip.status === TipStatus.WON ? (
             <div className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase flex items-center shadow-lg shadow-emerald-500/20 tracking-wider">
                <CheckCircle2 size={12} className="mr-1.5"/> WON
             </div>
         ) : tip.status === TipStatus.LOST ? (
            <div className="bg-red-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase flex items-center tracking-wider">
                <XCircle size={12} className="mr-1.5"/> LOST
            </div>
         ) : tip.status === TipStatus.VOID ? (
            <div className="bg-slate-700 text-slate-300 px-3 py-1 rounded-lg text-[9px] font-black uppercase flex items-center tracking-wider">
                <MinusCircle size={12} className="mr-1.5"/> VOID
            </div>
         ) : (
            <div className="bg-brazil-green/10 text-brazil-green border border-brazil-green/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase flex items-center tracking-wider animate-pulse">
                <Sparkles size={12} className="mr-1.5"/> ACTIVE
            </div>
         )}
      </div>

      {/* HEADER */}
      <div className="px-6 pt-6 pb-4">
         <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-slate-800/50 rounded-xl border border-white/5 backdrop-blur-md">
                {isMulti ? <List size={18} className="text-brazil-yellow"/> : <ShieldCheck size={18} className="text-brazil-green"/>}
             </div>
             <div>
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{tip.league}</h3>
                 <p className="text-[10px] text-slate-400 font-bold flex items-center mt-1">
                    <Clock size={10} className="mr-1 opacity-50"/>
                    {new Date(tip.kickoffTime).toLocaleString(undefined, {weekday:'short', hour:'2-digit', minute:'2-digit'})}
                 </p>
             </div>
         </div>
      </div>

      {/* BODY */}
      <div className="px-6 pb-6">
         <div className="mb-4">
            {isMulti ? (
                 <div className="space-y-3">
                     {tip.legs?.map((leg, idx) => (
                         <div key={idx} className="flex justify-between items-center bg-white/[0.02] p-2 rounded-xl border border-white/5">
                             <span className="font-bold text-slate-300 text-xs">{leg.teams}</span>
                             <span className="font-black text-brazil-yellow text-[9px] uppercase tracking-wider">{leg.prediction}</span>
                         </div>
                     ))}
                 </div>
            ) : (
                <h2 className="text-xl font-black text-white leading-tight mb-1 group-hover:text-brazil-green transition-colors">
                    {tip.teams}
                </h2>
            )}
         </div>

         {/* ODDS BLOCK */}
         <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex items-center justify-between mb-4">
             <div>
                 <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Prediction</p>
                 <p className="text-sm font-black text-white">{tip.prediction}</p>
             </div>
             <div className="text-right">
                 <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Odds</p>
                 <p className={`text-2xl font-[900] ${tip.confidence === 'High' ? 'text-brazil-yellow gold-text-glow' : 'text-white'}`}>
                    {tip.odds.toFixed(2)}
                 </p>
             </div>
         </div>

         {/* ANALYSIS */}
         {tip.analysis && (
             <div className="flex gap-3 mb-4 bg-brazil-blue/5 p-3 rounded-xl border border-brazil-blue/10">
                 <div className="w-1 bg-brazil-blue rounded-full opacity-40"></div>
                 <p className="text-[11px] text-slate-400 leading-relaxed italic">"{tip.analysis}"</p>
             </div>
         )}
         
         {/* BOOKMAKER CODE */}
         {tip.bettingCode && (
             <div className="flex items-center justify-between bg-slate-900/50 border border-dashed border-slate-700 rounded-xl px-4 py-3 group/code">
                 <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Code</span>
                    <span className="text-xs font-mono font-bold text-slate-300 tracking-widest">{tip.bettingCode}</span>
                 </div>
                 <button 
                    onClick={handleCopyCode}
                    className={`p-2 rounded-lg transition-all ${copied ? 'bg-brazil-green text-white' : 'hover:bg-white/5 text-slate-500 hover:text-white'}`}
                 >
                    {copied ? <Check size={14}/> : <Copy size={14}/>}
                 </button>
             </div>
         )}
      </div>

      {/* FOOTER */}
      <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between min-h-[60px]">
          {tip.status === TipStatus.PENDING ? (
              <div className="w-full">
                  {!isAdmin && !hasVoted ? (
                      <div className="flex gap-2">
                          <button onClick={() => handleVote('agree')} className="flex-1 bg-slate-800 hover:bg-emerald-600 border border-white/5 rounded-xl py-2 flex items-center justify-center text-[10px] font-black text-slate-300 hover:text-white transition-all transform hover:-translate-y-0.5">
                              <ThumbsUp size={12} className="mr-2"/> AGREE
                          </button>
                          <button onClick={() => handleVote('disagree')} className="flex-1 bg-slate-800 hover:bg-red-600 border border-white/5 rounded-xl py-2 flex items-center justify-center text-[10px] font-black text-slate-300 hover:text-white transition-all transform hover:-translate-y-0.5">
                              <ThumbsDown size={12} className="mr-2"/> NO
                          </button>
                      </div>
                  ) : (
                      <div className="w-full">
                           <div className="flex justify-between text-[9px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">
                               <span>Community Faith</span>
                               <span className="text-brazil-green">{agreePercent}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                               <div className="h-full bg-brazil-green transition-all duration-1000" style={{width: `${agreePercent}%`}}></div>
                           </div>
                      </div>
                  )}
              </div>
          ) : (
              <div className="w-full flex justify-between items-center">
                   <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Match Record</span>
                        <span className="text-xs font-bold text-slate-300 tracking-tighter">OFFICIAL SCORE</span>
                   </div>
                   <span className="text-xl font-mono font-black text-white tracking-widest">
                        {tip.resultScore || '--'}
                   </span>
              </div>
          )}
      </div>

      {/* ADMIN CONTROLS */}
      {isAdmin && (
        <div className="absolute top-4 right-14 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
           <button onClick={(e) => { e.stopPropagation(); onDelete && onDelete(tip.id); }} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
             <XCircle size={14}/>
           </button>
           {tip.status === TipStatus.PENDING && onVerify && (
              <button onClick={(e) => { e.stopPropagation(); onVerify(tip); }} className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all">
                <Wand2 size={14}/>
              </button>
           )}
        </div>
      )}
    </div>
  );
};