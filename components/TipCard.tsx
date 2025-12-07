import React from 'react';
import { Clock, CheckCircle2, XCircle, MinusCircle, ThumbsUp, ThumbsDown, Copy, Check, List, Share2, Wand2, ArrowRight, Edit3 } from 'lucide-react';
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

  const getStatusColor = (status: TipStatus) => {
    switch (status) {
      case TipStatus.WON: return 'from-green-900/40 to-slate-900 border-brazil-green';
      case TipStatus.LOST: return 'from-red-900/40 to-slate-900 border-red-500';
      case TipStatus.VOID: return 'from-yellow-900/40 to-slate-900 border-yellow-500';
      default: return 'from-slate-800 to-slate-900 border-slate-700'; // Pending
    }
  };

  const getStatusBadge = (status: TipStatus) => {
    switch (status) {
      case TipStatus.WON: return <div className="bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center shadow-[0_0_10px_rgba(34,197,94,0.4)]"><CheckCircle2 size={10} className="mr-1"/> WON</div>;
      case TipStatus.LOST: return <div className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center"><XCircle size={10} className="mr-1"/> LOST</div>;
      case TipStatus.VOID: return <div className="bg-yellow-500 text-black px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center"><MinusCircle size={10} className="mr-1"/> VOID</div>;
      default: return <div className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center animate-pulse"><Clock size={10} className="mr-1"/> LIVE</div>;
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

  const handleShare = async () => {
     if (navigator.share) {
         try {
             await navigator.share({
                 title: 'Jirvinho Tip',
                 text: `Check out this tip: ${tip.teams} - ${tip.prediction} @ ${tip.odds}`,
             });
         } catch (err) {}
     }
  };

  const totalVotes = tip.votes.agree + tip.votes.disagree;
  const agreePercent = totalVotes > 0 ? Math.round((tip.votes.agree / totalVotes) * 100) : 0;
  const isMulti = tip.legs && tip.legs.length > 0;

  return (
    <div className={`relative rounded-3xl overflow-hidden border bg-gradient-to-br shadow-xl mb-6 ${getStatusColor(tip.status)}`}>
      
      {/* TICKET HEADER */}
      <div className="px-5 py-4 flex justify-between items-start bg-black/20 backdrop-blur-sm border-b border-white/5">
         <div className="flex items-center gap-2">
             <div className="bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                {isMulti ? <List size={16} className="text-brazil-yellow"/> : <div className="w-4 h-4 rounded-full bg-brazil-green/20 border border-brazil-green flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-brazil-green"></div></div>}
             </div>
             <div>
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tip.league}</h3>
                 <p className="text-[10px] text-slate-500 flex items-center">
                    <Clock size={10} className="mr-1"/> {new Date(tip.kickoffTime).toLocaleString(undefined, {weekday:'short', hour:'2-digit', minute:'2-digit'})}
                 </p>
             </div>
         </div>
         <div className="flex flex-col items-end gap-1">
             {getStatusBadge(tip.status)}
             <button onClick={handleShare} className="text-slate-500 hover:text-white transition-colors"><Share2 size={14}/></button>
         </div>
      </div>

      {/* TICKET BODY */}
      <div className="p-5 relative">
         {/* Teams */}
         <div className="mb-4">
            {isMulti ? (
                 <div className="space-y-3">
                     {tip.legs?.map((leg, idx) => (
                         <div key={idx} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                             <span className="font-medium text-white">{leg.teams}</span>
                             <span className="font-bold text-brazil-yellow text-xs bg-yellow-900/10 px-2 py-0.5 rounded border border-yellow-900/30">{leg.prediction}</span>
                         </div>
                     ))}
                 </div>
            ) : (
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight mb-1">{tip.teams}</h2>
            )}
         </div>

         {/* Selection & Odds */}
         <div className="bg-slate-950/40 rounded-xl p-3 border border-white/5 flex items-center justify-between mb-4">
             <div>
                 <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Selection</p>
                 <p className="text-lg font-bold text-brazil-yellow">{tip.prediction}</p>
             </div>
             <div className="text-right">
                 <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Odds</p>
                 <div className="text-2xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                    {tip.odds.toFixed(2)}
                 </div>
             </div>
         </div>

         {/* Analysis */}
         {tip.analysis && (
             <div className="flex gap-2 mb-4">
                 <div className="w-1 bg-brazil-blue rounded-full opacity-50"></div>
                 <p className="text-xs text-slate-300 italic leading-relaxed opacity-80">"{tip.analysis}"</p>
             </div>
         )}
         
         {/* Betting Code Copy */}
         {tip.bettingCode && (
             <button 
                onClick={handleCopyCode}
                className="w-full flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 border border-dashed border-slate-600 rounded-lg px-4 py-2 group transition-all"
             >
                 <span className="text-xs font-mono text-slate-400 tracking-widest">{tip.bettingCode}</span>
                 <span className="text-xs font-bold text-brazil-green flex items-center">
                    {copied ? <Check size={12} className="mr-1"/> : <Copy size={12} className="mr-1 group-hover:scale-110 transition-transform"/>} 
                    {copied ? 'COPIED' : 'COPY'}
                 </span>
             </button>
         )}
      </div>

      {/* TICKET FOOTER (Actions) */}
      <div className="bg-black/20 px-5 py-3 border-t border-white/5 flex items-center justify-between">
          
          {/* Voting */}
          {tip.status === TipStatus.PENDING && (
              <div className="flex items-center gap-3 w-full">
                  {!isAdmin && !hasVoted ? (
                      <div className="flex gap-2 w-full">
                          <button onClick={() => handleVote('agree')} className="flex-1 bg-slate-800 hover:bg-green-900/30 border border-slate-700 hover:border-green-500/50 rounded-lg py-1.5 flex items-center justify-center text-xs font-bold text-slate-300 transition-all">
                              <ThumbsUp size={12} className="mr-1.5"/> Agree
                          </button>
                          <button onClick={() => handleVote('disagree')} className="flex-1 bg-slate-800 hover:bg-red-900/30 border border-slate-700 hover:border-red-500/50 rounded-lg py-1.5 flex items-center justify-center text-xs font-bold text-slate-300 transition-all">
                              <ThumbsDown size={12} className="mr-1.5"/> Disagree
                          </button>
                      </div>
                  ) : (
                      <div className="w-full">
                           <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                               <span>Community Confidence</span>
                               <span className={agreePercent > 70 ? 'text-brazil-green' : 'text-white'}>{agreePercent}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                               <div className="h-full bg-gradient-to-r from-brazil-green to-green-400" style={{width: `${agreePercent}%`}}></div>
                           </div>
                      </div>
                  )}
              </div>
          )}

          {/* Result Score */}
          {tip.status !== TipStatus.PENDING && (
              <div className="w-full flex justify-between items-center">
                   <span className="text-xs text-slate-500 font-medium">Final Result</span>
                   <span className="text-lg font-mono font-bold text-white tracking-widest">{tip.resultScore || '-'}</span>
              </div>
          )}
      </div>

      {/* Admin Quick Actions Overlay */}
      {isAdmin && (
        <div className="absolute top-2 right-2 flex flex-col gap-1 p-2 bg-slate-900/90 rounded-xl border border-slate-700 z-10 shadow-lg">
           {onEdit && (
             <button 
               onClick={(e) => { e.stopPropagation(); onEdit(tip); }} 
               className="p-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
               type="button"
             >
               <Edit3 size={14}/>
             </button>
           )}
           <button 
             onClick={(e) => { e.stopPropagation(); onDelete && onDelete(tip.id); }} 
             className="p-1.5 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
             type="button"
           >
             <XCircle size={14}/>
           </button>
           
           {tip.status === TipStatus.PENDING && onSettle && (
               <>
                <button 
                  onClick={(e) => { e.stopPropagation(); onSettle(tip.id, TipStatus.WON, '1-0'); }} 
                  className="p-1.5 bg-green-500/20 text-green-500 rounded hover:bg-green-500 hover:text-white transition-colors"
                  type="button"
                >
                  <Check size={14}/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onSettle(tip.id, TipStatus.LOST, '0-1'); }} 
                  className="p-1.5 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                  type="button"
                >
                  <XCircle size={14}/>
                </button>
                {onVerify && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onVerify(tip); }} 
                    className="p-1.5 bg-blue-500/20 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition-colors"
                    type="button"
                  >
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