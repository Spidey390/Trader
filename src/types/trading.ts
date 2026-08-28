export type AssetSymbol = 
  | 'EUR/USD' 
  | 'GBP/USD' 
  | 'USD/JPY' 
  | 'AUD/USD' 
  | 'USD/CAD' 
  | 'GBP/JPY' 
  | 'AUD/CAD' 
  | 'XAU/USD' 
  | 'BTC/USD' 
  | 'NAS100';

export type TimeFrame = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export type KillzoneType = 'ASIAN' | 'LONDON_OPEN' | 'NEW_YORK_AM' | 'LONDON_CLOSE' | 'OFF_HOURS';

export interface Candle {
  timestamp: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  atr?: number;
  session?: KillzoneType;
}

export type LiquidityType = 
  | 'PREVIOUS_DAY_HIGH' 
  | 'PREVIOUS_DAY_LOW' 
  | 'PREVIOUS_WEEK_HIGH' 
  | 'PREVIOUS_WEEK_LOW' 
  | 'ASIAN_HIGH' 
  | 'ASIAN_LOW' 
  | 'EQUAL_HIGHS' 
  | 'EQUAL_LOWS' 
  | 'SWING_HIGH' 
  | 'SWING_LOW';

export interface LiquidityLevel {
  id: string;
  type: LiquidityType;
  price: number;
  timestamp: number;
  swept: boolean;
  sweptAt?: number;
  sweepCandleIndex?: number;
  label: string;
}

export interface LiquiditySweep {
  id: string;
  levelId: string;
  levelType: LiquidityType;
  levelPrice: number;
  sweepPrice: number; // Extreme wick price
  candleIndex: number;
  timestamp: number;
  direction: 'BULLISH_SWEEP' | 'BEARISH_SWEEP'; // BULLISH_SWEEP = low swept, looking for BUY; BEARISH_SWEEP = high swept, looking for SELL
  sweepDepthPips: number;
  rejectionWickRatio: number; // wick length / candle range
  killzone: KillzoneType;
}

export interface FairValueGap {
  id: string;
  direction: 'BULLISH' | 'BEARISH';
  topPrice: number;
  bottomPrice: number;
  consequentEncroachment: number; // 50% midpoint
  sizePips: number;
  bar1Index: number;
  bar2Index: number;
  bar3Index: number;
  timestamp: number;
  sweptLowOrHighId?: string;
  mitigated: boolean;
  mitigatedAt?: number;
  mitigationDepth: number; // 0 to 1 (e.g. 0.5 = CE reached)
  isInverted?: boolean; // IFVG
}

export interface MarketStructureShift {
  id: string;
  direction: 'BULLISH' | 'BEARISH';
  breakoutPrice: number;
  displacementCandleIndex: number;
  displacementAtrRatio: number; // body / ATR
  bodyPercent: number; // body / total candle height
  timestamp: number;
}

export type TradeDirection = 'BUY' | 'SELL';

export type TradeStatus = 'PENDING_ENTRY' | 'OPEN' | 'CLOSED_TP' | 'CLOSED_SL' | 'CLOSED_CIRCUIT_BREAKER';

export interface Trade {
  id: string;
  strategyId: string;
  strategyName: string;
  asset: AssetSymbol;
  timeframe: TimeFrame;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  lotSize: number;
  riskAmount: number;
  entryTimestamp: number;
  exitTimestamp?: number;
  exitPrice?: number;
  pnl: number;
  pnlPips: number;
  returnPercent: number;
  status: TradeStatus;
  
  // ICT Attribution Metadata
  killzone: KillzoneType;
  sweepType: LiquidityType;
  sweepPrice: number;
  fvgId?: string;
  fvgTop?: number;
  fvgBottom?: number;
  fvgConsequentEncroachment?: number;
  entryType: 'FVG_TOUCH' | 'FVG_CE_50' | 'FVG_DEEP_75' | 'IFVG_RETEST' | 'MARKET_STRUCTURE_SHIFT';
  displacementAtrMult: number;
  maxFavorableExcursionPips: number;
  maxAdverseExcursionPips: number;
  aiPostMortem?: string;
}

export interface StrategyConfig {
  id: string;
  version: string;
  name: string;
  description: string;
  isBaseline: boolean;
  isActive: boolean;
  createdAt: number;
  parentStrategyId?: string;
  generation: number;

  // Filter Rules
  allowedKillzones: KillzoneType[];
  targetAssets: AssetSymbol[];
  timeframes: TimeFrame[];
  
  // Liquidity Rules
  allowedLiquidityTypes: LiquidityType[];
  minSweepPips: number;
  maxSweepPips: number;
  minRejectionWickRatio: number; // e.g. 0.35

  // Displacement & MSS Rules
  minDisplacementAtrMult: number; // e.g. 1.3
  minBodyToRangeRatio: number; // e.g. 0.65

  // FVG Rules
  fvgMinPips: number;
  fvgMaxPips: number;
  entryModel: 'FVG_TOUCH' | 'FVG_CE_50' | 'FVG_DEEP_75' | 'IFVG_RETEST';
  maxFvgAgeBars: number; // how many bars before FVG expires

  // Risk Management
  riskPerTradePercent: number; // e.g. 1.0%
  stopLossBufferPips: number; // e.g. 2.0 pips beyond sweep wick
  minRiskRewardRatio: number; // e.g. 2.0
  tpTargetModel: 'OPPOSING_LIQUIDITY' | 'FIXED_RR' | 'HYBRID_PARTIALS';
  maxDailyDrawdownPercent: number; // e.g. 4%
  consecutiveLossLimit: number; // e.g. 3

