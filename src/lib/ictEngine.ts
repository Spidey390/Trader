import { 
  Candle, 
  KillzoneType, 
  LiquidityLevel, 
  LiquidityType, 
  LiquiditySweep, 
  FairValueGap, 
  Trade, 
  StrategyConfig, 
  AssetSymbol, 
  TimeFrame,
  AdaptiveExecutionParams,
  VolatilityRegime
} from '../types/trading';

/**
 * Returns the pip multiplier based on the asset symbol.
 * For JPY pairs (USD/JPY, GBP/JPY), 1 pip = 0.01
 * For Gold (XAU/USD), 1 pip = 0.10 ($0.10 move) or $1.00 index points
 * For BTC/USD, 1 pip = 1.00 ($1.00 move)
 * For NAS100, 1 pip = 1.00 ($1.00 move)
 * For standard Forex pairs (EUR/USD, GBP/USD, AUD/USD, USD/CAD, AUD/CAD), 1 pip = 0.0001
 */
export function getPipMultiplier(asset: AssetSymbol): number {
  if (asset === 'USD/JPY' || asset === 'GBP/JPY') return 0.01;
  if (asset === 'XAU/USD') return 0.10;
  if (asset === 'BTC/USD' || asset === 'NAS100') return 1.0;
  return 0.0001;
}

export function priceToPips(diff: number, asset: AssetSymbol): number {
  return Math.abs(diff) / getPipMultiplier(asset);
}

export function pipsToPrice(pips: number, asset: AssetSymbol): number {
  return pips * getPipMultiplier(asset);
}

/**
 * Computes Dynamic Adaptive Parameters based on Real-Time Market Volatility (ATR, Parkinson Volatility, ADX).
 * Dynamically scales:
 * - Stop-Loss Buffer: Prevents premature wick stop-outs in high ATR environments.
 * - Take-Profit Target / Minimum RR: Stretches targets in expansion regimes to capture larger imbalances.
 * - FVG Retest Model & Sensitivity: Switches to Consequent Encroachment (50% CE) or Deep Retest (75%) when volatility is elevated.
 * - Displacement ATR Multiplier & Liquidity Sweep Thresholds.
 */
export function calculateAdaptiveExecutionParams(
  candles: Candle[],
  config: StrategyConfig,
  asset: AssetSymbol,
  timeframe: TimeFrame
): AdaptiveExecutionParams {
  const pip = getPipMultiplier(asset);
  const atrs = candles.map(c => c.atr || (c.high - c.low)).filter(Boolean);
  const currentAtr = atrs.length > 0 ? atrs[atrs.length - 1] : 0.0015;
  const currentAtrPips = currentAtr / pip;

  // ATR percentile rank
  const sortedAtrs = [...atrs].sort((a, b) => a - b);
  const rank = sortedAtrs.findIndex(a => a >= currentAtr);
  const atrPercentile = sortedAtrs.length > 0 ? (rank / sortedAtrs.length) * 100 : 50;

  // Parkinson volatility estimation: sqrt(1/(4*ln(2)*N) * sum(ln(High/Low)^2))
  const n = Math.min(20, candles.length);
  let parkinsonSum = 0;
  for (let i = Math.max(0, candles.length - n); i < candles.length; i++) {
    const c = candles[i];
    if (c.low > 0) {
      parkinsonSum += Math.pow(Math.log(c.high / c.low), 2);
    }
  }
  const parkinsonVolatility = n > 0 ? Math.sqrt(parkinsonSum / (4 * Math.LN2 * n)) : 0.008;

  let regime: VolatilityRegime['regime'] = 'NORMAL_VOLATILITY';
  let adaptiveMultiplier = 1.0;
  let reasoning = 'Baseline parameters calibrated for normal liquidity and standard ATR range.';

  if (atrPercentile >= 80 || parkinsonVolatility > 0.014) {
    regime = 'HIGH_VOLATILITY';
    adaptiveMultiplier = 1.45;
    reasoning = 'High volatility expansion detected. Expanding SL buffer by 1.45x and locking entry to 50% Consequent Encroachment to avoid paying spread slippage.';
  } else if (parkinsonVolatility > 0.022) {
    regime = 'NEWS_EXPANSION';
    adaptiveMultiplier = 1.85;
    reasoning = 'News impulse regime active. Heightened wick volatility requires 1.85x SL buffer, strict 1.8x ATR displacement, and 0.5% guarded trade sizing.';
  } else if (atrPercentile <= 25) {
    regime = 'COMPRESSED_RANGE';
    adaptiveMultiplier = 0.80;
    reasoning = 'Compressed consolidation. Tightening SL buffer to 0.8x and lowering minimum FVG pip requirement to capture rapid intraday rotations.';
  }

  // Calculate dynamic adaptive values
  const effectiveSlBufferPips = Number((config.stopLossBufferPips * adaptiveMultiplier).toFixed(1));
  const effectiveMinDisplacementAtrMult = regime === 'HIGH_VOLATILITY' || regime === 'NEWS_EXPANSION'
    ? Number((config.minDisplacementAtrMult * 1.25).toFixed(2))
    : Number((config.minDisplacementAtrMult * (regime === 'COMPRESSED_RANGE' ? 0.9 : 1.0)).toFixed(2));
  
  const effectiveMinSweepPips = Number((config.minSweepPips * Math.max(0.7, adaptiveMultiplier * 0.9)).toFixed(1));
  const effectiveMaxSweepPips = Number((config.maxSweepPips * adaptiveMultiplier).toFixed(1));
  const effectiveMinFvgPips = Number((config.fvgMinPips * Math.max(0.6, adaptiveMultiplier * 0.85)).toFixed(1));

  let effectiveEntryModel = config.entryModel;
  if (regime === 'HIGH_VOLATILITY' || regime === 'NEWS_EXPANSION') {
    effectiveEntryModel = 'FVG_CE_50';
  }

  const effectiveMinRiskReward = regime === 'HIGH_VOLATILITY' || regime === 'NEWS_EXPANSION'
    ? Number((config.minRiskRewardRatio + 0.5).toFixed(2))
    : config.minRiskRewardRatio;

  const effectiveRiskPerTradePercent = regime === 'NEWS_EXPANSION' 
    ? Number((config.riskPerTradePercent * 0.5).toFixed(2)) 
    : config.riskPerTradePercent;

  return {
    asset,
    timeframe,
    regime,
    currentAtrPips: Number(currentAtrPips.toFixed(1)),
    atrPercentile: Number(atrPercentile.toFixed(1)),
    effectiveSlBufferPips,
    effectiveMinDisplacementAtrMult,
    effectiveMinSweepPips,
    effectiveMaxSweepPips,
    effectiveMinFvgPips,
    effectiveEntryModel,
    effectiveMinRiskReward,
    effectiveRiskPerTradePercent,
    adaptiveMultiplier: Number(adaptiveMultiplier.toFixed(2)),
    reasoning
  };
}

