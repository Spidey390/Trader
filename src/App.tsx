import { useState, useEffect, useCallback } from 'react';
import { 
  AssetSymbol, 
  TimeFrame, 
  Candle, 
  LiquidityLevel, 
  FairValueGap, 
  LiquiditySweep, 
  Trade, 
  StrategyConfig, 
  VolatilityRegime, 
  BacktestMetrics, 
  WalkForwardAnalysisResult, 
  MonteCarloSimulationResult, 
  AIStrategyHypothesis,
  DiscoveryPatternCandidate 
} from './types/trading';
import { Header, NavTab } from './components/Header';
import { ChartCanvas } from './components/ChartCanvas';
import { StrategyEvolutionHub } from './components/StrategyEvolutionHub';
import { BacktestValidator } from './components/BacktestValidator';
import { VolatilityMatrix, AssetVolatilityItem } from './components/VolatilityMatrix';
import { TradeJournal } from './components/TradeJournal';
import { ManualStrategyEditor } from './components/ManualStrategyEditor';
import { OpportunityScanner } from './components/OpportunityScanner';
import { AdaptiveVolatilityOptimizer } from './components/AdaptiveVolatilityOptimizer';
import { StrategyDiscoveryEngine } from './components/StrategyDiscoveryEngine';
import { getKillzone } from './lib/ictEngine';
import { 
  Activity, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  Sliders, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Play, 
  Cpu, 
  AlertCircle,
  Sparkles,
  Search
} from 'lucide-react';

