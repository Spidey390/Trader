import { FC, useState, useEffect } from 'react';
import { 
  AssetSymbol, 
  TimeFrame, 
  OpportunityScoreItem, 
  StrategyConfig 
} from '../types/trading';
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  ArrowUpRight, 
  Filter, 
  ShieldCheck, 
  RefreshCw,
  Activity,
  Layers
} from 'lucide-react';

interface OpportunityScannerProps {
  currentAsset: AssetSymbol;
  currentTimeframe: TimeFrame;
  onSelectOpportunity: (asset: AssetSymbol, tf: TimeFrame) => void;
  activeStrategy: StrategyConfig;
}

export const OpportunityScanner: FC<OpportunityScannerProps> = ({
  currentAsset,
  currentTimeframe,
  onSelectOpportunity,
  activeStrategy
}) => {
  const [selectedTf, setSelectedTf] = useState<TimeFrame>('5m');
  const [ratingFilter, setRatingFilter] = useState<'ALL' | 'PRIME_SETUP' | 'FAVORABLE' | 'POOR_CONDITIONS'>('ALL');
  const [opportunities, setOpportunities] = useState<OpportunityScoreItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  const timeframes: TimeFrame[] = ['1m', '5m', '15m', '1H', '4H', '1D'];

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market/opportunity-matrix?timeframe=${selectedTf}`);
      const data = await res.json();
      if (data.opportunities) {
        setOpportunities(data.opportunities);
        setLastRefreshed(Date.now());
      }
    } catch (err) {
      console.error('Failed to fetch opportunity matrix', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [selectedTf, activeStrategy]);

  const filteredOpportunities = opportunities.filter(item => {
    if (ratingFilter === 'ALL') return true;
    return item.rating === ratingFilter;
  });

  const getRatingBadge = (rating: OpportunityScoreItem['rating']) => {
    switch (rating) {
      case 'PRIME_SETUP':
        return { text: 'Prime Setup', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
      case 'FAVORABLE':
        return { text: 'Favorable', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' };
      case 'POOR_CONDITIONS':
        return { text: 'Poor Conditions', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
      default:
        return { text: 'Neutral', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  };

  return (
    <div id="opportunity-scanner" className="space-y-6">
      {/* Top Header & Controls */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-zinc-100 uppercase font-mono">
              Multi-Asset & Timeframe Opportunity Scanner
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              Live Suitability Scorer
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Continuously evaluates Killzone alignment, liquidity sweep density, FVG frequency, and spread-to-ATR friction across 10 instruments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-zinc-950 rounded-lg p-1 border border-zinc-800">
            {timeframes.map(tf => (
              <button
                key={tf}
                id={`scanner-tf-${tf}`}
                onClick={() => setSelectedTf(tf)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  selectedTf === tf
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Rating Filter */}
          <div className="flex items-center gap-1 bg-zinc-950 rounded-lg p-1 border border-zinc-800">
            {(['ALL', 'PRIME_SETUP', 'FAVORABLE', 'POOR_CONDITIONS'] as const).map(f => (
              <button
                key={f}
                onClick={() => setRatingFilter(f)}
                className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                  ratingFilter === f
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            id="btn-refresh-scanner"
            disabled={loading}
            onClick={fetchOpportunities}
            className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
            title="Scan Matrix"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Opportunity Matrix Table */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider">
              <th className="pb-3 px-3">Asset Pair</th>
              <th className="pb-3 px-3">Suitability Score</th>
              <th className="pb-3 px-3">Rating</th>
              <th className="pb-3 px-3">Killzone Status</th>
              <th className="pb-3 px-3">Regime</th>
              <th className="pb-3 px-3">Recent Sweeps</th>
              <th className="pb-3 px-3">Active FVGs</th>
              <th className="pb-3 px-3">Adaptive SL / TP</th>
              <th className="pb-3 px-3">Catalyst Notice</th>
              <th className="pb-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredOpportunities.map(item => {
              const ratingBadge = getRatingBadge(item.rating);
              const isSelected = item.asset === currentAsset && selectedTf === currentTimeframe;

              return (
                <tr 
                  key={item.asset}
                  className={`hover:bg-zinc-800/40 transition-colors ${
                    isSelected ? 'bg-indigo-950/20' : ''
                  }`}
                >
                  {/* Asset & Price */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                      <span>{item.asset}</span>
                      {item.priceChange24h >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-rose-400" />
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {item.currentPrice} ({item.priceChange24h >= 0 ? '+' : ''}{item.priceChange24h}%)
                    </div>
                  </td>

                  {/* Suitability Score Bar */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        item.suitabilityScore >= 80 ? 'text-emerald-400' :
                        item.suitabilityScore >= 65 ? 'text-blue-400' : 'text-zinc-400'
                      }`}>
                        {item.suitabilityScore}/100
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.suitabilityScore >= 80 ? 'bg-emerald-400' :
                            item.suitabilityScore >= 65 ? 'bg-blue-400' : 'bg-zinc-600'
                          }`}
                          style={{ width: `${item.suitabilityScore}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Rating Badge */}
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${ratingBadge.color}`}>
                      {ratingBadge.text}
                    </span>
                  </td>

                  {/* Killzone Status */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.killzoneActive ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
                      <span className={`text-xs ${item.killzoneActive ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}`}>
                        {item.killzone}
                      </span>
                    </div>
                  </td>

                  {/* Volatility Regime */}
                  <td className="py-3 px-3 text-amber-400 text-xs">
                    {item.regime.replace('_', ' ')}
                  </td>

                  {/* Sweeps Count */}
                  <td className="py-3 px-3 text-zinc-300">
                    <span className="font-bold text-amber-300">{item.recentSweepsCount}</span> sweeps
                  </td>

                  {/* FVGs Count */}
                  <td className="py-3 px-3 text-zinc-300">
                    <span className="font-bold text-blue-400">{item.activeFvgsCount}</span> gaps
                  </td>

                  {/* Adaptive SL/TP */}
                  <td className="py-3 px-3">
                    <span className="text-rose-400 font-semibold">{item.adaptiveSlPips}p</span>
                    <span className="text-zinc-600 mx-1">/</span>
                    <span className="text-emerald-400 font-semibold">{item.adaptiveTpPips}p</span>
                  </td>

                  {/* Catalyst Notice */}
                  <td className="py-3 px-3 text-[11px] text-zinc-400 max-w-[200px] truncate">
                    {item.catalystNotice}
                  </td>

                  {/* Action Button */}
                  <td className="py-3 px-3 text-right">
                    <button
                      id={`btn-select-opp-${item.asset.replace('/', '-')}`}
                      onClick={() => onSelectOpportunity(item.asset, selectedTf)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <span>Trade</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