/**
 * Determines ICT Killzone based on UTC timestamp
 */
export function getKillzone(timestamp: number): KillzoneType {
  const date = new Date(timestamp);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Asian Killzone: 00:00 - 04:00 UTC
  if (timeInMinutes >= 0 && timeInMinutes < 240) {
    return 'ASIAN';
  }
  // London Open Killzone: 07:00 - 10:00 UTC (420 - 600 min)
  if (timeInMinutes >= 420 && timeInMinutes < 600) {
    return 'LONDON_OPEN';
  }
  // New York AM Killzone: 12:00 - 15:00 UTC (720 - 900 min)
  if (timeInMinutes >= 720 && timeInMinutes < 900) {
    return 'NEW_YORK_AM';
  }
  // London Close Killzone: 15:00 - 17:00 UTC (900 - 1020 min)
  if (timeInMinutes >= 900 && timeInMinutes < 1020) {
    return 'LONDON_CLOSE';
  }
  return 'OFF_HOURS';
}

/**
 * Calculates 14-period Average True Range (ATR) across an array of candles
 */
export function calculateATR(candles: Candle[], period: number = 14): Candle[] {
  if (candles.length === 0) return [];
  const result: Candle[] = [];
  const trs: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const current = candles[i];
    const prev = i > 0 ? candles[i - 1] : null;

    let tr = current.high - current.low;
    if (prev) {
      const tr1 = Math.abs(current.high - prev.close);
      const tr2 = Math.abs(current.low - prev.close);
      tr = Math.max(tr, tr1, tr2);
    }
    trs.push(tr);

    let atr = tr;
    if (i >= period) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += trs[j];
      }
      atr = sum / period;
    } else {
      let sum = 0;
      for (let j = 0; j <= i; j++) sum += trs[j];
      atr = sum / (i + 1);
    }

    result.push({
      ...current,
      atr,
      session: getKillzone(current.timestamp)
    });
  }

  return result;
}

/**
 * Identifies key Institutional Liquidity Levels:
 * - Previous Day High (PDH) / Low (PDL)
 * - Asian Session High / Low
 * - Equal Highs (EQH) / Equal Lows (EQL)
 * - Fractal Swing Highs / Lows (5-bar pivots)
 */
