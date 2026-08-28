import { FC, useState, useEffect } from 'react';
import { 
  AssetSymbol, 
  StrategyConfig, 
  DiscoveryPatternCandidate 
} from '../types/trading';
import { 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Play, 
  Flame, 
  Layers, 
  RefreshCw,
  Zap,
  Sliders
} from 'lucide-react';

interface StrategyDiscoveryEngineProps {
  activeStrategy: StrategyConfig;
  currentAsset: AssetSymbol;
  onPromoteCandidate: (candidate: DiscoveryPatternCandidate) => void;
  onSynthesizeNewWithAI: () => void;
  isSynthesizing: boolean;
}

export const StrategyDiscoveryEngine: FC<StrategyDiscoveryEngineProps> = ({
  activeStrategy,
  currentAsset,
  onPromoteCandidate,
  onSynthesizeNewWithAI,
  isSynthesizing
}) => {
  const [candidates, setCandidates] = useState<DiscoveryPatternCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<DiscoveryPatternCandidate | null>(null);

  const fetchDiscoveryCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/strategy/discover-patterns?asset=${encodeURIComponent(currentAsset)}`);
      const data = await res.json();
      if (data.candidates) {
        setCandidates(data.candidates);
        if (data.candidates.length > 0 && !selectedCandidate) {
          setSelectedCandidate(data.candidates[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch discovery patterns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscoveryCandidates();
  }, [currentAsset, activeStrategy]);

  const getStageBadge = (stage: DiscoveryPatternCandidate['stage']) => {
    switch (stage) {
      case 'PROMOTED_LIVE':
        return { text: 'Stage 4: Passed All Gates (Live Ready)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'STAGE_4_MONTE_CARLO':
        return { text: 'Stage 4: Monte Carlo Permutation Gate', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'STAGE_3_WFA':
        return { text: 'Stage 3: Walk-Forward Analysis Gate', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'STAGE_2_OOS':
        return { text: 'Stage 2: Out-Of-Sample Gate', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      default:
        return { text: 'Stage 1: In-Sample Backtest Gate', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  };

  return (
    <div id="strategy-discovery-engine" className="space-y-6">
      {/* Top Banner: Discovery Protocol Header */}
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-zinc-100 uppercase font-mono">
              Automated Strategy Discovery & Quantitative Validation Pipeline
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              4-Stage Rigorous Gate
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Synthesizes candidate models across ICT archetypes (Judas Swing, IFVG Momentum, Macro Run) and tests them through Out-Of-Sample (OOS), Walk-Forward Analysis (WFA), and 1,000-Trial Monte Carlo simulations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-scan-discovery"
            disabled={loading}
            onClick={fetchDiscoveryCandidates}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Rescan Candidates</span>
          </button>

          <button
            id="btn-ai-synthesize-candidate"
            disabled={isSynthesizing}
            onClick={onSynthesizeNewWithAI}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
            <span>{isSynthesizing ? 'Synthesizing with Gemini AI...' : 'AI Mutate Next Gen'}</span>
          </button>
        </div>
      </div>

      {/* 4-Stage Quantitative Gate Visualizer */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <h3 className="text-xs font-bold uppercase font-mono text-zinc-400 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Institutional 4-Stage Validation Gate Architecture
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase block">Stage 1: In-Sample</span>
            <span className="text-zinc-100 font-bold">Historical Backtest</span>
            <span className="text-[10px] text-zinc-500 block">Req: PF &ge; 1.35, Win Rate &ge; 45%</span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase block">Stage 2: Out-Of-Sample</span>
            <span className="text-zinc-100 font-bold">Unseen Window Test</span>
            <span className="text-[10px] text-zinc-500 block">Req: PF &ge; 1.20, Net Profit &gt; 0</span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase block">Stage 3: Walk-Forward</span>
            <span className="text-zinc-100 font-bold">WFA Efficiency (WFE)</span>
            <span className="text-[10px] text-zinc-500 block">Req: WFE &ge; 55% across 4 windows</span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase block">Stage 4: Monte Carlo</span>
            <span className="text-zinc-100 font-bold">1,000 Trials & DSR</span>
            <span className="text-[10px] text-zinc-500 block">Req: 95% DD &le; 8.5%, Ruin = 0%</span>
          </div>
        </div>
      </div>

      {/* Discovery Candidates Grid & Deep Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Candidates List (5 cols) */}
        <div className="lg:col-span-5 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs text-zinc-400 uppercase px-1">
            <span>Discovered Archetypes ({candidates.length})</span>
            <span>Score / Status</span>
          </div>

          {candidates.map(candidate => {
            const isSelected = selectedCandidate?.id === candidate.id;
            const stageBadge = getStageBadge(candidate.stage);

            return (
              <div
                key={candidate.id}
                onClick={() => setSelectedCandidate(candidate)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-zinc-850 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30' 
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-100">{candidate.patternName}</h4>
                    <span className="text-[10px] text-zinc-500">{candidate.category}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${
                      candidate.validationScore >= 80 ? 'text-emerald-400' :
                      candidate.validationScore >= 65 ? 'text-blue-400' : 'text-zinc-400'
                    }`}>
                      {candidate.validationScore}/100
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${stageBadge.color}`}>
                    {stageBadge.text}
                  </span>
                  {candidate.passedAllGates && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Candidate Deep Inspector (7 cols) */}
        {selectedCandidate ? (
          <div className="lg:col-span-7 p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">{selectedCandidate.patternName}</h3>
                <span className="text-[11px] text-zinc-400">Target Instruments: {selectedCandidate.targetAssets.join(', ')}</span>
              </div>

              {selectedCandidate.passedAllGates ? (
                <button
                  id="btn-promote-candidate-active"
                  onClick={() => onPromoteCandidate(selectedCandidate)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Promote to Active Execution</span>
                </button>
              ) : (
                <span className="text-[11px] text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {selectedCandidate.rejectionReason || 'Undergoing quantitative validation gates'}
                </span>
              )}
            </div>

            {/* Hypothesis & Detected Anomaly */}
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Underlying Market Hypothesis</span>
                <p className="text-zinc-300 text-xs leading-relaxed">{selectedCandidate.hypothesis}</p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Detected Structural Anomaly</span>
                <p className="text-zinc-400 text-xs leading-relaxed">{selectedCandidate.anomalyDetected}</p>
              </div>
            </div>

            {/* Validation Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">In-Sample PF</span>
                <span className="text-sm font-bold text-zinc-100">{selectedCandidate.backtestMetrics.profitFactor.toFixed(2)}</span>
                <span className="text-[10px] text-zinc-500 block">Win Rate: {selectedCandidate.backtestMetrics.winRate}%</span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">Out-Of-Sample PF</span>
                <span className="text-sm font-bold text-emerald-400">{selectedCandidate.oosMetrics.profitFactor.toFixed(2)}</span>
                <span className="text-[10px] text-zinc-500 block">Net PnL: +${selectedCandidate.oosMetrics.netProfit.toFixed(0)}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">Walk-Forward (WFE)</span>
                <span className="text-sm font-bold text-blue-400">{(selectedCandidate.wfaResult.overallWFE * 100).toFixed(1)}%</span>
                <span className="text-[10px] text-zinc-500 block">4 Rolling Windows</span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">95% Conf Max DD</span>
                <span className="text-sm font-bold text-purple-400">{selectedCandidate.monteCarloResult.confidence95MaxDrawdown.toFixed(1)}%</span>
                <span className="text-[10px] text-zinc-500 block">1,000 Trials</span>
              </div>
            </div>

            {/* Strategy Parameters Preview */}
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5">
              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Configured Parameters</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div><span className="text-zinc-500">Killzones:</span> <span className="text-zinc-300 font-semibold">{selectedCandidate.proposedConfig.allowedKillzones?.join(', ')}</span></div>
                <div><span className="text-zinc-500">Entry Model:</span> <span className="text-zinc-300 font-semibold">{selectedCandidate.proposedConfig.entryModel}</span></div>
                <div><span className="text-zinc-500">Min Displacement:</span> <span className="text-zinc-300 font-semibold">{selectedCandidate.proposedConfig.minDisplacementAtrMult}x ATR</span></div>
                <div><span className="text-zinc-500">Target Min RR:</span> <span className="text-zinc-300 font-semibold">1:{selectedCandidate.proposedConfig.minRiskRewardRatio}</span></div>
                <div><span className="text-zinc-500">SL Buffer:</span> <span className="text-zinc-300 font-semibold">{selectedCandidate.proposedConfig.stopLossBufferPips} pips</span></div>
                <div><span className="text-zinc-500">Adaptive Vol:</span> <span className="text-emerald-400 font-semibold">{selectedCandidate.proposedConfig.enableAdaptiveVolatility ? 'Enabled' : 'Disabled'}</span></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 py-16 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
            Select a candidate from the left list to inspect its quantitative validation metrics and underlying hypothesis.
          </div>
        )}
      </div>
    </div>
  );
};
