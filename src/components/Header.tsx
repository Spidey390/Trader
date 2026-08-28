import { FC } from 'react';
import { 
  AssetSymbol, 
  TimeFrame, 
  KillzoneType, 
  StrategyConfig 
} from '../types/trading';
import { 
  Zap, 
  TrendingUp, 
  Cpu, 
  Sliders, 
  ShieldCheck, 
  Clock, 
  BarChart3, 
  Activity, 
  BookOpen,
  Sparkles,
  Search
} from 'lucide-react';

export type NavTab = 'terminal' | 'scanner' | 'adaptive' | 'discovery' | 'evolution' | 'validator' | 'volatility' | 'journal';

interface HeaderProps {
  currentAsset: AssetSymbol;
  currentTimeframe: TimeFrame;
  onAssetChange: (asset: AssetSymbol) => void;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  activeStrategy: StrategyConfig;
  currentKillzone: KillzoneType;
  autoEvolutionActive: boolean;
  onToggleAutoEvolution: () => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  accountEquity: number;
  netPnl: number;
  openStrategyEditor: () => void;
}

export const Header: FC<HeaderProps> = ({
  currentAsset,
  currentTimeframe,
  onAssetChange,
  onTimeframeChange,
  activeStrategy,
  currentKillzone,
  autoEvolutionActive,
  onToggleAutoEvolution,
  activeTab,
  onTabChange,
  accountEquity,
  netPnl,
  openStrategyEditor
}) => {
  const assets: AssetSymbol[] = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'GBP/JPY', 'AUD/USD', 'USD/CAD', 'AUD/CAD', 'XAU/USD', 'BTC/USD', 'NAS100'];
  const timeframes: TimeFrame[] = ['1m', '5m', '15m', '1H', '4H', '1D'];

  const getKillzoneBadge = (kz: KillzoneType) => {
    switch (kz) {
      case 'LONDON_OPEN':
        return { text: 'London Open (07-10 UTC)', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' };
      case 'NEW_YORK_AM':
        return { text: 'New York AM (12-15 UTC)', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' };
      case 'LONDON_CLOSE':
        return { text: 'London Close (15-17 UTC)', color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' };
      case 'ASIAN':
        return { text: 'Asian Range (00-04 UTC)', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' };
      default:
        return { text: 'Off-Hours Session', color: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30' };
    }
  };

  const kzInfo = getKillzoneBadge(currentKillzone);

  return (
    <header id="app-header" className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2.5 transition-colors select-none">
      {/* Top row: Brand, Account Metrics & System Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-base tracking-tight text-zinc-900 dark:text-zinc-50">
                Forex AI Quant Agent
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                ICT Engine {activeStrategy.version}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Killzone Liquidity Sweep + FVG Retest • Self-Improving Quant Architecture
            </p>
          </div>
        </div>

        {/* Middle: Active Session & Metrics */}
        <div className="flex items-center gap-3">
          {/* Active Killzone Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${kzInfo.color}`}>
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>{kzInfo.text}</span>
          </div>

          {/* Account Balance Widget */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div>
              <div className="text-[10px] uppercase font-mono text-zinc-400">Equity</div>
              <div className="text-xs font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                ${accountEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div>
              <div className="text-[10px] uppercase font-mono text-zinc-400">Net PnL</div>
              <div className={`text-xs font-semibold font-mono ${netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {netPnl >= 0 ? '+' : ''}${netPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Autonomous Improvement Engine Toggle */}
          <button
            id="btn-toggle-ai-evolution"
            onClick={onToggleAutoEvolution}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all shadow-xs ${
              autoEvolutionActive 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <Cpu className={`w-3.5 h-3.5 ${autoEvolutionActive ? 'animate-spin' : ''}`} />
            <span>{autoEvolutionActive ? 'AI Evolution Active' : 'Enable AI Evolution'}</span>
          </button>

          {/* Strategy Config Edit */}
          <button
            id="btn-open-strategy-editor"
            onClick={openStrategyEditor}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
            title="Configure Strategy Parameters"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom row: Asset & Timeframe selection + Navigation Tabs */}
      <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Asset & Timeframe Selectors */}
        <div className="flex items-center gap-2">
          {/* Asset Selector */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-md p-0.5 border border-zinc-200 dark:border-zinc-800 overflow-x-auto max-w-[340px] sm:max-w-none">
            {assets.map(asset => (
              <button
                key={asset}
                id={`asset-btn-${asset.replace('/', '-')}`}
                onClick={() => onAssetChange(asset)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  currentAsset === asset
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {asset}
              </button>
            ))}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-md p-0.5 border border-zinc-200 dark:border-zinc-800">
            {timeframes.map(tf => (
              <button
                key={tf}
                id={`tf-btn-${tf}`}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  currentTimeframe === tf
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap items-center gap-1">
          <button
            id="tab-terminal"
            onClick={() => onTabChange('terminal')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'terminal'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>ICT Terminal</span>
          </button>

          <button
            id="tab-scanner"
            onClick={() => onTabChange('scanner')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'scanner'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Opportunity Scanner</span>
          </button>

          <button
            id="tab-adaptive"
            onClick={() => onTabChange('adaptive')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'adaptive'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Adaptive Volatility</span>
          </button>

          <button
            id="tab-discovery"
            onClick={() => onTabChange('discovery')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'discovery'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pattern Discovery</span>
          </button>

          <button
            id="tab-evolution"
            onClick={() => onTabChange('evolution')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'evolution'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Evolution Lab</span>
          </button>

          <button
            id="tab-validator"
            onClick={() => onTabChange('validator')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'validator'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>WFA & Monte Carlo</span>
          </button>

          <button
            id="tab-volatility"
            onClick={() => onTabChange('volatility')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'volatility'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
            <span>Matrix</span>
          </button>

          <button
            id="tab-journal"
            onClick={() => onTabChange('journal')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'journal'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-500" />
            <span>Journal</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
