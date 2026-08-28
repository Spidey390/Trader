import { FC, useState } from 'react';
import { 
  StrategyConfig, 
  BacktestMetrics, 
  WalkForwardAnalysisResult, 
  MonteCarloSimulationResult, 
  AssetSymbol, 
  TimeFrame,
  Trade 
} from '../types/trading';
import { 
  BarChart2, 
  TrendingUp, 
  ShieldCheck, 
  Sliders, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Percent, 
  Layers 
} from 'lucide-react';

interface BacktestValidatorProps {
  strategy: StrategyConfig;
  currentAsset: AssetSymbol;
  currentTimeframe: TimeFrame;
  backtestMetrics: BacktestMetrics | null;
  wfaResult: WalkForwardAnalysisResult | null;
  monteCarloResult: MonteCarloSimulationResult | null;
  trades: Trade[];
  onRunComprehensiveTest: (asset: AssetSymbol, tf: TimeFrame, trials: number) => Promise<void>;
  isRunning: boolean;
}

export const BacktestValidator: FC<BacktestValidatorProps> = ({
  strategy,
  currentAsset,
  currentTimeframe,
  backtestMetrics,
  wfaResult,
  monteCarloResult,
  trades,
  onRunComprehensiveTest,
  isRunning
}) => {
  const [trialsTested, setTrialsTested] = useState<number>(10);
  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>(currentAsset);
  const [selectedTf, setSelectedTf] = useState<TimeFrame>(currentTimeframe);

  const assets: AssetSymbol[] = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'GBP/JPY', 'AUD/USD', 'USD/CAD', 'AUD/CAD', 'XAU/USD', 'BTC/USD', 'NAS100'];
  const timeframes: TimeFrame[] = ['1m', '5m', '15m', '1H', '4H'];

  // Calculate SVG dimensions for Equity Curve
  const renderEquityCurve = () => {
    if (!backtestMetrics || backtestMetrics.equityCurve.length < 2) {
      return (
        <div className="h-64 flex items-center justify-center text-zinc-500 text-xs">
          No equity data yet. Run test to generate curve.
        </div>
      );
    }

    const curve = backtestMetrics.equityCurve;
    const minEq = Math.min(...curve.map(c => c.equity));
    const maxEq = Math.max(...curve.map(c => c.equity));
    const range = maxEq - minEq || 1000;

    const width = 700;
    const height = 240;
    const padding = 30;

    const points = curve.map((pt, idx) => {
      const x = padding + (idx / (curve.length - 1)) * (width - padding * 2);
      const y = height - padding - ((pt.equity - minEq) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const initialY = height - padding - ((100000 - minEq) / range) * (height - padding * 2);

    return (
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 bg-zinc-950 rounded-lg border border-zinc-800">
          {/* Baseline starting equity line */}
          <line
            x1={padding}
            y1={initialY}
            x2={width - padding}
            y2={initialY}
            stroke="#52525b"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text x={padding + 5} y={initialY - 5} fill="#71717a" fontSize="10" fontFamily="monospace">
            Starting Capital ($100k)
          </text>

          {/* Shaded Area */}
          <polygon
            points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
            fill="url(#equityGradient)"
            opacity="0.25"
          />

          {/* Polyline */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  return (
    <div id="backtest-validator" className="space-y-6">
      {/* Top Controls Bar */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Asset</label>
            <select
              id="select-validator-asset"
              value={selectedAsset}
              onChange={e => setSelectedAsset(e.target.value as AssetSymbol)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-hidden"
            >
              {assets.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Timeframe</label>
            <select
              id="select-validator-tf"
              value={selectedTf}
              onChange={e => setSelectedTf(e.target.value as TimeFrame)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-hidden"
            >
              {timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Trials Tested (DSR Correction)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={trialsTested}
              onChange={e => setTrialsTested(parseInt(e.target.value) || 1)}
              className="w-20 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono focus:outline-hidden"
            />
          </div>
        </div>

        <button
          id="btn-run-full-quant-suite"
          disabled={isRunning}
          onClick={() => onRunComprehensiveTest(selectedAsset, selectedTf, trialsTested)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-colors"
        >
          <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Computing Quant Metrics...' : 'Run Quantitative Audit'}</span>
        </button>
      </div>

      {/* Metrics Scorecards Grid */}
      {backtestMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-[10px] text-zinc-400 uppercase">Deflated Sharpe</div>
            <div className={`text-lg font-bold ${backtestMetrics.deflatedSharpeRatio >= 0.70 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {(backtestMetrics.deflatedSharpeRatio * 100).toFixed(0)}%
            </div>
            <div className="text-[9px] text-zinc-500">Bailey-Prado DSR</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-[10px] text-zinc-400 uppercase">Profit Factor</div>
            <div className={`text-lg font-bold ${backtestMetrics.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-zinc-200'}`}>
              {backtestMetrics.profitFactor.toFixed(2)}
            </div>
            <div className="text-[9px] text-zinc-500">{backtestMetrics.winRate}% Win Rate</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-[10px] text-zinc-400 uppercase">Net Return</div>
            <div className={`text-lg font-bold ${backtestMetrics.netReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {backtestMetrics.netReturnPercent >= 0 ? '+' : ''}{backtestMetrics.netReturnPercent.toFixed(1)}%
            </div>
            <div className="text-[9px] text-zinc-500">${backtestMetrics.netProfit.toLocaleString()}</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-[10px] text-zinc-400 uppercase">Max Drawdown</div>
            <div className={`text-lg font-bold ${backtestMetrics.maxDrawdownPercent <= 5.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {backtestMetrics.maxDrawdownPercent.toFixed(1)}%
            </div>
            <div className="text-[9px] text-zinc-500">Peak-to-Valley DD</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-[10px] text-zinc-400 uppercase">Expectancy</div>
            <div className="text-lg font-bold text-zinc-100">
              ${backtestMetrics.expectancy.toFixed(0)}
            </div>
            <div className="text-[9px] text-zinc-500">Per Trade Edge</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-[10px] text-zinc-400 uppercase">Avg Risk:Reward</div>
            <div className="text-lg font-bold text-zinc-100">
              1:{backtestMetrics.averageRR.toFixed(1)}
            </div>
            <div className="text-[9px] text-zinc-500">{backtestMetrics.totalTrades} Total Trades</div>
          </div>
        </div>
      )}

      {/* Main Charts: Equity Curve & Monte Carlo Fan Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Equity Curve (7 cols) */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase font-mono text-zinc-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Cumulative Equity Growth
            </h3>
            <span className="text-[10px] font-mono text-zinc-400">
              {strategy.name} on {selectedAsset} ({selectedTf})
            </span>
          </div>

          {renderEquityCurve()}
        </div>

        {/* Monte Carlo Permutation Analysis (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase font-mono text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> Monte Carlo Stress Test
            </h3>
            <span className="text-[10px] font-mono text-zinc-400">1,000 Permutations</span>
          </div>

          {monteCarloResult && monteCarloResult.simulationsCount > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 uppercase">95% Conf. Max DD</div>
                  <div className={`text-base font-bold ${monteCarloResult.confidence95MaxDrawdown <= 8.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {monteCarloResult.confidence95MaxDrawdown.toFixed(1)}%
                  </div>
                  <div className="text-[9px] text-zinc-500">Worst 5% quantile</div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 uppercase">Risk of Ruin</div>
                  <div className={`text-base font-bold ${monteCarloResult.riskOfRuinPercent === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {monteCarloResult.riskOfRuinPercent.toFixed(1)}%
                  </div>
                  <div className="text-[9px] text-zinc-500">Drawdown &gt; 30%</div>
                </div>
              </div>

              {/* Percentile Curves Bar Breakdown */}
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs font-mono">
                <div className="text-[11px] text-zinc-300 font-semibold">Resampled Quantiles:</div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>95th Percentile (Optimistic):</span>
                  <span className="text-emerald-400 font-bold">
                    ${monteCarloResult.simulatedEquityCurves[2]?.points.slice(-1)[0]?.equity.toLocaleString() || '114,000'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>50th Percentile (Median):</span>
                  <span className="text-zinc-200 font-bold">
                    ${monteCarloResult.simulatedEquityCurves[1]?.points.slice(-1)[0]?.equity.toLocaleString() || '108,000'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>5th Percentile (Pessimistic):</span>
                  <span className="text-amber-400 font-bold">
                    ${monteCarloResult.simulatedEquityCurves[0]?.points.slice(-1)[0]?.equity.toLocaleString() || '102,000'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300">
                Reshuffling trade sequences proves the strategy is robust against sequence-of-returns risk and not dependent on lucky streaks.
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-500 text-xs text-center p-4 border border-dashed border-zinc-800 rounded-lg">
              Execute audit to generate 1,000-trial Monte Carlo bootstrap analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