export default function App() {
  const [currentAsset, setCurrentAsset] = useState<AssetSymbol>('EUR/USD');
  const [currentTimeframe, setCurrentTimeframe] = useState<TimeFrame>('5m');
  const [activeTab, setActiveTab] = useState<NavTab>('terminal');

  // Market & ICT Indicator State
  const [candles, setCandles] = useState<Candle[]>([]);
  const [levels, setLevels] = useState<LiquidityLevel[]>([]);
  const [fvgs, setFvgs] = useState<FairValueGap[]>([]);
  const [sweeps, setSweeps] = useState<LiquiditySweep[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [volatility, setVolatility] = useState<VolatilityRegime | null>(null);

  // Strategy & Evolution State
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<StrategyConfig | null>(null);
  const [autoEvolutionActive, setAutoEvolutionActive] = useState<boolean>(true);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [latestHypothesis, setLatestHypothesis] = useState<AIStrategyHypothesis | null>(null);

  // Validation & WFA State
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{
    wfa: WalkForwardAnalysisResult;
    isMetrics: BacktestMetrics;
    oosMetrics: BacktestMetrics;
  } | null>(null);
  const [backtestMetrics, setBacktestMetrics] = useState<BacktestMetrics | null>(null);
  const [wfaResult, setWfaResult] = useState<WalkForwardAnalysisResult | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloSimulationResult | null>(null);

  // Volatility Matrix
  const [volatilityMatrix, setVolatilityMatrix] = useState<AssetVolatilityItem[]>([]);

  // AI Diagnostics State
  const [aiDiagnosis, setAiDiagnosis] = useState<{ summary: string; weaknesses: string[]; recommendations: string[] } | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);

  // UI Drawer / Modal
  const [isStrategyEditorOpen, setIsStrategyEditorOpen] = useState<boolean>(false);

  // Account Balance
  const accountEquity = 100000 + trades.reduce((acc, t) => acc + t.pnl, 0);
  const netPnl = trades.reduce((acc, t) => acc + t.pnl, 0);

  // Fetch Strategies Catalog
  const fetchStrategies = useCallback(async () => {
    try {
      const res = await fetch('/api/strategies');
      const data = await res.json();
      if (data.strategies && data.strategies.length > 0) {
        setStrategies(data.strategies);
        const active = data.strategies.find((s: StrategyConfig) => s.isActive) || data.strategies[0];
        setActiveStrategy(active);
      }
    } catch (err) {
      console.error('Failed to fetch strategies', err);
    }
  }, []);

  // Fetch Market Data for Current Asset & Timeframe
  const fetchMarketData = useCallback(async (asset: AssetSymbol, tf: TimeFrame) => {
    try {
      const res = await fetch(`/api/market/data?asset=${encodeURIComponent(asset)}&timeframe=${tf}&count=350`);
      const data = await res.json();
      setCandles(data.candles || []);
      setLevels(data.levels || []);
      setFvgs(data.fvgs || []);
      setSweeps(data.sweeps || []);
      setTrades(data.trades || []);
      setVolatility(data.volatility || null);
    } catch (err) {
      console.error('Failed to fetch market data', err);
    }
  }, []);

  // Fetch Multi-Asset Volatility Matrix
  const fetchVolatilityMatrix = useCallback(async () => {
    try {
      const res = await fetch('/api/market/volatility-matrix');
      const data = await res.json();
      setVolatilityMatrix(data.matrix || []);
    } catch (err) {
      console.error('Failed to fetch volatility matrix', err);
    }
  }, []);

  // Initial Boot
  useEffect(() => {
    fetchStrategies();
    fetchVolatilityMatrix();
  }, [fetchStrategies, fetchVolatilityMatrix]);

  useEffect(() => {
    fetchMarketData(currentAsset, currentTimeframe);
  }, [currentAsset, currentTimeframe, fetchMarketData]);

  // Live periodic polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarketData(currentAsset, currentTimeframe);
      fetchVolatilityMatrix();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentAsset, currentTimeframe, fetchMarketData, fetchVolatilityMatrix]);

  // Promote Strategy to Active
  const handlePromoteStrategy = async (strategyId: string) => {
    try {
      const res = await fetch('/api/strategies/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId })
      });
      const data = await res.json();
      if (data.success) {
        await fetchStrategies();
        await fetchMarketData(currentAsset, currentTimeframe);
      }
    } catch (err) {
      console.error('Failed to promote strategy', err);
    }
  };

  // Synthesize New Mutated Strategy via AI Quant
  const handleSynthesizeStrategy = async (target: string) => {
    if (!activeStrategy) return;
    setIsSynthesizing(true);
    try {
      const res = await fetch('/api/ai/synthesize-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentStrategy: activeStrategy,
          optimizationTarget: target,
          historicalTrades: trades,
          marketRegimes: volatility
        })
      });
      const data = await res.json();
      if (data.hypothesis) {
        setLatestHypothesis(data.hypothesis);
      }
      await fetchStrategies();
      // Automatically run validation on the synthesized strategy
      if (data.mutatedStrategy) {
        await handleRunControlledValidation(data.mutatedStrategy);
      }
    } catch (err) {
      console.error('Failed to synthesize strategy', err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Run Controlled Walk-Forward Validation Gate
  const handleRunControlledValidation = async (strategyToValidate: StrategyConfig) => {
    setIsValidating(true);
    try {
      const res = await fetch('/api/strategy/walkforward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyConfig: strategyToValidate,
          asset: currentAsset,
          timeframe: currentTimeframe,
          windowsCount: 4
        })
      });
      const data = await res.json();
      if (data.walkForward) {
        setValidationResult({
          wfa: data.walkForward,
          isMetrics: data.walkForward.inSampleMetrics,
          oosMetrics: data.walkForward.outOfSampleMetrics
        });
        setWfaResult(data.walkForward);
      }
      if (data.monteCarlo) {
        setMonteCarloResult(data.monteCarlo);
      }
    } catch (err) {
      console.error('Failed to run validation', err);
    } finally {
      setIsValidating(false);
    }
  };

  // Run Full Comprehensive Quantitative Audit
  const handleRunComprehensiveTest = async (asset: AssetSymbol, tf: TimeFrame, trials: number) => {
    if (!activeStrategy) return;
    setIsValidating(true);
    try {
      const [btRes, wfaRes] = await Promise.all([
        fetch('/api/strategy/backtest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            strategyConfig: activeStrategy,
            asset,
            timeframe: tf,
            trialsTested: trials
          })
        }),
        fetch('/api/strategy/walkforward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            strategyConfig: activeStrategy,
            asset,
            timeframe: tf,
            windowsCount: 4
          })
        })
      ]);

      const btData = await btRes.json();
      const wfaData = await wfaRes.json();

      setBacktestMetrics(btData.metrics || null);
      setWfaResult(wfaData.walkForward || null);
      setMonteCarloResult(wfaData.monteCarlo || null);
    } catch (err) {
      console.error('Failed to run comprehensive test', err);
    } finally {
      setIsValidating(false);
    }
  };

  // Run AI Post-Mortem Diagnostics
  const handleDiagnoseTrades = async () => {
    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/ai/diagnose-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades,
          currentStrategy: activeStrategy,
          volatility
        })
      });
      const data = await res.json();
      setAiDiagnosis(data);
    } catch (err) {
      console.error('Failed to diagnose trades', err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Save manual strategy parameters
  const handleSaveManualStrategy = (updated: StrategyConfig) => {
    setActiveStrategy(updated);
    setStrategies(prev => prev.map(s => s.id === updated.id ? updated : s));
    fetchMarketData(currentAsset, currentTimeframe);
  };

  // Promote a discovered pattern candidate to active execution
  const handlePromoteCandidate = async (candidate: DiscoveryPatternCandidate) => {
    if (!candidate.passedAllGates) return;
    const promotedConfig: StrategyConfig = {
      ...(activeStrategy || {}),
      ...candidate.proposedConfig,
      id: candidate.id,
      name: candidate.patternName,
      description: candidate.hypothesis,
      version: `v${(activeStrategy?.generation || 1) + 1}.0-Discovered`,
      isActive: true,
      generation: (activeStrategy?.generation || 1) + 1,
      createdAt: Date.now()
    } as StrategyConfig;

    try {
      const res = await fetch('/api/strategy/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId: promotedConfig.id, strategy: promotedConfig })
      });
      const data = await res.json();
      if (data.success && data.activeStrategy) {
        setActiveStrategy(data.activeStrategy);
        setStrategies(prev => [data.activeStrategy, ...prev.map(s => ({ ...s, isActive: false }))]);
        fetchMarketData(currentAsset, currentTimeframe);
        setActiveTab('terminal');
      }
    } catch (err) {
      console.error('Failed to promote candidate', err);
    }
  };

  const currentKillzone = candles.length > 0 
    ? getKillzone(candles[candles.length - 1].timestamp) 
    : 'OFF_HOURS';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased">
      {/* Top Header & Navigation Bar */}
      {activeStrategy && (
        <Header
          currentAsset={currentAsset}
          currentTimeframe={currentTimeframe}
          onAssetChange={setCurrentAsset}
          onTimeframeChange={setCurrentTimeframe}
          activeStrategy={activeStrategy}
          currentKillzone={currentKillzone}
          autoEvolutionActive={autoEvolutionActive}
          onToggleAutoEvolution={() => setAutoEvolutionActive(!autoEvolutionActive)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          accountEquity={accountEquity}
          netPnl={netPnl}
          openStrategyEditor={() => setIsStrategyEditorOpen(true)}
        />
      )}

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: ICT Live Terminal */}
        {activeTab === 'terminal' && (
          <div className="space-y-6">
            {/* Chart Canvas with Full ICT Overlays */}
            <ChartCanvas
              candles={candles}
              levels={levels}
              fvgs={fvgs}
              sweeps={sweeps}
              trades={trades}
              asset={currentAsset}
              timeframe={currentTimeframe}
            />

            {/* Terminal Bottom Grid: Setup Breakdown & Active Volatility Telemetry */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: ICT Setup Sequence Monitor (7 cols) */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-zinc-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" /> ICT Sequence Execution Engine
                  </h3>
                  <span className="text-[11px] text-zinc-500">Autonomous Filter Protocol</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase block">1. Killzone</span>
                    <span className="text-emerald-400 font-bold text-xs">{currentKillzone}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase block">2. Sweeps Detected</span>
                    <span className="text-amber-400 font-bold text-xs">{sweeps.length} Sweeps</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase block">3. FVGs Formed</span>
                    <span className="text-blue-400 font-bold text-xs">{fvgs.length} Imbalances</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase block">4. Trades Filled</span>
                    <span className="text-purple-400 font-bold text-xs">{trades.length} Positions</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-200">Execution Rule:</strong> Entry triggers only when price sweeps a recognized high-timeframe liquidity level (PDH, PDL, Asian H/L) during London Open or New York AM, expands with displacement body &ge; {activeStrategy?.minDisplacementAtrMult || 1.3}x ATR, and retests the 50% Consequent Encroachment (CE) of the resulting Fair Value Gap with strict stop loss placed below the sweep extreme.
                </div>
              </div>

              {/* Right: Volatility & Regime Quick Status (5 cols) */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-zinc-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> Live Volatility Regime
                  </h3>
                  <span className="text-[11px] text-zinc-500">{currentAsset}</span>
                </div>

                {volatility ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-400">Current Regime:</span>
                      <span className="font-bold text-amber-400">{volatility.regime.replace('_', ' ')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 uppercase block">ATR Percentile</span>
                        <span className="text-zinc-200 font-bold text-sm">{volatility.atrPercentile}%</span>
                      </div>
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 uppercase block">Parkinson Vol</span>
                        <span className="text-zinc-200 font-bold text-sm">{(volatility.parkinsonVolatility * 100).toFixed(2)}%</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300">
                      {volatility.recommendation}
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-500 text-xs py-6 text-center">Loading volatility metrics...</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Multi-Asset Opportunity Scanner */}
        {activeTab === 'scanner' && activeStrategy && (
          <OpportunityScanner
            currentAsset={currentAsset}
            currentTimeframe={currentTimeframe}
            onSelectOpportunity={(asset, tf) => {
              setCurrentAsset(asset);
              setCurrentTimeframe(tf);
              fetchMarketData(asset, tf);
              setActiveTab('terminal');
            }}
            activeStrategy={activeStrategy}
          />
        )}

        {/* TAB: Adaptive Volatility Parameter Optimizer */}
        {activeTab === 'adaptive' && activeStrategy && (
          <AdaptiveVolatilityOptimizer
            currentAsset={currentAsset}
            currentTimeframe={currentTimeframe}
            onAssetChange={setCurrentAsset}
            onTimeframeChange={setCurrentTimeframe}
            activeStrategy={activeStrategy}
            volatility={volatility}
            onUpdateStrategy={handleSaveManualStrategy}
          />
        )}

        {/* TAB: Pattern Discovery Engine */}
        {activeTab === 'discovery' && activeStrategy && (
          <StrategyDiscoveryEngine
            activeStrategy={activeStrategy}
            currentAsset={currentAsset}
            onPromoteCandidate={handlePromoteCandidate}
            onSynthesizeNewWithAI={handleSynthesizeStrategy}
            isSynthesizing={isSynthesizing}
          />
        )}

        {/* TAB 2: Strategy Evolution & AI Lab */}
        {activeTab === 'evolution' && activeStrategy && (
          <StrategyEvolutionHub
            strategies={strategies}
            activeStrategy={activeStrategy}
            onPromoteStrategy={handlePromoteStrategy}
            onSynthesizeNewStrategy={handleSynthesizeStrategy}
            isSynthesizing={isSynthesizing}
            latestHypothesis={latestHypothesis}
            onRunControlledValidation={handleRunControlledValidation}
            validationResult={validationResult}
            isValidating={isValidating}
            selectedAsset={currentAsset}
            selectedTimeframe={currentTimeframe}
          />
        )}

        {/* TAB 3: Walk-Forward & Monte Carlo Validator */}
        {activeTab === 'validator' && activeStrategy && (
          <BacktestValidator
            strategy={activeStrategy}
            currentAsset={currentAsset}
            currentTimeframe={currentTimeframe}
            backtestMetrics={backtestMetrics}
            wfaResult={wfaResult}
            monteCarloResult={monteCarloResult}
            trades={trades}
            onRunComprehensiveTest={handleRunComprehensiveTest}
            isRunning={isValidating}
          />
        )}

        {/* TAB 4: Volatility Matrix */}
        {activeTab === 'volatility' && (
          <VolatilityMatrix
            matrix={volatilityMatrix}
            onSelectAsset={(asset) => {
              setCurrentAsset(asset);
              setActiveTab('terminal');
            }}
          />
        )}

        {/* TAB 5: Trade Journal */}
        {activeTab === 'journal' && (
          <TradeJournal
            trades={trades}
            onDiagnoseTrades={handleDiagnoseTrades}
            aiDiagnosis={aiDiagnosis}
            isDiagnosing={isDiagnosing}
          />
        )}
      </main>

      {/* Manual Strategy Configuration Modal */}
      {activeStrategy && (
        <ManualStrategyEditor
          isOpen={isStrategyEditorOpen}
          onClose={() => setIsStrategyEditorOpen(false)}
          strategy={activeStrategy}
          onSaveStrategy={handleSaveManualStrategy}
        />
      )}
    </div>
  );
}
