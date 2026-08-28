import { FC } from 'react';
import { AssetSymbol, VolatilityRegime } from '../types/trading';
import { Activity, Flame, ShieldAlert, BarChart3, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';

export interface AssetVolatilityItem {
  asset: AssetSymbol;
  lastPrice: number;
  priceChange24h: number;
  regime: VolatilityRegime['regime'];
  currentAtr: number;
  atrPercentile: number;
  parkinsonVolatility: number;
  adxStrength: number;
  spreadPips: number;
  recommendation: string;
}

interface VolatilityMatrixProps {
  matrix: AssetVolatilityItem[];
  onSelectAsset: (asset: AssetSymbol) => void;
}

export const VolatilityMatrix: FC<VolatilityMatrixProps> = ({ matrix, onSelectAsset }) => {
  const getRegimeBadge = (regime: VolatilityRegime['regime']) => {
    switch (regime) {
      case 'HIGH_VOLATILITY':
        return { text: 'High Volatility', bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30', icon: Flame };
      case 'NEWS_EXPANSION':
        return { text: 'News Expansion', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: ShieldAlert };
      case 'COMPRESSED_RANGE':
        return { text: 'Compressed Range', bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: Compass };
      default:
        return { text: 'Normal Volatility', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: Activity };
    }
  };

  return (
    <div id="volatility-matrix-container" className="space-y-6">
      {/* Header Info */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" /> Multi-Asset Volatility Clustering & Adaptive Regimes
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time ATR percentile, Parkinson high-low volatility, and quantitative ICT model adaptations per asset.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-950 text-zinc-400 border border-zinc-800">
          8 Assets Monitored
        </span>
      </div>

      {/* Grid of Asset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {matrix.map(item => {
          const badge = getRegimeBadge(item.regime);
          const BadgeIcon = badge.icon;
          const isUp = item.priceChange24h >= 0;

          return (
            <div
              key={item.asset}
              id={`volatility-card-${item.asset.replace('/', '-')}`}
              onClick={() => onSelectAsset(item.asset)}
              className="p-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-3.5 group shadow-xs"
            >
              {/* Asset Title & 24h Change */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors">
                    {item.asset}
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    {item.lastPrice.toFixed(item.asset === 'USD/JPY' ? 3 : item.asset === 'BTC/USD' || item.asset === 'NAS100' ? 2 : item.asset === 'XAU/USD' ? 2 : 5)}
                  </div>
                </div>

                <div className={`flex items-center text-xs font-semibold font-mono ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{isUp ? '+' : ''}{item.priceChange24h}%</span>
                </div>
              </div>

              {/* Regime Badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${badge.bg}`}>
                <BadgeIcon className="w-3.5 h-3.5" />
                <span>{badge.text}</span>
              </div>

              {/* Quantitative Volatility Indicators */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">ATR Rank</span>
                  <span className="text-zinc-200 font-bold">{item.atrPercentile.toFixed(0)}%</span>
                </div>
                <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">Spread</span>
                  <span className="text-zinc-200 font-bold">{item.spreadPips} pips</span>
                </div>
              </div>

              {/* AI Quant Recommendation */}
              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-300 leading-relaxed">
                <span className="text-zinc-500 font-mono text-[10px] block mb-0.5 uppercase">Model Adaptation</span>
                {item.recommendation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