export function detectLiquidityLevels(candles: Candle[], asset: AssetSymbol): LiquidityLevel[] {
  const levels: LiquidityLevel[] = [];
  const pip = getPipMultiplier(asset);
  const eqThreshold = 2.5 * pip;

  // 1. Group candles by UTC calendar day for PDH / PDL
  const dayBuckets = new Map<string, Candle[]>();
  for (const c of candles) {
    const dayKey = new Date(c.timestamp).toISOString().slice(0, 10);
    if (!dayBuckets.has(dayKey)) dayBuckets.set(dayKey, []);
    dayBuckets.get(dayKey)!.push(c);
  }

  const sortedDays = Array.from(dayBuckets.keys()).sort();
  for (let i = 1; i < sortedDays.length; i++) {
    const prevDayCandles = dayBuckets.get(sortedDays[i - 1])!;
    const currDayCandles = dayBuckets.get(sortedDays[i])!;
    if (prevDayCandles.length === 0 || currDayCandles.length === 0) continue;

    let pdh = -Infinity;
    let pdl = Infinity;
    for (const c of prevDayCandles) {
      if (c.high > pdh) pdh = c.high;
      if (c.low < pdl) pdl = c.low;
    }

    const firstCandleTimestamp = currDayCandles[0].timestamp;
    levels.push({
      id: `pdh-${sortedDays[i]}`,
      type: 'PREVIOUS_DAY_HIGH',
      price: pdh,
      timestamp: firstCandleTimestamp,
      swept: false,
      label: `PDH (${sortedDays[i - 1]})`
    });
    levels.push({
      id: `pdl-${sortedDays[i]}`,
      type: 'PREVIOUS_DAY_LOW',
      price: pdl,
      timestamp: firstCandleTimestamp,
      swept: false,
      label: `PDL (${sortedDays[i - 1]})`
    });
  }

  // 2. Asian Session High & Low
  // Asian Killzone is 00:00 - 04:00 UTC
  for (const [dayKey, dayCandles] of dayBuckets.entries()) {
    const asianCandles = dayCandles.filter(c => {
      const kz = getKillzone(c.timestamp);
      return kz === 'ASIAN';
    });

    if (asianCandles.length >= 3) {
      let asianHigh = -Infinity;
      let asianLow = Infinity;
      for (const c of asianCandles) {
        if (c.high > asianHigh) asianHigh = c.high;
        if (c.low < asianLow) asianLow = c.low;
      }
      const asianEndTimestamp = asianCandles[asianCandles.length - 1].timestamp;

      levels.push({
        id: `asian-high-${dayKey}`,
        type: 'ASIAN_HIGH',
        price: asianHigh,
        timestamp: asianEndTimestamp,
        swept: false,
        label: `Asian High (${dayKey})`
      });
      levels.push({
        id: `asian-low-${dayKey}`,
        type: 'ASIAN_LOW',
        price: asianLow,
        timestamp: asianEndTimestamp,
        swept: false,
        label: `Asian Low (${dayKey})`
      });
    }
  }

  // 3. Swing Highs and Swing Lows (5-bar fractal)
  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    const isSwingHigh = c.high > candles[i - 2].high && 
                        c.high > candles[i - 1].high && 
                        c.high > candles[i + 1].high && 
                        c.high > candles[i + 2].high;

    const isSwingLow = c.low < candles[i - 2].low && 
                       c.low < candles[i - 1].low && 
                       c.low < candles[i + 1].low && 
                       c.low < candles[i + 2].low;

    if (isSwingHigh) {
      levels.push({
        id: `sh-${i}-${c.timestamp}`,
        type: 'SWING_HIGH',
        price: c.high,
        timestamp: c.timestamp,
        swept: false,
        label: `Swing High`
      });
    }
    if (isSwingLow) {
      levels.push({
        id: `sl-${i}-${c.timestamp}`,
        type: 'SWING_LOW',
        price: c.low,
        timestamp: c.timestamp,
        swept: false,
        label: `Swing Low`
      });
    }
  }

  // 4. Equal Highs / Equal Lows (clustering swing points within tolerance)
  const swingHighs = levels.filter(l => l.type === 'SWING_HIGH');
  for (let i = 0; i < swingHighs.length; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      if (Math.abs(swingHighs[i].price - swingHighs[j].price) <= eqThreshold) {
        levels.push({
          id: `eqh-${swingHighs[i].id}-${swingHighs[j].id}`,
          type: 'EQUAL_HIGHS',
          price: (swingHighs[i].price + swingHighs[j].price) / 2,
          timestamp: swingHighs[j].timestamp,
          swept: false,
          label: 'Equal Highs (EQH)'
        });
      }
    }
  }

  const swingLows = levels.filter(l => l.type === 'SWING_LOW');
  for (let i = 0; i < swingLows.length; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      if (Math.abs(swingLows[i].price - swingLows[j].price) <= eqThreshold) {
        levels.push({
          id: `eql-${swingLows[i].id}-${swingLows[j].id}`,
          type: 'EQUAL_LOWS',
          price: (swingLows[i].price + swingLows[j].price) / 2,
          timestamp: swingLows[j].timestamp,
          swept: false,
          label: 'Equal Lows (EQL)'
        });
      }
    }
  }

  return levels;
}

