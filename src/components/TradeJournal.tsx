import { FC, useState } from 'react';
import { Trade, KillzoneType } from '../types/trading';
import { BookOpen, Sparkles, Filter, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface TradeJournalProps {
  trades: Trade[];
  onDiagnoseTrades: () => Promise<void>;
  aiDiagnosis: { summary: string; weaknesses: string[]; recommendations: string[] } | null;
  isDiagnosing: boolean;
}

export const TradeJournal: FC<TradeJournalProps> = ({
  trades,
  onDiagnoseTrades,
  aiDiagnosis,
  isDiagnosing
}) => {
  const [filterKz, setFilterKz] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredTrades = trades.filter(t => {
    if (filterKz !== 'ALL' && t.killzone !== filterKz) return false;
    if (filterStatus === 'WIN' && t.pnl <= 0) return false;
    if (filterStatus === 'LOSS' && t.pnl > 0) return false;
    return true;
  });

  // Calculate Breakdown stats by Killzone
  const kzStats = ['LONDON_OPEN', 'NEW_YORK_AM', 'ASIAN', 'LONDON_CLOSE'].map(kz => {
    const kzTrades = trades.filter(t => t.killzone === kz);
    const winTrades = kzTrades.filter(t => t.pnl > 0);
    const winRate = kzTrades.length > 0 ? (winTrades.length / kzTrades.length) * 100 : 0;
    const totalPnl = kzTrades.reduce((acc, t) => acc + t.pnl, 0);

    return {
      killzone: kz,
      count: kzTrades.length,
      winRate: Number(winRate.toFixed(1)),
      totalPnl: Number(totalPnl.toFixed(0))
    };
  });

  return (
    <div id="trade-journal-container" className="space-y-6">
      {/* Top Banner with AI Diagnostics Trigger */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" /> ICT Smart Money Trade Journal & Telemetry
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Every trade is tagged with exact institutional parameters (Killzone, Sweep Type, Displacement ATR, FVG Depth, MAE/MFE).
          </p>
        </div>

        <button
          id="btn-diagnose-trades"
          disabled={isDiagnosing || trades.length === 0}
          onClick={onDiagnoseTrades}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-colors"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
          <span>{isDiagnosing ? 'AI Analyzing...' : 'Run AI Post-Mortem Diagnostics'}</span>
        </button>
      </div>

      {/* AI Post-Mortem Diagnostics Panel */}
      {aiDiagnosis && (
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs">
            <Sparkles className="w-4 h-4" /> AI Trade Performance & Weakness Diagnostics
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed">
            {aiDiagnosis.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] font-mono uppercase text-rose-400 block mb-1">Identified Quant Weaknesses</span>
              <ul className="space-y-1 text-zinc-300 text-[11px] list-disc list-inside">
                {aiDiagnosis.weaknesses.map((w, idx) => <li key={idx}>{w}</li>)}
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] font-mono uppercase text-emerald-400 block mb-1">Algorithmic Optimization Proposals</span>
              <ul className="space-y-1 text-zinc-300 text-[11px] list-disc list-inside">
                {aiDiagnosis.recommendations.map((r, idx) => <li key={idx}>{r}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Killzone Performance Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kzStats.map(stat => (
          <div key={stat.killzone} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs">
            <div className="text-[10px] text-zinc-400 uppercase truncate">
              {stat.killzone.replace('_', ' ')}
            </div>
            <div className="text-base font-bold text-zinc-100 mt-1">
              {stat.winRate}% <span className="text-[10px] font-normal text-zinc-500">Win Rate</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1">
              <span>{stat.count} Trades</span>
              <span className={stat.totalPnl >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {stat.totalPnl >= 0 ? '+' : ''}${stat.totalPnl}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 flex items-center gap-1 font-mono text-[11px]">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </span>
          <select
            id="filter-kz"
            value={filterKz}
            onChange={e => setFilterKz(e.target.value)}
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs focus:outline-hidden"
          >
            <option value="ALL">All Killzones</option>
            <option value="LONDON_OPEN">London Open</option>
            <option value="NEW_YORK_AM">New York AM</option>
            <option value="LONDON_CLOSE">London Close</option>
            <option value="ASIAN">Asian Range</option>
          </select>

          <select
            id="filter-status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs focus:outline-hidden"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN">Winners Only</option>
            <option value="LOSS">Losses Only</option>
          </select>
        </div>

        <span className="text-[11px] font-mono text-zinc-400">{filteredTrades.length} Trades Listed</span>
      </div>

      {/* Trades Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 text-[10px] uppercase">
            <tr>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Asset</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Killzone</th>
              <th className="py-2.5 px-3">Sweep Type</th>
              <th className="py-2.5 px-3">Entry Model</th>
              <th className="py-2.5 px-3">R:R</th>
              <th className="py-2.5 px-3">PnL ($)</th>
              <th className="py-2.5 px-3">PnL (Pips)</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850 text-zinc-300">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-zinc-500">
                  No trades recorded for the selected filter.
                </td>
              </tr>
            ) : (
              filteredTrades.map(trade => {
                const isWin = trade.pnl > 0;
                return (
                  <tr key={trade.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                      {new Date(trade.entryTimestamp).toISOString().slice(11, 16)} UTC
                    </td>
                    <td className="py-2.5 px-3 font-bold text-zinc-100">{trade.asset}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        trade.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {trade.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">{trade.killzone}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{trade.sweepType}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{trade.entryType}</td>
                    <td className="py-2.5 px-3 text-zinc-200">1:{trade.riskRewardRatio.toFixed(1)}</td>
                    <td className={`py-2.5 px-3 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}${trade.pnl.toFixed(0)}
                    </td>
                    <td className={`py-2.5 px-3 ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}{trade.pnlPips.toFixed(1)}p
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {trade.status.replace('CLOSED_', '')}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
