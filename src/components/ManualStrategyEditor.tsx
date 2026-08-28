import { FC, useState } from 'react';
import { StrategyConfig, KillzoneType, LiquidityType } from '../types/trading';
import { X, Save, Sliders, Shield, Target, Zap } from 'lucide-react';

interface ManualStrategyEditorProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyConfig;
  onSaveStrategy: (updated: StrategyConfig) => void;
}

export const ManualStrategyEditor: FC<ManualStrategyEditorProps> = ({
  isOpen,
  onClose,
  strategy,
  onSaveStrategy
}) => {
  const [config, setConfig] = useState<StrategyConfig>({ ...strategy });

  if (!isOpen) return null;

  const killzonesList: { id: KillzoneType; label: string }[] = [
    { id: 'LONDON_OPEN', label: 'London Open (07:00 - 10:00 UTC)' },
    { id: 'NEW_YORK_AM', label: 'New York AM (12:00 - 15:00 UTC)' },
    { id: 'LONDON_CLOSE', label: 'London Close (15:00 - 17:00 UTC)' },
    { id: 'ASIAN', label: 'Asian Range (00:00 - 04:00 UTC)' }
  ];

  const liquidityList: { id: LiquidityType; label: string }[] = [
    { id: 'PREVIOUS_DAY_HIGH', label: 'Previous Day High (PDH)' },
    { id: 'PREVIOUS_DAY_LOW', label: 'Previous Day Low (PDL)' },
    { id: 'ASIAN_HIGH', label: 'Asian High' },
    { id: 'ASIAN_LOW', label: 'Asian Low' },
    { id: 'EQUAL_HIGHS', label: 'Equal Highs (EQH)' },
    { id: 'EQUAL_LOWS', label: 'Equal Lows (EQL)' },
    { id: 'SWING_HIGH', label: 'Fractal Swing High' },
    { id: 'SWING_LOW', label: 'Fractal Swing Low' }
  ];

  const toggleKz = (kz: KillzoneType) => {
    setConfig(prev => {
      const exists = prev.allowedKillzones.includes(kz);
      const updated = exists 
        ? prev.allowedKillzones.filter(k => k !== kz)
        : [...prev.allowedKillzones, kz];
      return { ...prev, allowedKillzones: updated };
    });
  };

  const toggleLiq = (liq: LiquidityType) => {
    setConfig(prev => {
      const exists = prev.allowedLiquidityTypes.includes(liq);
      const updated = exists 
        ? prev.allowedLiquidityTypes.filter(l => l !== liq)
        : [...prev.allowedLiquidityTypes, liq];
      return { ...prev, allowedLiquidityTypes: updated };
    });
  };

  const handleSave = () => {
    onSaveStrategy(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-zinc-100">
              Strategy Parameter Matrix ({config.name})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs">
          {/* Section 1: Killzone Active Windows */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase font-mono text-zinc-300 block">
              1. Institutional Killzone Execution Windows
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {killzonesList.map(kz => {
                const checked = config.allowedKillzones.includes(kz.id);
                return (
                  <button
                    key={kz.id}
                    type="button"
                    onClick={() => toggleKz(kz.id)}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                      checked 
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span>{kz.label}</span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                      checked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-zinc-700'
                    }`}>
                      {checked ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Liquidity Targets */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase font-mono text-zinc-300 block">
              2. Liquidity Pool Selection
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {liquidityList.map(liq => {
                const checked = config.allowedLiquidityTypes.includes(liq.id);
                return (
                  <button
                    key={liq.id}
                    type="button"
                    onClick={() => toggleLiq(liq.id)}
                    className={`p-2 rounded-lg border text-left text-[11px] transition-colors truncate ${
                      checked 
                        ? 'bg-amber-950/30 border-amber-500/50 text-amber-200 font-semibold' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {liq.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Displacement & FVG Entry Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <label className="text-[11px] font-bold uppercase font-mono text-zinc-300 block">
                3. Displacement & MSS Rules
              </label>

              <div>
                <div className="flex justify-between text-zinc-400 text-[11px] mb-1">
                  <span>Min Displacement ATR:</span>
                  <span className="text-zinc-100 font-mono font-bold">{config.minDisplacementAtrMult}x ATR</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="3.0"
                  step="0.1"
                  value={config.minDisplacementAtrMult}
                  onChange={e => setConfig({ ...config, minDisplacementAtrMult: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-400 text-[11px] mb-1">
                  <span>Min Body-to-Range:</span>
                  <span className="text-zinc-100 font-mono font-bold">{(config.minBodyToRangeRatio * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.9"
                  step="0.05"
                  value={config.minBodyToRangeRatio}
                  onChange={e => setConfig({ ...config, minBodyToRangeRatio: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <label className="text-[11px] font-bold uppercase font-mono text-zinc-300 block">
                4. Fair Value Gap (FVG) Entry Model
              </label>

              <div>
                <span className="text-zinc-400 text-[11px] block mb-1.5">Retest Entry Trigger:</span>
                <select
                  value={config.entryModel}
                  onChange={e => setConfig({ ...config, entryModel: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs focus:outline-hidden"
                >
                  <option value="FVG_CE_50">Consequent Encroachment (50% CE Midpoint)</option>
                  <option value="FVG_TOUCH">Touch of Outer FVG Edge (Aggressive)</option>
                  <option value="FVG_DEEP_75">Deep Retest (75% Imbalance Fill)</option>
                  <option value="IFVG_RETEST">Inversion FVG (IFVG Reversal)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Min FVG Pips</label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.fvgMinPips}
                    onChange={e => setConfig({ ...config, fvgMinPips: parseFloat(e.target.value) || 1 })}
                    className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Max FVG Age (Bars)</label>
                  <input
                    type="number"
                    value={config.maxFvgAgeBars}
                    onChange={e => setConfig({ ...config, maxFvgAgeBars: parseInt(e.target.value) || 8 })}
                    className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Strict Risk Engine */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <label className="text-[11px] font-bold uppercase font-mono text-zinc-300 block">
              5. Quantitative Risk Engine & Targets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Risk per Trade (%)</label>
                <input
                  type="number"
                  step="0.25"
                  value={config.riskPerTradePercent}
                  onChange={e => setConfig({ ...config, riskPerTradePercent: parseFloat(e.target.value) || 1 })}
                  className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Stop Loss Buffer (Pips)</label>
                <input
                  type="number"
                  step="0.5"
                  value={config.stopLossBufferPips}
                  onChange={e => setConfig({ ...config, stopLossBufferPips: parseFloat(e.target.value) || 2 })}
                  className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Min Target Risk:Reward</label>
                <input
                  type="number"
                  step="0.25"
                  value={config.minRiskRewardRatio}
                  onChange={e => setConfig({ ...config, minRiskRewardRatio: parseFloat(e.target.value) || 2 })}
                  className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Adaptive Volatility Optimization */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase font-mono text-zinc-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> 6. Dynamic Volatility Parameter Adaptation
              </label>
              <button
                type="button"
                onClick={() => setConfig({ ...config, enableAdaptiveVolatility: !config.enableAdaptiveVolatility })}
                className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition-colors ${
                  config.enableAdaptiveVolatility 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {config.enableAdaptiveVolatility ? 'Adaptive Enabled' : 'Adaptive Disabled'}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              When active, the engine dynamically recalibrates stop-loss distance (widening during high ATR spikes), expands take-profit targets, and locks 50% Consequent Encroachment limit entry models to prevent slippage and stop-outs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Save className="w-3.5 h-3.5" /> Save Parameters
          </button>
        </div>
      </div>
    </div>
  );
};
