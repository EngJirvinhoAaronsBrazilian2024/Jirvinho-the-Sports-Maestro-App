import React from 'react';
import { Clock, TrendingUp, AlertCircle, CheckCircle2, XCircle, MinusCircle, ThumbsUp, ThumbsDown, Copy, Check, List, Share2, Wand2 } from 'lucide-react';
import { Tip, TipStatus, TipCategory } from '../types';

interface TipCardProps {
  tip: Tip;
  isAdmin?: boolean;
  onSettle?: (id: string, status: TipStatus, score: string) => void;
  onDelete?: (id: string) => void;
  onVote?: (id: string, type: 'agree' | 'disagree') => void;
  onVerify?: (tip: Tip) => void;
}

export const TipCard: React.FC<TipCardProps> = ({ tip, isAdmin, onSettle, onDelete, onVote, onVerify }) => {
  const [scoreInput, setScoreInput] = React.useState('');
  const [hasVoted, setHasVoted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [shareText, setShareText] = React.useState('Share');

  const getStatusColor = (status: TipStatus) => {
    switch (status) {
      case TipStatus.WON: return 'border-brazil-green bg-green-900/10';
      case TipStatus.LOST: return 'border-red-500 bg-red-900/10';
      case TipStatus.VOID: return 'border-yellow-500 bg-yellow-900/10';
      default: return 'border-slate-700 bg-slate-800';
    }
  };

  const getCategoryBadge = (category: TipCategory) => {
      let colorClass = 'bg-slate-700 text-slate-300';
      if (category === TipCategory.SINGLE) colorClass = 'bg-blue-900/50 text-blue-300 border border-blue-800';
      if (category === TipCategory.ODD_2_PLUS) colorClass = 'bg-purple-900/50 text-purple-300 border border-purple-800';
      if (category === TipCategory.ODD_4_PLUS) colorClass = 'bg-orange-900/50 text-orange-300 border border-orange-800';

      return (
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider mb-1 ${colorClass}`}>
              {category}
          </span>
      );
  }

  const getStatusBadge = (status: TipStatus) => {
    switch (status) {
      case TipStatus.WON: return <span className="flex items-center text-brazil-green font-bold text-xs md:text-sm"><CheckCircle2 size={14} className="mr-1"/> WON</span>;
      case TipStatus.LOST: return <span className="flex items-center text-red-500 font-bold text-xs md:text-sm"><XCircle size={14} className="mr-1"/> LOST</span>;
      case TipStatus.VOID: return <span className="flex items-center text-yellow-500 font-bold text-xs md:text-sm"><MinusCircle size={14} className="mr-1"/> VOID</span>;
      default: return <span className="flex items-center text-slate-400 font-bold text-xs md:text-sm"><Clock size={14} className="mr-1"/> PENDING</span>;
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
      const isMulti = tip.legs && tip.legs.length > 0;
      let text = `👑 JIRVINHO SPORTS MAESTRO 👑\n\n`;
      
      if (isMulti) {
        text += `🔥 ACCUMULATOR TIP\n`;
        tip.legs?.forEach(leg => {
            text += `⚽ ${leg.teams}\n🎯 ${leg.prediction}\n\n`;
        });
      } else {
        text += `⚽ ${tip.teams}\n🏆 ${tip.league}\n🎯 ${tip.prediction}\n`;
      }
      
      text += `📊 Odds: ${tip.odds}\n`;
      if (tip.bettingCode) text += `🎟 Code: ${tip.bettingCode}\n`;
      text += `\nJoin the winning team today!`;

      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'Jirvinho Betting Tip',
                  text: text,
              });
          } catch (err) {
              console.log('Share failed', err);
          }
      } else {
          navigator.clipboard.writeText(text);
          setShareText('Copied!');
          setTimeout(() => setShareText('Share'), 2000);
      }
  };

  const totalVotes = tip.votes.agree + tip.votes.disagree;
  const agreePercent = totalVotes > 0 ? Math.round((tip.votes.agree / totalVotes) * 100) : 0;
  
  const isMulti = tip.legs && tip.legs.length > 0;

  return (
    <div className={`relative rounded-2xl border-l-4 p-4 md:p-5 shadow-lg mb-4 transition-all ${getStatusColor(tip.status)} bg-slate-800`}>
      {/* Category & Header */}
      <div className="flex justify-between items-start mb-2">
         {getCategoryBadge(tip.category)}
         <div className="flex items-center space-x-2">
             <span className="text-[10px] md:text-xs text-slate-500 font-semibold flex items-center text-right">
                {isMulti ? (
                    <><List size={12} className="mr-1"/> {tip.legs?.length} Matches</>
                ) : (
                    <>{tip.sport} &bull; {tip.league}</>
                )}
             </span>
             <button 
                onClick={handleShare}
                className="text-slate-400 hover:text-white transition-colors"
                title="Share Tip"
             >
                <Share2 size={16} />
             </button>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-2">
            {isMulti ? (
                 <h3 className="text-base md:text-lg font-bold text-white leading-snug">Accumulator</h3>
            ) : (
                 <h3 className="text-base md:text-lg font-bold text-white leading-snug break-words">{tip.teams}</h3>
            )}
        </div>
        <div className="text-right whitespace-nowrap">
           {getStatusBadge(tip.status)}
           {tip.resultScore && <div className="text-sm font-mono mt-1 text-slate-300">{tip.resultScore}</div>}
        </div>
      </div>

      {/* Prediction / Legs */}
      {isMulti ? (
          <div className="my-4 bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
             {tip.legs?.map((leg, idx) => (
                 <div key={idx} className="p-3 border-b border-slate-700 last:border-0 hover:bg-slate-800/50 transition-colors">
                     <div className="flex justify-between items-start mb-1">
                         <span className="text-xs text-slate-400 font-medium">{leg.league}</span>
                     </div>
                     <div className="font-bold text-sm text-white mb-1">{leg.teams}</div>
                     <div className="text-sm text-brazil-yellow font-bold flex items-center">
                         <span className="w-1.5 h-1.5 bg-brazil-yellow rounded-full mr-2"></span>
                         {leg.prediction}
                     </div>
                 </div>
             ))}
             <div className="p-3 bg-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Total Odds</span>
                <span className="text-xl font-bold text-white">{tip.odds.toFixed(2)}</span>
             </div>
          </div>
      ) : (
          <div className="my-4 bg-slate-900/50 p-3 rounded-lg flex justify-between items-center border border-slate-700">
            <div className="flex-1 mr-2">
              <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wide">Prediction</p>
              <p className="text-lg md:text-xl font-black text-brazil-yellow leading-tight break-words">{tip.prediction}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wide">Odds</p>
              <span className="text-lg md:text-xl font-bold text-white">{tip.odds.toFixed(2)}</span>
            </div>
          </div>
      )}

      {/* Betting Code (User Facing) */}
      {tip.bettingCode && (
          <div className="mb-4">
               <button 
                  onClick={handleCopyCode}
                  className="w-full flex items-center justify-between bg-slate-700 hover:bg-slate-600 p-2 px-3 rounded-lg border border-dashed border-slate-500 transition-colors group"
               >
                   <div className="flex flex-col text-left">
                       <span className="text-[10px] text-slate-400 font-bold uppercase">Booking Code</span>
                       <span className="text-sm font-mono text-white tracking-widest">{tip.bettingCode}</span>
                   </div>
                   <div className="flex items-center text-xs font-bold text-brazil-green">
                       {copied ? (
                           <><Check size={16} className="mr-1"/> COPIED</>
                       ) : (
                           <><Copy size={16} className="mr-1 group-hover:scale-110 transition-transform"/> COPY</>
                       )}
                   </div>
               </button>
          </div>
      )}

      {/* Meta */}
      <div className="flex items-center space-x-4 text-xs md:text-sm text-slate-400 mb-3">
        <div className="flex items-center">
          <Clock size={14} className="mr-1" />
          {new Date(tip.kickoffTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>

      {/* Analysis */}
      {tip.analysis && (
        <div className="mt-2 text-sm text-slate-300 italic border-t border-slate-700 pt-2 mb-3">
          "{tip.analysis}"
        </div>
      )}

      {/* Community Consensus / Voting */}
      {tip.status === TipStatus.PENDING && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Community Consensus</span>
                  <span className="text-[10px] font-bold text-slate-300">{totalVotes > 0 ? `${agreePercent}% Agree` : 'Be the first to vote'}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-700 rounded-full mb-3 overflow-hidden">
                  <div 
                    className="h-full bg-brazil-green transition-all duration-500" 
                    style={{ width: `${agreePercent}%` }}
                  ></div>
              </div>

              {!isAdmin && !hasVoted && (
                  <div className="flex gap-2">
                      <button 
                        onClick={() => handleVote('agree')}
                        className="flex-1 flex items-center justify-center py-2 bg-slate-700 hover:bg-green-900/30 hover:text-green-400 text-slate-300 rounded text-xs font-bold transition-colors"
                      >
                          <ThumbsUp size={14} className="mr-1"/> Agree
                      </button>
                      <button 
                        onClick={() => handleVote('disagree')}
                        className="flex-1 flex items-center justify-center py-2 bg-slate-700 hover:bg-red-900/30 hover:text-red-400 text-slate-300 rounded text-xs font-bold transition-colors"
                      >
                          <ThumbsDown size={14} className="mr-1"/> Disagree
                      </button>
                  </div>
              )}
              {hasVoted && (
                  <p className="text-center text-xs text-brazil-yellow font-medium animate-pulse">Thanks for voting!</p>
              )}
          </div>
      )}


      {/* Admin Controls */}
      {isAdmin && tip.status === TipStatus.PENDING && onSettle && (
        <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-slate-400 font-semibold">MAESTRO ACTION</p>
            {onVerify && (
                <button 
                    onClick={() => onVerify(tip)}
                    className="flex items-center text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2 py-1 rounded text-brazil-yellow transition-colors"
                >
                    <Wand2 size={12} className="mr-1"/> AI Verify Result
                </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="text" 
              placeholder="Score" 
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white w-20 focus:border-brazil-green outline-none"
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
            />
            <button onClick={() => onSettle(tip.id, TipStatus.WON, scoreInput)} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs font-bold text-white transition-colors">WON</button>
            <button onClick={() => onSettle(tip.id, TipStatus.LOST, scoreInput)} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs font-bold text-white transition-colors">LOST</button>
            <button onClick={() => onSettle(tip.id, TipStatus.VOID, scoreInput)} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs font-bold text-white transition-colors">VOID</button>
          </div>
        </div>
      )}
      
      {isAdmin && onDelete && (
        <button 
          onClick={() => onDelete(tip.id)}
          className="absolute top-2 right-2 text-slate-600 hover:text-red-500 text-xs p-2"
        >
          <XCircle size={16}/>
        </button>
      )}
    </div>
  );
};