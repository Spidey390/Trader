import { FC, useState } from 'react';
import { 
  StrategyConfig, 
  AIStrategyHypothesis, 
  BacktestMetrics, 
  WalkForwardAnalysisResult, 
  AssetSymbol, 
  TimeFrame 
} from '../types/trading';
import { 
  Cpu, 
  Sparkles, 
  GitBranch, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  TrendingUp, 
  ShieldAlert, 
  Play, 
  RefreshCw, 
  Award, 
  Layers 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StrategyEvolutionHubProps {
  strategies: StrategyConfig[];
  activeStrategy: StrategyConfig;
  onPromoteStrategy: (strategyId: string) => void;
  onSynthesizeNewStrategy: (target: string) => Promise<void>;
  isSynthesizing: boolean;
  latestHypothesis: AIStrategyHypothesis | null;
  onRunControlledValidation: (strategy: StrategyConfig) => Promise<void>;
  validationResult: { wfa: WalkForwardAnalysisResult; isMetrics: BacktestMetrics; oosMetrics: BacktestMetrics } | null;
  isValidating: boolean;
  selectedAsset: AssetSymbol;
  selectedTimeframe: TimeFrame;
}

export const StrategyEvolutionHub: FC<StrategyEvolutionHubProps> = ({
  strategies,
  activeStrategy,
  onPromoteStrategy,
  onSynthesizeNewStrategy,
  isSynthesizing,
  latestHypothesis,
  onRunControlledValidation,
  validationResult,
  isValidating,
  selectedAsset,
  selectedTimeframe
}) => {
  const [optimizationTarget, setOptimizationTarget] = useState<string>('HighSharpe');
  const [inspectedStrategy, setInspectedStrategy] = useState<StrategyConfig>(activeStrategy);

  const handlePromote = (stratId: string) => {
    onPromoteStrategy(stratId);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  return (
    <div id="strategy-evolution-hub" className="space-y-6">
      {/* Top Banner: Controlled Self-Improving Philosophy */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-zinc-900 to-zinc-950 border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Autonomous Strategy Synthesis & Verification Gate
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
            Controlled quant architecture: The AI analyzes trade weaknesses, synthesizes mathematically rigorous parameter mutations (Killzones, Displacement ATR, 50% CE FVG depth), tests them across multi-asset walk-forward windows, and requires empirical out-of-sample superiority before promotion.
          </p>
        </div>

        {/* Synthesis Action Button */}
        <div className="flex items-center gap-2">
          <select
            id="select-opt-target"
            value={optimizationTarget}
            onChange={e => setOptimizationTarget(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="HighSharpe">Target: Maximize Deflated Sharpe</option>
            <option value="HighWFE">Target: Walk-Forward Efficiency (&gt;65%)</option>
            <option value="LowDrawdown">Target: Minimize Drawdown (&lt;5%)</option>
            <option value="HighVolSpecialist">Target: High Volatility Expansion</option>
          </select>

          <button
            id="btn-synthesize-strategy"
            disabled={isSynthesizing}
            onClick={() => onSynthesizeNewStrategy(optimizationTarget)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all"
          >
            <Cpu className={`w-4 h-4 ${isSynthesizing ? 'animate-spin' : ''}`} />
            <span>{isSynthesizing ? 'AI Synthesizing...' : 'Synthesize Mutation'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Strategy Lineage Catalog vs AI Hypothesis & Validation Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (5 cols): Strategy Catalog & Version Tree */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-indigo-400" /> Strategy Version Lineage
            </h3>
            <span className="text-[11px] font-mono text-zinc-500">{strategies.length} Versions Registered</span>
          </div>

          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {strategies.map(strat => {
              const isActive = strat.isActive;
              const isSelected = inspectedStrategy.id === strat.id;

              return (
                <div
                  key={strat.id}
                  id={`strategy-card-${strat.id}`}
                  onClick={() => setInspectedStrategy(strat)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-zinc-900 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20' 
                      : 'bg-zinc-950 hover:bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100">{strat.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {strat.version}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">{strat.description}</p>
                    </div>

                    {isActive ? (
                      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> ACTIVE LIVE
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePromote(strat.id);
                        }}
                        className="shrink-0 px-2 py-1 rounded bg-zinc-800 hover:bg-indigo-600 hover:text-white text-zinc-300 text-[10px] font-medium border border-zinc-700 transition-colors"
                      >
                        Deploy
                      </button>
                    )}
                  </div>

                  {/* Quantitative Parameters Chip Strip */}
                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                      Displ: &ge;{strat.minDisplacementAtrMult}x ATR
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                      Entry: {strat.entryModel}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                      R:R &ge; 1:{strat.minRiskRewardRatio}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                      KZ: {strat.allowedKillzones.length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col (7 cols): Inspected Strategy Diagnostics & Controlled Validation Gate */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase text-zinc-400">Inspecting Strategy</div>
                <h3 className="text-sm font-bold text-zinc-100">{inspectedStrategy.name} ({inspectedStrategy.version})</h3>
              </div>

              <button
                id="btn-run-validation"
                disabled={isValidating}
                onClick={() => onRunControlledValidation(inspectedStrategy)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <Play className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                <span>{isValidating ? 'Running WFA Test...' : `Validate on ${selectedAsset} (${selectedTimeframe})`}</span>
              </button>
            </div>

            {/* AI Hypothesis Card (if generated) */}
            {latestHypothesis && (
              <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-xs">
                  <Sparkles className="w-3.5 h-3.5" /> AI Attribution & Mutation Rationale
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {latestHypothesis.analysisSummary}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                    <span className="text-zinc-400 block text-[10px] uppercase font-mono">Identified Weakness</span>
                    <span className="text-rose-300">{latestHypothesis.identifiedWeakness}</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                    <span className="text-zinc-400 block text-[10px] uppercase font-mono">Expected Edge Improvement</span>
                    <span className="text-emerald-300">{latestHypothesis.expectedEdgeImprovement}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Controlled Gate Validation Results */}
            {validationResult ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase font-mono text-zinc-300">
                    Walk-Forward Validation Gate (Out-of-Sample)
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    validationResult.wfa.passedRobustnessThreshold
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {validationResult.wfa.passedRobustnessThreshold ? 'PASSED ROBUSTNESS GATE' : 'FAILED ROBUSTNESS GATE'}
                  </span>
                </div>

                {/* Scorecards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-zinc-400 uppercase">W.F. Efficiency</div>
                    <div className={`text-base font-bold ${validationResult.wfa.overallWFE >= 0.55 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {(validationResult.wfa.overallWFE * 100).toFixed(0)}%
                    </div>
                    <div className="text-[9px] text-zinc-500">Threshold &ge; 55%</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-zinc-400 uppercase">OOS Profit Factor</div>
                    <div className={`text-base font-bold ${validationResult.oosMetrics.profitFactor >= 1.3 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {validationResult.oosMetrics.profitFactor.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-zinc-500">Threshold &ge; 1.25</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-zinc-400 uppercase">OOS Win Rate</div>
                    <div className="text-base font-bold text-zinc-100">
                      {validationResult.oosMetrics.winRate.toFixed(1)}%
                    </div>
                    <div className="text-[9px] text-zinc-500">{validationResult.oosMetrics.totalTrades} Trades</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-zinc-400 uppercase">Max Drawdown</div>
                    <div className={`text-base font-bold ${validationResult.oosMetrics.maxDrawdownPercent <= 6.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {validationResult.oosMetrics.maxDrawdownPercent.toFixed(1)}%
                    </div>
                    <div className="text-[9px] text-zinc-500">Threshold &le; 8%</div>
                  </div>
                </div>

                {/* Walk Forward Window breakdown */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-zinc-400">Sliding Walk-Forward Windows:</div>
                  <div className="space-y-1">
                    {validationResult.wfa.windows.map(win => (
                      <div
                        key={win.windowIndex}
                        className="flex items-center justify-between p-2 rounded bg-zinc-950/80 border border-zinc-800/80 text-[11px] font-mono"
                      >
                        <span className="text-zinc-300">Window #{win.windowIndex}</span>
                        <span className="text-zinc-400">IS Sharpe: {win.inSampleSharpe.toFixed(2)}</span>
                        <span className="text-zinc-400">OOS Sharpe: {win.outOfSampleSharpe.toFixed(2)}</span>
                        <span className={`font-semibold ${win.isRobust ? 'text-emerald-400' : 'text-rose-400'}`}>
                          WFE: {(win.walkForwardEfficiency * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Promote Button if passed */}
                {validationResult.wfa.passedRobustnessThreshold && !inspectedStrategy.isActive && (
                  <div className="pt-2">
                    <button
                      id="btn-deploy-validated-strat"
                      onClick={() => handlePromote(inspectedStrategy.id)}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                    >
                      <Award className="w-4 h-4" /> Deploy {inspectedStrategy.version} to Live Active Trading
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs">
                Click &quot;Validate on {selectedAsset}&quot; to run an automated out-of-sample Walk-Forward Analysis and test the strategy against unseen market bars.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