/**
 * Detects Fair Value Gaps (FVG) across candles
 * Bullish FVG: Candle[i-2].high < Candle[i].low (Imbalance between bar 1 high & bar 3 low)
 * Bearish FVG: Candle[i-2].low > Candle[i].high (Imbalance between bar 1 low & bar 3 high)
 */
export function detectFairValueGaps(candles: Candle[], asset: AssetSymbol, minPips: number = 2.0): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  const pip = getPipMultiplier(asset);
  const minPriceDiff = minPips * pip;

  for (let i = 2; i < candles.length; i++) {
    const bar1 = candles[i - 2];
    const bar2 = candles[i - 1];
    const bar3 = candles[i];

    // Bullish FVG: Bar 3 Low > Bar 1 High
    if (bar3.low > bar1.high) {
      const size = bar3.low - bar1.high;
      if (size >= minPriceDiff) {
        const topPrice = bar3.low;
        const bottomPrice = bar1.high;
        const ce = (topPrice + bottomPrice) / 2;

        fvgs.push({
          id: `fvg-bull-${i}-${bar2.timestamp}`,
          direction: 'BULLISH',
          topPrice,
          bottomPrice,
          consequentEncroachment: ce,
          sizePips: priceToPips(size, asset),
          bar1Index: i - 2,
          bar2Index: i - 1,
          bar3Index: i,
          timestamp: bar2.timestamp,
          mitigated: false,
          mitigationDepth: 0
        });
      }
    }

    // Bearish FVG: Bar 1 Low > Bar 3 High
    if (bar1.low > bar3.high) {
      const size = bar1.low - bar3.high;
      if (size >= minPriceDiff) {
        const topPrice = bar1.low;
        const bottomPrice = bar3.high;
        const ce = (topPrice + bottomPrice) / 2;

        fvgs.push({
          id: `fvg-bear-${i}-${bar2.timestamp}`,
          direction: 'BEARISH',
          topPrice,
          bottomPrice,
          consequentEncroachment: ce,
          sizePips: priceToPips(size, asset),
          bar1Index: i - 2,
          bar2Index: i - 1,
          bar3Index: i,
          timestamp: bar2.timestamp,
          mitigated: false,
          mitigationDepth: 0
        });
      }
    }
  }

  // Calculate mitigation for each FVG by scanning subsequent candles
  for (const fvg of fvgs) {
    for (let k = fvg.bar3Index + 1; k < candles.length; k++) {
      const c = candles[k];
      if (fvg.direction === 'BULLISH') {
        // Price dropping back into the bullish gap from above
        if (c.low <= fvg.topPrice) {
          const depth = Math.min(1.0, (fvg.topPrice - c.low) / (fvg.topPrice - fvg.bottomPrice));
          fvg.mitigationDepth = Math.max(fvg.mitigationDepth, depth);
          if (c.low <= fvg.consequentEncroachment) {
            fvg.mitigated = true;
            if (!fvg.mitigatedAt) fvg.mitigatedAt = c.timestamp;
          }
          // If price closes completely below the FVG, it becomes inverted (IFVG)
          if (c.close < fvg.bottomPrice) {
            fvg.isInverted = true;
          }
        }
      } else {
        // Bearish FVG: Price rising into the bearish gap from below
        if (c.high >= fvg.bottomPrice) {
          const depth = Math.min(1.0, (c.high - fvg.bottomPrice) / (fvg.topPrice - fvg.bottomPrice));
          fvg.mitigationDepth = Math.max(fvg.mitigationDepth, depth);
          if (c.high >= fvg.consequentEncroachment) {
            fvg.mitigated = true;
            if (!fvg.mitigatedAt) fvg.mitigatedAt = c.timestamp;
          }
          if (c.close > fvg.topPrice) {
            fvg.isInverted = true;
          }
        }
      }
    }
  }

  return fvgs;
}

/**
 * Scans for Liquidity Sweeps
 */
