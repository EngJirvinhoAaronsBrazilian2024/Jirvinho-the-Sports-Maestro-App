import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { MaestroStats, TipStatus } from '../types';

interface StatsWidgetProps {
  stats: MaestroStats;
}

export const StatsWidget: React.FC<StatsWidgetProps> = ({ stats }) => {
  const data = [
    { name: 'Won', value: stats.wonTips },
    { name: 'Other', value: stats.totalTips - stats.wonTips },
  ];
  
  const COLORS = ['#009c3b', '#334155'];

  // Card shared classes
  const cardClasses = "bg-slate-800 p-5 rounded-2xl shadow-lg border border-slate-700 relative overflow-hidden min-w-[85vw] md:min-w-0 snap-center flex flex-col justify-center h-40 md:h-auto";

  return (
    <div className="flex md:grid md:grid-cols-2 gap-4 mb-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 md:pb-0 scrollbar-hide">
      {/* Win Rate Card */}
      <div className={`${cardClasses} flex-row items-center justify-between`}>
        <div>
           <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Win Rate</p>
           <div className="text-4xl font-black mt-2 text-white">
             {stats.winRate}%
           </div>
           <p className="text-xs text-slate-500 mt-1">{stats.wonTips} / {stats.totalTips} settled tips</p>
        </div>
        <div className="w-20 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={35}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Streak Card */}
      <div className={cardClasses}>
        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-3">Last 10 Form</p>
        <div className="flex flex-wrap gap-2">
          {stats.streak.length === 0 && <span className="text-slate-500 text-sm">No settled tips yet.</span>}
          {stats.streak.map((status, idx) => (
            <div 
              key={idx}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                status === TipStatus.WON ? 'bg-brazil-green border-green-400 text-white' :
                status === TipStatus.LOST ? 'bg-red-600 border-red-400 text-white' :
                'bg-slate-600 border-slate-400 text-slate-200'
              }`}
            >
              {status === TipStatus.WON ? 'W' : status === TipStatus.LOST ? 'L' : 'V'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};