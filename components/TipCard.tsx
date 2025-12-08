
import React from 'react';
import { Clock, CheckCircle2, XCircle, MinusCircle, ThumbsUp, ThumbsDown, Copy, Check, List, Share2, Wand2, ArrowRight, Edit3, ShieldCheck } from 'lucide-react';
import { Tip, TipStatus, TipCategory } from '../types';

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
  const [scoreInput, setScoreInput] = React.useState('');
  const [hasVoted, setHasVoted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const getStatusStyles = (status: TipStatus) => {
    switch (status) {
      case TipStatus.WON: return { 
          border: 'border-brazil-green/50', 
          bg: 'bg-gradient-to-br from-green-950/40 via-slate-900 to-slate-900', 
          shadow: 'shadow-[0_0_20px_rgba(34,197,94,0.1)]' 
      };
      case TipStatus.LOST: return { 
          border: 'border-red-500/40', 
          bg: 'bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900',
          shadow: 'shadow-none'
      };
      case TipStatus.VOID: return { 
          border: 'border-yellow-500/40', 
          bg: 'bg-gradient-to-br from-yellow-950/40 via-slate-900 to-slate-900',
          shadow: 'shadow-none'
      };
      default: return { 
          border: 'border-white/10', 
          bg: 'glass-panel bg-slate-900/60',
          shadow: 'hover:shadow-xl hover:border-white/20'
      };
    }
  };

  const styles = getStatusStyles(tip.status);

  const getStatusBadge = (status: TipStatus) => {
    switch (status) {
      case TipStatus.WON: return <div className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center shadow-lg shadow-green-500/40 tracking-wider"><CheckCircle2 size={12} className="mr-1.5"/> WON</div>;
      case TipStatus.LOST: return <div className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center shadow-lg shadow-red-500/40 tracking-wider"><XCircle size={12} className="mr-1.5"/> LOST</div>;
      case TipStatus.VOID: return <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center shadow-lg shadow-yellow-500/40 tracking-wider"><MinusCircle size={12} className="mr-1.5"/> VOID</div>;
      default: return <div className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center animate-pulse tracking-wider"><Clock size={12} className="mr-1.5"/> LIVE</div>;
    }
  };

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
    <div className={`relative rounded-[2rem] overflow-hidden border transition-all duration-300 group ${styles.bg} ${styles.border} ${styles.shadow}`}>
      
      {/* CARD HEADER */}
      <div className="px-6 py-5 flex justify-between items-center border-b border-white/5 bg-white/[0.02]">
         <div className="flex items-center gap-3">
             <div className="bg-slate-800/80 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
                {isMulti ? <List size={18} className="text-brazil-yellow"/> : <ShieldCheck size={18} className="text-brazil-green"/>}
             </div>
             <div>
                 <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{tip.league}</h3>
                 <p className="text-[10px] text-slate-500 font-bold flex items-center mt-0.5">
                    {new Date(tip.kickoffTime).toLocaleString(undefined, {weekday:'short', hour:'2-digit', minute:'2-digit'})}
                 </p>
             </div>
         </div>
         <div className="flex flex-col items-end gap-1">
             {getStatusBadge(tip.status)}
         </div>
      </div>

      {/* CARD BODY */}
      <div className="p-6 relative">
         {/* Teams */}
         <div className="mb-6">
            {isMulti ? (
                 <div className="space-y-3">
                     {tip.legs?.map((leg, idx) => (
                         <div key={idx} className="flex justify-between items-center text-sm border-b border-dashed border-white/5 pb-2 last:border-0 last:pb-0">
                             <span className="font-semibold text-slate-200">{leg.teams}</span>
                             <span className="font-bold text-brazil-yellow text-xs bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">{leg.prediction}</span>
                         </div>
                     ))}
                 </div>
            ) : (
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight mb-2 group-hover:text-brazil-green transition-colors">{tip.teams}</h2>
            )}
         </div>

         {/* Selection & Odds Block */}
         <div className="bg-black/30 rounded-2xl p-1 border border-white/5 flex items-center justify-between mb-5 shadow-inner">
             <div className="flex-1 px-4 py-3 border-r border-white/5">
                 <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-1">Pick</p>
                 <p className="text-base font-bold text-white">{tip.prediction}</p>
             </div>
             <div className="px-6 py-3 bg-white/5 rounded-xl m-1 text-center min-w-[80px]">
                 <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-1">Odds</p>
                 <div className="text-2xl font-black text-brazil-yellow tracking-tighter drop-shadow-sm font-mono">
                    {tip.odds.toFixed(2)}
                 </div>
             </div>
         </div>

         {/* Analysis */}
         {tip.analysis && (
             <div className="flex gap-3 mb-5 bg-blue-900/10 p-3 rounded-xl border border-blue-500/10">
                 <div className="w-1 bg-brazil-blue rounded-full"></div>
                 <p className="text-xs text-blue-200/80 leading-relaxed italic">"{tip.analysis}"</p>
             </div>
         )}
         
         {/* Betting Code Copy */}
         {tip.bettingCode && (
             <button 
                onClick={handleCopyCode}
                className="w-full flex items-center justify-between bg-slate-800/30 hover:bg-brazil-green/10 border border-dashed border-slate-700 hover:border-brazil-green/50 rounded-xl px-4 py-3 group/btn transition-all duration-300"
             >
                 <span className="text-xs font-mono font-bold text-slate-400 group-hover/btn:text-white tracking-[0.2em]">{tip.bettingCode}</span>
                 <span className="text-[10px] font-bold text-brazil-green flex items-center bg-green-500/10 px-2 py-1 rounded">
                    {copied ? <Check size={12} className="mr-1"/> : <Copy size={12} className="mr-1"/>} 
                    {copied ? 'COPIED' : 'COPY CODE'}
                 </span>
             </button>
         )}
      </div>

      {/* FOOTER */}
      <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex items-center justify-between min-h-[60px]">
          
          {/* Voting */}
          {tip.status === TipStatus.PENDING && (
              <div className="flex items-center gap-3 w-full">
                  {!isAdmin && !hasVoted ? (
                      <div className="flex gap-2 w-full">
                          <button onClick={() => handleVote('agree')} className="flex-1 bg-slate-800 hover:bg-green-600 border border-white/5 hover:border-green-400 rounded-lg py-2 flex items-center justify-center text-xs font-bold text-slate-300 hover:text-white transition-all group/vote">
                              <ThumbsUp size={14} className="mr-1.5 group-hover/vote:scale-110 transition-transform"/> Agree
                          </button>
                          <button onClick={() => handleVote('disagree')} className="flex-1 bg-slate-800 hover:bg-red-600 border border-white/5 hover:border-red-400 rounded-lg py-2 flex items-center justify-center text-xs font-bold text-slate-300 hover:text-white transition-all group/vote">
                              <ThumbsDown size={14} className="mr-1.5 group-hover/vote:scale-110 transition-transform"/> Disagree
                          </button>
                      </div>
                  ) : (
                      <div className="w-full">
                           <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                               <span>Community Confidence</span>
                               <span className={agreePercent > 70 ? 'text-brazil-green' : 'text-white'}>{agreePercent}%</span>
                           </div>
                           <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-[1px]">
                               <div className="h-full rounded-full bg-gradient-to-r from-brazil-green to-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{width: `${agreePercent}%`}}></div>
                           </div>
                      </div>
                  )}
              </div>
          )}

          {/* Result Score */}
          {tip.status !== TipStatus.PENDING && (
              <div className="w-full flex justify-between items-center">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Final Result</span>
                   <span className="text-xl font-mono font-black text-white tracking-widest drop-shadow-md">{tip.resultScore || '-'}</span>
              </div>
          )}
      </div>

      {/* Admin Quick Actions */}
      {isAdmin && (
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 p-2 bg-slate-950/90 backdrop-blur-md rounded-2xl border border-white/10 z-20 shadow-xl opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
           {onEdit && (
             <button onClick={(e) => { e.stopPropagation(); onEdit(tip); }} className="p-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 hover:scale-110 transition-all">
               <Edit3 size={14}/>
             </button>
           )}
           <button onClick={(e) => { e.stopPropagation(); onDelete && onDelete(tip.id); }} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white hover:scale-110 transition-all">
             <XCircle size={14}/>
           </button>
           
           {onSettle && (
               <>
                <button onClick={(e) => { e.stopPropagation(); onSettle(tip.id, TipStatus.WON, ''); }} className={`p-2 rounded-xl transition-all hover:scale-110 ${tip.status === TipStatus.WON ? 'bg-green-500 text-white' : 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white'}`}>
                  <Check size={14}/>
                </button>
                <button onClick={(e) => { e.stopPropagation(); onSettle(tip.id, TipStatus.LOST, ''); }} className={`p-2 rounded-xl transition-all hover:scale-110 ${tip.status === TipStatus.LOST ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}>
                  <XCircle size={14}/>
                </button>
                {tip.status === TipStatus.PENDING && onVerify && (
                  <button onClick={(e) => { e.stopPropagation(); onVerify(tip); }} className="p-2 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white hover:scale-110 transition-all">
                    <Wand2 size={14}/>
                  </button>
                )}
               </>
           )}
        </div>
      )}
    </div>
  );
};