export function detectLiquiditySweeps(
  candles: Candle[], 
  levels: LiquidityLevel[], 
  asset: AssetSymbol,
  config: StrategyConfig
): LiquiditySweep[] {
  const sweeps: LiquiditySweep[] = [];
  const pip = getPipMultiplier(asset);

  for (let i = 5; i < candles.length; i++) {
    const candle = candles[i];
    const kz = getKillzone(candle.timestamp);

    // Filter by allowed Killzones if specified
    if (config.allowedKillzones.length > 0 && !config.allowedKillzones.includes(kz)) {
      continue;
    }

    const candleRange = candle.high - candle.low;
    if (candleRange === 0) continue;

    // Check against active liquidity levels created BEFORE this candle
    for (const level of levels) {
      if (level.timestamp >= candle.timestamp) continue;
      if (!config.allowedLiquidityTypes.includes(level.type)) continue;

      // 1. Bullish Sweep (Sell-side liquidity swept: Low goes below level, looking for BUY)
      if (level.type === 'PREVIOUS_DAY_LOW' || level.type === 'PREVIOUS_WEEK_LOW' || level.type === 'ASIAN_LOW' || level.type === 'EQUAL_LOWS' || level.type === 'SWING_LOW') {
        if (candle.low < level.price) {
          const sweepDepth = (level.price - candle.low) / pip;
          if (sweepDepth >= config.minSweepPips && sweepDepth <= config.maxSweepPips) {
            // Check rejection: candle closes back above level OR bottom wick is substantial
            const lowerWick = Math.min(candle.open, candle.close) - candle.low;
            const wickRatio = lowerWick / candleRange;

            if (wickRatio >= config.minRejectionWickRatio || candle.close > level.price) {
              sweeps.push({
                id: `sweep-${level.id}-${i}`,
                levelId: level.id,
                levelType: level.type,
                levelPrice: level.price,
                sweepPrice: candle.low,
                candleIndex: i,
                timestamp: candle.timestamp,
                direction: 'BULLISH_SWEEP',
                sweepDepthPips: sweepDepth,
                rejectionWickRatio: wickRatio,
                killzone: kz
              });
              level.swept = true;
              level.sweptAt = candle.timestamp;
              level.sweepCandleIndex = i;
            }
          }
        }
      }

      // 2. Bearish Sweep (Buy-side liquidity swept: High goes above level, looking for SELL)
      if (level.type === 'PREVIOUS_DAY_HIGH' || level.type === 'PREVIOUS_WEEK_HIGH' || level.type === 'ASIAN_HIGH' || level.type === 'EQUAL_HIGHS' || level.type === 'SWING_HIGH') {
        if (candle.high > level.price) {
          const sweepDepth = (candle.high - level.price) / pip;
          if (sweepDepth >= config.minSweepPips && sweepDepth <= config.maxSweepPips) {
            const upperWick = candle.high - Math.max(candle.open, candle.close);
            const wickRatio = upperWick / candleRange;

            if (wickRatio >= config.minRejectionWickRatio || candle.close < level.price) {
              sweeps.push({
                id: `sweep-${level.id}-${i}`,
                levelId: level.id,
                levelType: level.type,
                levelPrice: level.price,
                sweepPrice: candle.high,
                candleIndex: i,
                timestamp: candle.timestamp,
                direction: 'BEARISH_SWEEP',
                sweepDepthPips: sweepDepth,
                rejectionWickRatio: wickRatio,
                killzone: kz
              });
              level.swept = true;
              level.sweptAt = candle.timestamp;
              level.sweepCandleIndex = i;
            }
          }
        }
      }
    }
  }

  return sweeps;
}

/**
 * Executes full ICT Strategy Simulation on historical candles:
 * 1. Sweep occurs in configured Killzone
 * 2. Strong displacement candle leaves sweep (Body >= 65%, Body >= minDisplacementAtrMult * ATR)
 * 3. FVG forms in the direction of the move
 * 4. Price retests FVG within maxFvgAgeBars
 * 5. Entry triggered, SL set at sweep extreme + buffer, TP set at opposing liquidity or target RR
 * 6. Trade managed until SL, TP, or session end
 */
