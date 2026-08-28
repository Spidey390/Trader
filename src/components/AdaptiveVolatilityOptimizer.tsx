import { FC, useState, useEffect } from 'react';
import { 
  AssetSymbol, 
  TimeFrame, 
  StrategyConfig, 
  VolatilityRegime, 
  AdaptiveExecutionParams,
  BacktestMetrics 
} from '../types/trading';
import { 
  Zap, 
  Activity, 
  ShieldAlert, 
  Target, 
  Sliders, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Play, 
  RefreshCw 
} from 'lucide-react';

interface AdaptiveVolatilityOptimizerProps {
  currentAsset: AssetSymbol;
  currentTimeframe: TimeFrame;
  onAssetChange: (asset: AssetSymbol) => void;
  onTimeframeChange: (tf: TimeFrame) => void;
  activeStrategy: StrategyConfig;
  volatility: VolatilityRegime | null;
  onUpdateStrategy: (updated: StrategyConfig) => void;
}

export const AdaptiveVolatilityOptimizer: FC<AdaptiveVolatilityOptimizerProps> = ({
  currentAsset,
  currentTimeframe,
  onAssetChange,
  onTimeframeChange,
  activeStrategy,
  volatility,
  onUpdateStrategy
}) => {
  const [adaptiveParams, setAdaptiveParams] = useState<AdaptiveExecutionParams | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [fixedMetrics, setFixedMetrics] = useState<BacktestMetrics | null>(null);
  const [adaptiveMetrics, setAdaptiveMetrics] = useState<BacktestMetrics | null>(null);

  const assets: AssetSymbol[] = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'GBP/JPY', 'AUD/USD', 'USD/CAD', 'AUD/CAD', 'XAU/USD', 'BTC/USD', 'NAS100'];
  const timeframes: TimeFrame[] = ['1m', '5m', '15m', '1H', '4H', '1D'];

  const fetchAdaptiveParams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quant/adaptive-parameters?asset=${encodeURIComponent(currentAsset)}&timeframe=${currentTimeframe}`);
      const data = await res.json();
      if (data.adaptiveParams) {
        setAdaptiveParams(data.adaptiveParams);
      }
    } catch (err) {
      console.error('Failed to fetch adaptive parameters', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdaptiveParams();
  }, [currentAsset, currentTimeframe, activeStrategy]);

  // Run Side-by-Side Backtest Comparison (Fixed vs Adaptive)
  const runComparisonTest = async () => {
    setIsComparing(true);
    try {
      // 1. Backtest with fixed parameters
      const fixedConfig: StrategyConfig = {
        ...activeStrategy,
        enableAdaptiveVolatility: false
      };
      const fixedRes = await fetch('/api/strategy/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyConfig: fixedConfig,
          asset: currentAsset,
          timeframe: currentTimeframe,
          trialsTested: 5
        })
      });
      const fixedData = await fixedRes.json();

      // 2. Backtest with adaptive parameters enabled
      const adaptiveConfig: StrategyConfig = {
        ...activeStrategy,
        enableAdaptiveVolatility: true
      };
      const adaptiveRes = await fetch('/api/strategy/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyConfig: adaptiveConfig,
          asset: currentAsset,
          timeframe: currentTimeframe,
          trialsTested: 5
        })
      });
      const adaptiveData = await adaptiveRes.json();

      setFixedMetrics(fixedData.metrics || null);
      setAdaptiveMetrics(adaptiveData.metrics || null);
    } catch (err) {
      console.error('Comparison test failed', err);
    } finally {
      setIsComparing(false);
    }
  };

  const isAdaptiveEnabled = !!activeStrategy.enableAdaptiveVolatility;

  const toggleAdaptiveMode = () => {
    const updated: StrategyConfig = {
      ...activeStrategy,
      enableAdaptiveVolatility: !isAdaptiveEnabled
    };
    onUpdateStrategy(updated);
  };

  return (
    <div id="adaptive-volatility-optimizer" className="space-y-6">
      {/* Top Banner: Asset Selector & Status Header */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-zinc-100 uppercase font-mono">
              Adaptive Volatility Parameter Optimization Module
            </h2>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isAdaptiveEnabled 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-semibold' 
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {isAdaptiveEnabled ? 'LIVE ADAPTATION ACTIVE' : 'FIXED BASELINE MODE'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Dynamically scales stop-loss distance, take-profit expansion, FVG retest sensitivity, and liquidity sweep thresholds to market ATR & Parkinson volatility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Asset & Timeframe Selectors */}
          <div className="flex items-center gap-2">
            <select
              id="select-opt-asset"
              value={currentAsset}
              onChange={e => onAssetChange(e.target.value as AssetSymbol)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-100 focus:outline-hidden"
            >
              {assets.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <select
              id="select-opt-tf"
              value={currentTimeframe}
              onChange={e => onTimeframeChange(e.target.value as TimeFrame)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-100 focus:outline-hidden"
            >
              {timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>

          <button
            id="btn-toggle-adaptive-vol"
            onClick={toggleAdaptiveMode}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-colors ${
              isAdaptiveEnabled
                ? 'bg-rose-600/90 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isAdaptiveEnabled ? 'Disable Dynamic Adaptation' : 'Enable Dynamic Adaptation'}
          </button>
        </div>
      </div>

      {/* Real-time Volatility Diagnostics Grid */}
      {adaptiveParams && volatility && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase block">Regime</span>
            <span className="text-base font-bold text-amber-400">{adaptiveParams.regime.replace('_', ' ')}</span>
            <span className="text-[10px] text-zinc-500 block">ATR Rank: {adaptiveParams.atrPercentile}%</span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase block">Real-time ATR</span>
            <span className="text-base font-bold text-zinc-100">{adaptiveParams.currentAtrPips} pips</span>
            <span className="text-[10px] text-zinc-500 block">Spread: {volatility.spreadPips}p</span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase block">Parkinson Vol</span>
            <span className="text-base font-bold text-indigo-300">{(volatility.parkinsonVolatility * 100).toFixed(2)}%</span>
            <span className="text-[10px] text-zinc-500 block">Microstructure Variance</span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase block">Adaptive Multiplier</span>
            <span className="text-base font-bold text-emerald-400">{adaptiveParams.adaptiveMultiplier}x</span>
            <span className="text-[10px] text-zinc-500 block">Dynamic Expansion Ratio</span>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase block">ADX Strength</span>
            <span className="text-base font-bold text-blue-400">{volatility.adxStrength}</span>
            <span className="text-[10px] text-zinc-500 block">{volatility.adxStrength > 25 ? 'Trending' : 'Consolidating'}</span>
          </div>
        </div>
      )}

      {/* Parameter Calibration Matrix: Baseline vs Dynamically Computed Values */}
      {adaptiveParams && (
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase font-mono text-zinc-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" /> Dynamic Calibration Matrix ({currentAsset} • {currentTimeframe})
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">
              Auto-recalculates every bar based on volatility clustering
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            {/* 1. Stop Loss Distance */}
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="text-[10px] text-zinc-400 uppercase flex items-center justify-between">
                <span>Stop-Loss Buffer</span>
                <span className="text-rose-400 font-bold">Wick Guard</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Baseline</span>
                  <span className="text-zinc-300 font-bold">{activeStrategy.stopLossBufferPips} pips</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 block">Dynamic Adapted</span>
                  <span className="text-emerald-400 font-bold text-sm">{adaptiveParams.effectiveSlBufferPips} pips</span>
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-850">
                Prevents premature wickouts during volatility spikes.
              </div>
            </div>

            {/* 2. Target Risk:Reward */}
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="text-[10px] text-zinc-400 uppercase flex items-center justify-between">
                <span>Min Risk:Reward</span>
                <span className="text-emerald-400 font-bold">Target Expansion</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Baseline</span>
                  <span className="text-zinc-300 font-bold">1:{activeStrategy.minRiskRewardRatio.toFixed(1)}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 block">Dynamic Adapted</span>
                  <span className="text-emerald-400 font-bold text-sm">1:{adaptiveParams.effectiveMinRiskReward.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-850">
                Expands targets during high-expansion sessions to capture large imbalances.
              </div>
            </div>

            {/* 3. Displacement Threshold */}
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="text-[10px] text-zinc-400 uppercase flex items-center justify-between">
                <span>Min Displacement</span>
                <span className="text-blue-400 font-bold">MSS Filter</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Baseline</span>
                  <span className="text-zinc-300 font-bold">{activeStrategy.minDisplacementAtrMult}x ATR</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                <div className="text-right">
                  <span className="text-[10px] text-blue-400 block">Dynamic Adapted</span>
                  <span className="text-blue-400 font-bold text-sm">{adaptiveParams.effectiveMinDisplacementAtrMult}x ATR</span>
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-850">
                Filters false consolidation breakouts during high noise.
              </div>
            </div>

            {/* 4. FVG Entry Model */}
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="text-[10px] text-zinc-400 uppercase flex items-center justify-between">
                <span>FVG Entry Retest</span>
                <span className="text-purple-400 font-bold">Fill Efficiency</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Baseline</span>
                  <span className="text-zinc-300 font-bold truncate max-w-[80px]">{activeStrategy.entryModel}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                <div className="text-right">
                  <span className="text-[10px] text-purple-400 block">Dynamic Adapted</span>
                  <span className="text-purple-400 font-bold text-sm truncate max-w-[90px]">{adaptiveParams.effectiveEntryModel}</span>
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-850">
                Locks 50% Consequent Encroachment (CE) to minimize slippage.
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200">
            <strong className="text-indigo-100 font-semibold">Quantitative Rationale: </strong>
            {adaptiveParams.reasoning}
          </div>
        </div>
      )}

      {/* Side-by-Side Backtest Simulation: Fixed vs Adaptive Volatility */}
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase font-mono text-zinc-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Side-by-Side Simulation: Fixed vs Adaptive Volatility Engine
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Empirically tests slippage reduction, win-rate preservation, and drawdown suppression.
            </p>
          </div>

          <button
            id="btn-run-comparison-test"
            disabled={isComparing}
            onClick={runComparisonTest}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Play className={`w-3.5 h-3.5 ${isComparing ? 'animate-spin' : ''}`} />
            <span>{isComparing ? 'Computing 500-Bar Backtests...' : 'Run Comparative Stress Test'}</span>
          </button>
        </div>

        {fixedMetrics && adaptiveMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs pt-2">
            {/* Metric 1: Profit Factor */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="text-zinc-400 uppercase text-[10px]">Profit Factor</div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Fixed Baseline</span>
                  <span className="text-lg font-bold text-zinc-300">{fixedMetrics.profitFactor.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 block">Adaptive Vol</span>
                  <span className="text-xl font-bold text-emerald-400">{adaptiveMetrics.profitFactor.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">
                +{((adaptiveMetrics.profitFactor - fixedMetrics.profitFactor) / Math.max(0.1, fixedMetrics.profitFactor) * 100).toFixed(1)}% Efficiency Delta
              </div>
            </div>

            {/* Metric 2: Max Drawdown */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="text-zinc-400 uppercase text-[10px]">Max Drawdown</div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Fixed Baseline</span>
                  <span className="text-lg font-bold text-rose-400">{fixedMetrics.maxDrawdownPercent.toFixed(1)}%</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 block">Adaptive Vol</span>
                  <span className="text-xl font-bold text-emerald-400">{adaptiveMetrics.maxDrawdownPercent.toFixed(1)}%</span>
                </div>
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">
                {(fixedMetrics.maxDrawdownPercent - adaptiveMetrics.maxDrawdownPercent).toFixed(1)}% Drawdown Reduction
              </div>
            </div>

            {/* Metric 3: Win Rate & Expectancy */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="text-zinc-400 uppercase text-[10px]">Win Rate & Net Edge</div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Fixed Win Rate</span>
                  <span className="text-lg font-bold text-zinc-300">{fixedMetrics.winRate}%</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 block">Adaptive Win Rate</span>
                  <span className="text-xl font-bold text-emerald-400">{adaptiveMetrics.winRate}%</span>
                </div>
              </div>
              <div className="text-[10px] text-zinc-400">
                Expectancy: <strong className="text-zinc-100">${adaptiveMetrics.expectancy.toFixed(0)}</strong> per trade
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
            Click "Run Comparative Stress Test" to evaluate empirical performance deltas between fixed and adaptive volatility parameters.
          </div>
        )}
      </div>
    </div>
  );
};
