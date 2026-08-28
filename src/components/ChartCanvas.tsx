import { FC, useRef, useEffect, useState, useCallback, MouseEvent } from 'react';
import { 
  Candle, 
  LiquidityLevel, 
  FairValueGap, 
  LiquiditySweep, 
  Trade, 
  AssetSymbol, 
  TimeFrame 
} from '../types/trading';
import { getPipMultiplier } from '../lib/ictEngine';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  Layers, 
  Maximize2 
} from 'lucide-react';

interface ChartCanvasProps {
  candles: Candle[];
  levels: LiquidityLevel[];
  fvgs: FairValueGap[];
  sweeps: LiquiditySweep[];
  trades: Trade[];
  asset: AssetSymbol;
  timeframe: TimeFrame;
}

export const ChartCanvas: FC<ChartCanvasProps> = ({
  candles,
  levels,
  fvgs,
  sweeps,
  trades,
  asset,
  timeframe
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport state: candle index offset and visible candle count
  const [visibleCandles, setVisibleCandles] = useState<number>(75);
  const [offsetIndex, setOffsetIndex] = useState<number>(0); // 0 = right-aligned (latest candles)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [hoveredCandle, setHoveredCandle] = useState<{ candle: Candle; index: number; x: number; y: number } | null>(null);

  // Layer Visibility Toggles
  const [showKillzones, setShowKillzones] = useState(true);
  const [showLiquidity, setShowLiquidity] = useState(true);
  const [showSweeps, setShowSweeps] = useState(true);
  const [showFvgs, setShowFvgs] = useState(true);
  const [showTrades, setShowTrades] = useState(true);

  const pip = getPipMultiplier(asset);
  const decimals = asset === 'USD/JPY' ? 3 : asset === 'BTC/USD' || asset === 'NAS100' ? 2 : asset === 'XAU/USD' ? 2 : 5;

  // Zoom handlers
  const handleZoom = (delta: number) => {
    setVisibleCandles(prev => Math.min(250, Math.max(20, prev + delta)));
  };

  const handleReset = () => {
    setVisibleCandles(75);
    setOffsetIndex(0);
  };

  // Canvas drawing loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Padding configuration
    const paddingRight = 75; // for price axis
    const paddingBottom = 30; // for time axis
    const paddingTop = 25;
    const chartWidth = width - paddingRight;
    const chartHeight = height - paddingBottom - paddingTop;

    // Slice candles for current view
    const totalCount = candles.length;
    const startIdx = Math.max(0, totalCount - visibleCandles - offsetIndex);
    const endIdx = Math.min(totalCount, totalCount - offsetIndex);
    const viewCandles = candles.slice(startIdx, endIdx);

    if (viewCandles.length === 0) return;

    // Calculate High & Low bounds in view
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const c of viewCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }

    // Add 10% vertical breathing room
    const priceRange = maxPrice - minPrice || 1.0;
    minPrice -= priceRange * 0.08;
    maxPrice += priceRange * 0.08;

    const candleWidth = chartWidth / viewCandles.length;
    const barWidth = Math.max(2, candleWidth * 0.72);

    const priceToY = (price: number) => {
      return paddingTop + chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
    };

    const indexToX = (localIndex: number) => {
      return localIndex * candleWidth + candleWidth / 2;
    };

    // 1. Background Clear
    const isDark = document.documentElement.classList.contains('dark') || true;
    ctx.fillStyle = isDark ? '#09090b' : '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // 2. Killzone Background Bands
    if (showKillzones) {
      for (let i = 0; i < viewCandles.length; i++) {
        const c = viewCandles[i];
        const kz = c.session;
        let kzColor = '';
        let kzName = '';

        if (kz === 'LONDON_OPEN') {
          kzColor = isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.12)';
          kzName = 'London Open';
        } else if (kz === 'NEW_YORK_AM') {
          kzColor = isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.12)';
          kzName = 'NY AM';
        } else if (kz === 'LONDON_CLOSE') {
          kzColor = isDark ? 'rgba(99, 102, 241, 0.07)' : 'rgba(99, 102, 241, 0.10)';
          kzName = 'London Close';
        } else if (kz === 'ASIAN') {
          kzColor = isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.08)';
          kzName = 'Asian Range';
        }

        if (kzColor) {
          ctx.fillStyle = kzColor;
          ctx.fillRect(i * candleWidth, paddingTop, candleWidth + 0.5, chartHeight);

          // Header session marker on first candle of session
          const prevCandle = i > 0 ? viewCandles[i - 1] : null;
          if (!prevCandle || prevCandle.session !== kz) {
            ctx.fillStyle = isDark ? '#71717a' : '#a1a1aa';
            ctx.font = '9px monospace';
            ctx.fillText(kzName, i * candleWidth + 4, paddingTop - 8);
          }
        }
      }
    }

    // 3. Grid Lines (Horizontal & Vertical)
    ctx.strokeStyle = isDark ? 'rgba(39, 39, 42, 0.7)' : 'rgba(228, 228, 231, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    const gridSteps = 6;
    for (let s = 0; s <= gridSteps; s++) {
      const priceVal = minPrice + (s / gridSteps) * (maxPrice - minPrice);
      const y = priceToY(priceVal);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price Axis Label on right
      ctx.fillStyle = isDark ? '#a1a1aa' : '#71717a';
      ctx.font = '10px monospace';
      ctx.fillText(priceVal.toFixed(decimals), chartWidth + 6, y + 3);
    }
    ctx.setLineDash([]); // reset

    // 4. Fair Value Gaps (FVG)
    if (showFvgs) {
      for (const fvg of fvgs) {
        // Check if FVG indices overlap the view
        const localBar2 = fvg.bar2Index - startIdx;
        if (localBar2 < -20 || localBar2 > viewCandles.length + 30) continue;

        const startX = Math.max(0, (fvg.bar2Index - startIdx) * candleWidth);
        const endX = Math.min(chartWidth, startX + (candleWidth * 18));
        const topY = priceToY(fvg.topPrice);
        const botY = priceToY(fvg.bottomPrice);
        const ceY = priceToY(fvg.consequentEncroachment);

        const fvgHeight = Math.abs(botY - topY);

        if (fvg.direction === 'BULLISH') {
          ctx.fillStyle = fvg.mitigated 
            ? (isDark ? 'rgba(16, 185, 129, 0.07)' : 'rgba(16, 185, 129, 0.10)')
            : (isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.25)');
          ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.6)' : 'rgba(16, 185, 129, 0.8)';
        } else {
          ctx.fillStyle = fvg.mitigated 
            ? (isDark ? 'rgba(239, 68, 68, 0.07)' : 'rgba(239, 68, 68, 0.10)')
            : (isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.25)');
          ctx.strokeStyle = isDark ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.8)';
        }

        ctx.fillRect(startX, topY, endX - startX, fvgHeight);
        ctx.strokeRect(startX, topY, endX - startX, fvgHeight);

        // 50% Consequent Encroachment (CE) center dashed line
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(startX, ceY);
        ctx.lineTo(endX, ceY);
        ctx.stroke();
        ctx.setLineDash([]);

        // FVG Label
        ctx.fillStyle = isDark ? '#d4d4d8' : '#3f3f46';
        ctx.font = '9px monospace';
        ctx.fillText(`FVG [CE: ${fvg.consequentEncroachment.toFixed(decimals)}]`, startX + 4, ceY - 3);
      }
    }

    // 5. Liquidity Levels (Horizontal Lines)
    if (showLiquidity) {
      for (const level of levels) {
        if (level.price < minPrice || level.price > maxPrice) continue;
        const y = priceToY(level.price);

        let color = '#71717a';
        let dash = [4, 4];

        if (level.type === 'PREVIOUS_DAY_HIGH') { color = '#f59e0b'; dash = [6, 2]; }
        else if (level.type === 'PREVIOUS_DAY_LOW') { color = '#06b6d4'; dash = [6, 2]; }
        else if (level.type === 'ASIAN_HIGH' || level.type === 'ASIAN_LOW') { color = '#a855f7'; dash = [3, 3]; }
        else if (level.type === 'EQUAL_HIGHS' || level.type === 'EQUAL_LOWS') { color = '#3b82f6'; dash = [2, 2]; }

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on left or right
        ctx.fillStyle = color;
        ctx.font = '10px monospace';
        ctx.fillText(`${level.label}: ${level.price.toFixed(decimals)}`, 6, y - 4);
      }
    }

    // 6. Candlesticks Rendering
    for (let i = 0; i < viewCandles.length; i++) {
      const c = viewCandles[i];
      const x = indexToX(i);
      const isBull = c.close >= c.open;

      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const candleColor = isBull ? '#10b981' : '#ef4444';

      // Draw Upper and Lower Wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw Candle Real Body
      const bodyY = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
      ctx.fillStyle = candleColor;
      ctx.fillRect(x - barWidth / 2, bodyY, barWidth, bodyHeight);
    }

    // 7. Liquidity Sweeps Badges & Arrows
    if (showSweeps) {
      for (const sweep of sweeps) {
        const localIndex = sweep.candleIndex - startIdx;
        if (localIndex < 0 || localIndex >= viewCandles.length) continue;

        const x = indexToX(localIndex);
        const isBullishSweep = sweep.direction === 'BULLISH_SWEEP'; // low swept, looking for buy
        const y = isBullishSweep ? priceToY(sweep.sweepPrice) + 16 : priceToY(sweep.sweepPrice) - 16;

        ctx.fillStyle = isBullishSweep ? '#10b981' : '#ef4444';
        ctx.beginPath();
        if (isBullishSweep) {
          // Upward Arrow
          ctx.moveTo(x, y - 6);
          ctx.lineTo(x - 5, y + 4);
          ctx.lineTo(x + 5, y + 4);
        } else {
          // Downward Arrow
          ctx.moveTo(x, y + 6);
          ctx.lineTo(x - 5, y - 4);
          ctx.lineTo(x + 5, y - 4);
        }
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.fillStyle = isBullishSweep ? '#10b981' : '#ef4444';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`SWEEP ${sweep.sweepDepthPips.toFixed(1)}p`, x - 24, isBullishSweep ? y + 14 : y - 8);
      }
    }

    // 8. Trades Orders (Entry, SL, TP Lines)
    if (showTrades) {
      for (const trade of trades) {
        const entryIdx = candles.findIndex(c => c.timestamp === trade.entryTimestamp);
        const exitIdx = trade.exitTimestamp 
          ? candles.findIndex(c => c.timestamp === trade.exitTimestamp) 
          : candles.length - 1;

        const localEntry = entryIdx - startIdx;
        const localExit = exitIdx - startIdx;

        if (localExit < 0 || localEntry >= viewCandles.length) continue;

        const entryX = Math.max(0, indexToX(Math.max(0, localEntry)));
        const exitX = Math.min(chartWidth, indexToX(Math.min(viewCandles.length - 1, localExit)));

        const entryY = priceToY(trade.entryPrice);
        const slY = priceToY(trade.stopLoss);
        const tpY = priceToY(trade.takeProfit);

        // Entry line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(entryX, entryY);
        ctx.lineTo(exitX, entryY);
        ctx.stroke();

        // SL line (Red Dashed)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(entryX, slY);
        ctx.lineTo(exitX, slY);
        ctx.stroke();

        // TP line (Green Dashed)
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(entryX, tpY);
        ctx.lineTo(exitX, tpY);
        ctx.stroke();
        ctx.setLineDash([]);

        // R:R and Direction Flag
        ctx.fillStyle = trade.direction === 'BUY' ? '#10b981' : '#ef4444';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(
          `${trade.direction} [R:R 1:${trade.riskRewardRatio.toFixed(1)}] ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(0)}`,
          entryX + 4,
          entryY - 4
        );
      }
    }

    // 9. Time Axis Labels at the Bottom
    ctx.fillStyle = isDark ? '#71717a' : '#a1a1aa';
    ctx.font = '9px monospace';
    const timeStep = Math.max(1, Math.floor(viewCandles.length / 7));
    for (let i = 0; i < viewCandles.length; i += timeStep) {
      const c = viewCandles[i];
      const x = indexToX(i);
      const timeStr = new Date(c.timestamp).toTimeString().slice(0, 5);
      ctx.fillText(timeStr, x - 12, height - 10);
    }

    // 10. Crosshair and Hovered Candle Overlay
    if (hoveredCandle) {
      const { x, y } = hoveredCandle;
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, height - paddingBottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [candles, levels, fvgs, sweeps, trades, asset, visibleCandles, offsetIndex, showKillzones, showLiquidity, showSweeps, showFvgs, showTrades, hoveredCandle, decimals]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse & Touch Pan / Drag handlers
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chartWidth = canvas.clientWidth - 75;
    const totalCount = candles.length;
    const startIdx = Math.max(0, totalCount - visibleCandles - offsetIndex);
    const endIdx = Math.min(totalCount, totalCount - offsetIndex);
    const viewCandles = candles.slice(startIdx, endIdx);

    if (x >= 0 && x <= chartWidth && viewCandles.length > 0) {
      const candleWidth = chartWidth / viewCandles.length;
      const localIdx = Math.floor(x / candleWidth);
      if (localIdx >= 0 && localIdx < viewCandles.length) {
        setHoveredCandle({
          candle: viewCandles[localIdx],
          index: startIdx + localIdx,
          x,
          y
        });
      }
    } else {
      setHoveredCandle(null);
    }

    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const candleWidth = chartWidth / visibleCandles;
      const deltaIndex = Math.round(deltaX / candleWidth);

      if (deltaIndex !== 0) {
        setOffsetIndex(prev => Math.max(0, Math.min(candles.length - visibleCandles, prev + deltaIndex)));
        setDragStartX(e.clientX);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredCandle(null);
  };

  return (
    <div id="chart-container" ref={containerRef} className="relative w-full h-[520px] bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col select-none">
      {/* Top Chart Toolbar: Layer Toggles & Zoom Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-xs z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-zinc-400 font-mono flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Overlays:
          </span>
          <button
            id="toggle-kz-layer"
            onClick={() => setShowKillzones(!showKillzones)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              showKillzones ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            Killzones
          </button>
          <button
            id="toggle-liq-layer"
            onClick={() => setShowLiquidity(!showLiquidity)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              showLiquidity ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            Liquidity
          </button>
          <button
            id="toggle-sweep-layer"
            onClick={() => setShowSweeps(!showSweeps)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              showSweeps ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            Sweeps
          </button>
          <button
            id="toggle-fvg-layer"
            onClick={() => setShowFvgs(!showFvgs)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              showFvgs ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            FVG (50% CE)
          </button>
          <button
            id="toggle-trade-layer"
            onClick={() => setShowTrades(!showTrades)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              showTrades ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            Trades (SL/TP)
          </button>
        </div>

        {/* Zoom & View Reset */}
        <div className="flex items-center gap-1">
          <button
            id="btn-zoom-in"
            onClick={() => handleZoom(-15)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            id="btn-zoom-out"
            onClick={() => handleZoom(15)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            id="btn-reset-view"
            onClick={handleReset}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Reset Zoom & Offset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hover Information Banner */}
      {hoveredCandle && (
        <div className="absolute top-10 left-3 z-10 px-3 py-1.5 rounded-md bg-zinc-900/90 border border-zinc-800 backdrop-blur-xs text-xs font-mono text-zinc-300 flex items-center gap-3">
          <span>T: <strong className="text-zinc-100">{new Date(hoveredCandle.candle.timestamp).toISOString().slice(11, 16)} UTC</strong></span>
          <span>O: <strong className="text-zinc-100">{hoveredCandle.candle.open.toFixed(decimals)}</strong></span>
          <span>H: <strong className="text-zinc-100">{hoveredCandle.candle.high.toFixed(decimals)}</strong></span>
          <span>L: <strong className="text-zinc-100">{hoveredCandle.candle.low.toFixed(decimals)}</strong></span>
          <span>C: <strong className={hoveredCandle.candle.close >= hoveredCandle.candle.open ? 'text-emerald-400' : 'text-rose-400'}>{hoveredCandle.candle.close.toFixed(decimals)}</strong></span>
          <span>ATR: <strong className="text-amber-400">{((hoveredCandle.candle.atr || 0) / pip).toFixed(1)}p</strong></span>
          <span>Session: <strong className="text-indigo-300">{hoveredCandle.candle.session}</strong></span>
        </div>
      )}

      {/* Canvas Element */}
      <div className="flex-1 w-full relative cursor-crosshair">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
    </div>
  );
};