export function executeStrategySimulation(
  candles: Candle[],
  config: StrategyConfig,
  asset: AssetSymbol,
  timeframe: TimeFrame,
  initialEquity: number = 100000
): { trades: Trade[]; levels: LiquidityLevel[]; fvgs: FairValueGap[]; sweeps: LiquiditySweep[] } {
  const candlesWithAtr = calculateATR(candles);
  const levels = detectLiquidityLevels(candlesWithAtr, asset);
  
  // Compute adaptive parameters if enabled
  const adaptiveParams = config.enableAdaptiveVolatility 
    ? calculateAdaptiveExecutionParams(candlesWithAtr, config, asset, timeframe)
    : null;

  const minFvgPips = adaptiveParams ? adaptiveParams.effectiveMinFvgPips : config.fvgMinPips;
  const fvgs = detectFairValueGaps(candlesWithAtr, asset, minFvgPips);
  const sweeps = detectLiquiditySweeps(candlesWithAtr, levels, asset, config);
  const trades: Trade[] = [];
  const pip = getPipMultiplier(asset);

  let currentEquity = initialEquity;
  let activeTrade: Trade | null = null;
  let consecutiveLosses = 0;

  for (let i = 10; i < candlesWithAtr.length; i++) {
    const currentCandle = candlesWithAtr[i];
    const prevCandle = candlesWithAtr[i - 1];

    // 1. Manage existing open trade
    if (activeTrade && activeTrade.status === 'OPEN') {
      let isClosed = false;

      // Update MAE and MFE tracking
      if (activeTrade.direction === 'BUY') {
        const currentFavorable = (currentCandle.high - activeTrade.entryPrice) / pip;
        const currentAdverse = (activeTrade.entryPrice - currentCandle.low) / pip;
        activeTrade.maxFavorableExcursionPips = Math.max(activeTrade.maxFavorableExcursionPips, currentFavorable);
        activeTrade.maxAdverseExcursionPips = Math.max(activeTrade.maxAdverseExcursionPips, currentAdverse);

        // Check SL hit
        if (currentCandle.low <= activeTrade.stopLoss) {
          activeTrade.status = 'CLOSED_SL';
          activeTrade.exitPrice = activeTrade.stopLoss;
          activeTrade.exitTimestamp = currentCandle.timestamp;
          const lossPips = (activeTrade.stopLoss - activeTrade.entryPrice) / pip;
          activeTrade.pnlPips = lossPips;
          activeTrade.pnl = -activeTrade.riskAmount;
          activeTrade.returnPercent = (activeTrade.pnl / currentEquity) * 100;
          currentEquity += activeTrade.pnl;
          consecutiveLosses++;
          activeTrade.aiPostMortem = `Stopped out at ${activeTrade.stopLoss.toFixed(5)}. Sweep bottom was penetrated. MAE reached ${activeTrade.maxAdverseExcursionPips.toFixed(1)} pips.`;
          isClosed = true;
        } 
        // Check TP hit
        else if (currentCandle.high >= activeTrade.takeProfit) {
          activeTrade.status = 'CLOSED_TP';
          activeTrade.exitPrice = activeTrade.takeProfit;
          activeTrade.exitTimestamp = currentCandle.timestamp;
          const winPips = (activeTrade.takeProfit - activeTrade.entryPrice) / pip;
          activeTrade.pnlPips = winPips;
          activeTrade.pnl = activeTrade.riskAmount * activeTrade.riskRewardRatio;
          activeTrade.returnPercent = (activeTrade.pnl / currentEquity) * 100;
          currentEquity += activeTrade.pnl;
          consecutiveLosses = 0;
          activeTrade.aiPostMortem = `Target achieved at opposing liquidity ${activeTrade.takeProfit.toFixed(5)}. Exact R:R = 1:${activeTrade.riskRewardRatio.toFixed(2)}.`;
          isClosed = true;
        }
      } else {
        // Bearish SELL Trade
        const currentFavorable = (activeTrade.entryPrice - currentCandle.low) / pip;
        const currentAdverse = (currentCandle.high - activeTrade.entryPrice) / pip;
        activeTrade.maxFavorableExcursionPips = Math.max(activeTrade.maxFavorableExcursionPips, currentFavorable);
        activeTrade.maxAdverseExcursionPips = Math.max(activeTrade.maxAdverseExcursionPips, currentAdverse);

        // Check SL hit
        if (currentCandle.high >= activeTrade.stopLoss) {
          activeTrade.status = 'CLOSED_SL';
          activeTrade.exitPrice = activeTrade.stopLoss;
          activeTrade.exitTimestamp = currentCandle.timestamp;
          const lossPips = (activeTrade.entryPrice - activeTrade.stopLoss) / pip;
          activeTrade.pnlPips = lossPips;
          activeTrade.pnl = -activeTrade.riskAmount;
          activeTrade.returnPercent = (activeTrade.pnl / currentEquity) * 100;
          currentEquity += activeTrade.pnl;
          consecutiveLosses++;
          activeTrade.aiPostMortem = `Stopped out at ${activeTrade.stopLoss.toFixed(5)}. Sweep high was violated. MAE reached ${activeTrade.maxAdverseExcursionPips.toFixed(1)} pips.`;
          isClosed = true;
        }
        // Check TP hit
        else if (currentCandle.low <= activeTrade.takeProfit) {
          activeTrade.status = 'CLOSED_TP';
          activeTrade.exitPrice = activeTrade.takeProfit;
          activeTrade.exitTimestamp = currentCandle.timestamp;
          const winPips = (activeTrade.entryPrice - activeTrade.takeProfit) / pip;
          activeTrade.pnlPips = winPips;
          activeTrade.pnl = activeTrade.riskAmount * activeTrade.riskRewardRatio;
          activeTrade.returnPercent = (activeTrade.pnl / currentEquity) * 100;
          currentEquity += activeTrade.pnl;
          consecutiveLosses = 0;
          activeTrade.aiPostMortem = `Target achieved at opposing liquidity ${activeTrade.takeProfit.toFixed(5)}. Exact R:R = 1:${activeTrade.riskRewardRatio.toFixed(2)}.`;
          isClosed = true;
        }
      }

      if (isClosed) {
        trades.push({ ...activeTrade });
        activeTrade = null;
      }
      continue;
    }

    // Circuit breaker check
    if (consecutiveLosses >= config.consecutiveLossLimit) {
      // Cooldown for 10 bars
      if (i % 10 !== 0) continue;
      consecutiveLosses = 0; // reset cooldown
    }

    // 2. Scan for valid ICT setup:
    const recentSweeps = sweeps.filter(s => s.candleIndex <= i && s.candleIndex >= i - 15);
    if (recentSweeps.length === 0) continue;

    const minDisplacementMult = adaptiveParams ? adaptiveParams.effectiveMinDisplacementAtrMult : config.minDisplacementAtrMult;
    const entryModel = adaptiveParams ? adaptiveParams.effectiveEntryModel : config.entryModel;
    const slBuffer = adaptiveParams ? adaptiveParams.effectiveSlBufferPips : config.stopLossBufferPips;
    const minRR = adaptiveParams ? adaptiveParams.effectiveMinRiskReward : config.minRiskRewardRatio;
    const riskPercent = adaptiveParams ? adaptiveParams.effectiveRiskPerTradePercent : config.riskPerTradePercent;

    for (const sweep of recentSweeps) {
      if (activeTrade) break;

      // Find FVGs formed after the sweep in the direction of the trade
      const relevantFvgs = fvgs.filter(f => 
        f.bar2Index > sweep.candleIndex && 
        f.bar3Index <= i &&
        (sweep.direction === 'BULLISH_SWEEP' ? f.direction === 'BULLISH' : f.direction === 'BEARISH') &&
        (i - f.bar3Index) <= config.maxFvgAgeBars
      );

      if (relevantFvgs.length === 0) continue;

      const fvg = relevantFvgs[relevantFvgs.length - 1]; // latest FVG
      const displacementCandle = candlesWithAtr[fvg.bar2Index];
      const atr = displacementCandle.atr || 1.0;
      const body = Math.abs(displacementCandle.close - displacementCandle.open);
      const totalRange = displacementCandle.high - displacementCandle.low;
      const bodyRatio = totalRange > 0 ? body / totalRange : 0;
      const displacementAtrRatio = body / atr;

      // Validate displacement strength
      if (bodyRatio < config.minBodyToRangeRatio || displacementAtrRatio < minDisplacementMult) {
        continue;
      }

      // Check Retest condition on the current candle
      let entryPrice = 0;
      let isTriggered = false;

      if (sweep.direction === 'BULLISH_SWEEP') {
        // Looking for BUY entry inside Bullish FVG [fvg.bottomPrice to fvg.topPrice]
        const targetEntry = entryModel === 'FVG_CE_50' ? fvg.consequentEncroachment :
                            entryModel === 'FVG_DEEP_75' ? fvg.bottomPrice + (fvg.topPrice - fvg.bottomPrice) * 0.25 :
                            fvg.topPrice;

        if (currentCandle.low <= targetEntry && prevCandle.low > targetEntry) {
          entryPrice = targetEntry;
          isTriggered = true;
        }

        if (isTriggered) {
          const slPrice = sweep.sweepPrice - (slBuffer * pip);
          const riskDistance = entryPrice - slPrice;
          if (riskDistance <= 0) continue;

          // Find opposing liquidity for TP
          let tpPrice = entryPrice + (riskDistance * minRR);
          if (config.tpTargetModel === 'OPPOSING_LIQUIDITY') {
            const opposingLevels = levels.filter(l => 
              l.timestamp < currentCandle.timestamp && 
              l.price > entryPrice && 
              (l.type === 'PREVIOUS_DAY_HIGH' || l.type === 'ASIAN_HIGH' || l.type === 'SWING_HIGH' || l.type === 'EQUAL_HIGHS')
            );
            if (opposingLevels.length > 0) {
              const nearestOpposing = opposingLevels.reduce((prev, curr) => 
                (curr.price < prev.price ? curr : prev), opposingLevels[0]);
              const opposingRR = (nearestOpposing.price - entryPrice) / riskDistance;
              if (opposingRR >= minRR) {
                tpPrice = nearestOpposing.price;
              }
            }
          }

          const rr = (tpPrice - entryPrice) / riskDistance;
          if (rr < minRR) continue;

          const riskAmount = (currentEquity * riskPercent) / 100;
          const lotSize = Math.max(0.01, Number((riskAmount / (riskDistance / pip * 10)).toFixed(2)));

          activeTrade = {
            id: `trade-buy-${i}-${currentCandle.timestamp}`,
            strategyId: config.id,
            strategyName: config.name,
            asset,
            timeframe,
            direction: 'BUY',
            entryPrice,
            stopLoss: slPrice,
            takeProfit: tpPrice,
            riskRewardRatio: rr,
            lotSize,
            riskAmount,
            entryTimestamp: currentCandle.timestamp,
            pnl: 0,
            pnlPips: 0,
            returnPercent: 0,
            status: 'OPEN',
            killzone: sweep.killzone,
            sweepType: sweep.levelType,
            sweepPrice: sweep.sweepPrice,
            fvgId: fvg.id,
            fvgTop: fvg.topPrice,
            fvgBottom: fvg.bottomPrice,
            fvgConsequentEncroachment: fvg.consequentEncroachment,
            entryType: entryModel,
            displacementAtrMult: displacementAtrRatio,
            maxFavorableExcursionPips: 0,
            maxAdverseExcursionPips: 0
          };
          break;
        }
      } else {
        // Bearish Sweep -> Looking for SELL entry inside Bearish FVG [fvg.bottomPrice to fvg.topPrice]
        const targetEntry = entryModel === 'FVG_CE_50' ? fvg.consequentEncroachment :
                            entryModel === 'FVG_DEEP_75' ? fvg.topPrice - (fvg.topPrice - fvg.bottomPrice) * 0.25 :
                            fvg.bottomPrice;

        if (currentCandle.high >= targetEntry && prevCandle.high < targetEntry) {
          entryPrice = targetEntry;
          isTriggered = true;
        }

        if (isTriggered) {
          const slPrice = sweep.sweepPrice + (slBuffer * pip);
          const riskDistance = slPrice - entryPrice;
          if (riskDistance <= 0) continue;

          let tpPrice = entryPrice - (riskDistance * minRR);
          if (config.tpTargetModel === 'OPPOSING_LIQUIDITY') {
            const opposingLevels = levels.filter(l => 
              l.timestamp < currentCandle.timestamp && 
              l.price < entryPrice && 
              (l.type === 'PREVIOUS_DAY_LOW' || l.type === 'ASIAN_LOW' || l.type === 'SWING_LOW' || l.type === 'EQUAL_LOWS')
            );
            if (opposingLevels.length > 0) {
              const nearestOpposing = opposingLevels.reduce((prev, curr) => 
                (curr.price < prev.price ? curr : prev), opposingLevels[0]);
              const opposingRR = (entryPrice - nearestOpposing.price) / riskDistance;
              if (opposingRR >= minRR) {
                tpPrice = nearestOpposing.price;
              }
            }
          }

          const rr = (entryPrice - tpPrice) / riskDistance;
          if (rr < minRR) continue;

          const riskAmount = (currentEquity * riskPercent) / 100;
          const lotSize = Math.max(0.01, Number((riskAmount / (riskDistance / pip * 10)).toFixed(2)));

          activeTrade = {
            id: `trade-sell-${i}-${currentCandle.timestamp}`,
            strategyId: config.id,
            strategyName: config.name,
            asset,
            timeframe,
            direction: 'SELL',
            entryPrice,
            stopLoss: slPrice,
            takeProfit: tpPrice,
            riskRewardRatio: rr,
            lotSize,
            riskAmount,
            entryTimestamp: currentCandle.timestamp,
            pnl: 0,
            pnlPips: 0,
            returnPercent: 0,
            status: 'OPEN',
            killzone: sweep.killzone,
            sweepType: sweep.levelType,
            sweepPrice: sweep.sweepPrice,
            fvgId: fvg.id,
            fvgTop: fvg.topPrice,
            fvgBottom: fvg.bottomPrice,
            fvgConsequentEncroachment: fvg.consequentEncroachment,
            entryType: entryModel,
            displacementAtrMult: displacementAtrRatio,
            maxFavorableExcursionPips: 0,
            maxAdverseExcursionPips: 0
          };
          break;
        }
      }
    }
  }

  // If there's an open trade at the end of the data, close at market
  if (activeTrade && activeTrade.status === 'OPEN') {
    const lastCandle = candlesWithAtr[candlesWithAtr.length - 1];
    activeTrade.exitPrice = lastCandle.close;
    activeTrade.exitTimestamp = lastCandle.timestamp;
    const diff = activeTrade.direction === 'BUY' 
      ? activeTrade.exitPrice - activeTrade.entryPrice 
      : activeTrade.entryPrice - activeTrade.exitPrice;
    activeTrade.pnlPips = diff / pip;
    activeTrade.pnl = (activeTrade.pnlPips / ((activeTrade.entryPrice - activeTrade.stopLoss) / pip)) * activeTrade.riskAmount;
    activeTrade.status = activeTrade.pnl >= 0 ? 'CLOSED_TP' : 'CLOSED_SL';
    trades.push(activeTrade);
  }

  return { trades, levels, fvgs, sweeps };
}