  // Volatility Filter & Dynamic Parameter Optimization
  volatilityRegimeFilter: ('ALL' | 'HIGH_VOLATILITY' | 'NORMAL_VOLATILITY' | 'COMPRESSED_RANGE')[];
  minAtrPips: number;
  enableAdaptiveVolatility?: boolean;
  adaptiveSlAtrMult?: number; // e.g. 1.5x ATR scaling
  adaptiveTpMinRR?: number; // e.g. 2.5
}

export interface AdaptiveExecutionParams {
  asset: AssetSymbol;
  timeframe: TimeFrame;
  regime: VolatilityRegime['regime'];
  currentAtrPips: number;
  atrPercentile: number;
  effectiveSlBufferPips: number;
  effectiveMinDisplacementAtrMult: number;
  effectiveMinSweepPips: number;
  effectiveMaxSweepPips: number;
  effectiveMinFvgPips: number;
  effectiveEntryModel: 'FVG_TOUCH' | 'FVG_CE_50' | 'FVG_DEEP_75' | 'IFVG_RETEST';
  effectiveMinRiskReward: number;
  effectiveRiskPerTradePercent: number;
  adaptiveMultiplier: number;
  reasoning: string;
}

export interface OpportunityScoreItem {
  asset: AssetSymbol;
  timeframe: TimeFrame;
  suitabilityScore: number; // 0 - 100
  rating: 'PRIME_SETUP' | 'FAVORABLE' | 'NEUTRAL' | 'POOR_CONDITIONS';
  killzone: KillzoneType;
  killzoneActive: boolean;
  regime: VolatilityRegime['regime'];
  currentPrice: number;
  priceChange24h: number;
  spreadToAtrRatio: number;
  recentSweepsCount: number;
  activeFvgsCount: number;
  trendAlignment: 'BULLISH' | 'BEARISH' | 'RANGING';
  recommendedEntryModel: string;
  adaptiveSlPips: number;
  adaptiveTpPips: number;
  catalystNotice?: string;
}

export interface DiscoveryPatternCandidate {
  id: string;
  patternName: string;
  category: 'KILLZONE_EXPANSION' | 'JUDAS_SWING_REVERSAL' | 'IFVG_MOMENTUM' | 'MACRO_LIQUIDITY_RUN' | 'VOLATILITY_BREAKOUT';
  discoveredAt: number;
  targetAssets: AssetSymbol[];
  targetTimeframes: TimeFrame[];
  hypothesis: string;
  anomalyDetected: string;
  proposedConfig: Partial<StrategyConfig>;
  
  // 4-Stage Quant Validation Pipeline
  stage: 'STAGE_1_BACKTEST' | 'STAGE_2_OOS' | 'STAGE_3_WFA' | 'STAGE_4_MONTE_CARLO' | 'PROMOTED_LIVE' | 'REJECTED';
  backtestMetrics?: BacktestMetrics;
  oosMetrics?: BacktestMetrics;
  wfaResult?: WalkForwardAnalysisResult;
  monteCarloResult?: MonteCarloSimulationResult;
  deflatedSharpeRatio?: number;
  validationScore: number; // 0 - 100
  passedAllGates: boolean;
  rejectionReason?: string;
}

export interface VolatilityRegime {
  regime: 'HIGH_VOLATILITY' | 'NORMAL_VOLATILITY' | 'COMPRESSED_RANGE' | 'NEWS_EXPANSION';
  currentAtr: number;
  atrPercentile: number; // 0 - 100%
  parkinsonVolatility: number;
  adxStrength: number;
  spreadPips: number;
  recommendation: string;
}

export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %
  profitFactor: number;
  netProfit: number;
  netReturnPercent: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  deflatedSharpeRatio: number;
  averageTradeReturnPips: number;
  averageRR: number;
  expectancy: number; // expected return per trade
  maxConsecutiveLosses: number;
  equityCurve: { timestamp: number; equity: number; drawdownPercent: number }[];
}

export interface WalkForwardWindow {
  windowIndex: number;
  inSampleStart: number;
  inSampleEnd: number;
  outOfSampleStart: number;
  outOfSampleEnd: number;
  inSampleSharpe: number;
  outOfSampleSharpe: number;
  inSampleProfit: number;
  outOfSampleProfit: number;
  walkForwardEfficiency: number; // outOfSampleProfit / inSampleProfit (annualized/pro-rated)
  isRobust: boolean;
}

export interface WalkForwardAnalysisResult {
  overallWFE: number; // e.g. 0.68 (68%)
  passedRobustnessThreshold: boolean;
  windows: WalkForwardWindow[];
  inSampleMetrics: BacktestMetrics;
  outOfSampleMetrics: BacktestMetrics;
}

export interface MonteCarloSimulationResult {
  simulationsCount: number;
  confidence95MaxDrawdown: number;
  riskOfRuinPercent: number;
  simulatedEquityCurves: { percentile: number; points: { tradeNumber: number; equity: number }[] }[];
  profitableScenariosRatio: number;
}

export interface AIStrategyHypothesis {
  hypothesisId: string;
  analysisSummary: string;
  identifiedWeakness: string;
  proposedModifications: Partial<StrategyConfig>;
  rationale: string;
  expectedEdgeImprovement: string;
  targetRegime: string;
}

