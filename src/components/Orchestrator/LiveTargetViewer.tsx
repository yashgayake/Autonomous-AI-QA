import React from 'react';
import { 
  Globe, ShieldCheck, ExternalLink, RefreshCw, Layers, 
  Compass, Eye, CheckCircle2, AlertCircle, Laptop
} from 'lucide-react';

interface LiveTargetViewerProps {
  requestedUrl: string;
  actualBrowserUrl: string;
  targetPageTitle: string;
  isExecuting: boolean;
  stage: string;
  targetType: 'preset_demo' | 'custom_url';
  targetScreenshot?: string | null;
  domSummary?: {
    buttonsCount: number;
    inputsCount: number;
    linksCount: number;
    headingsCount?: number;
    sampleElements?: string[];
  } | null;
  discoveredCandidates?: Array<{
    type: string;
    selector: string;
    label: string;
    targetHref?: string;
  }>;
}

export const LiveTargetViewer: React.FC<LiveTargetViewerProps> = ({
  requestedUrl,
  actualBrowserUrl,
  targetPageTitle,
  isExecuting,
  stage,
  targetType,
  targetScreenshot,
  domSummary,
  discoveredCandidates = []
}) => {
  const isHttps = actualBrowserUrl.startsWith('https://');
  const isDemo = targetType === 'preset_demo';

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-b-xl overflow-hidden font-sans">
      {/* Top Browser URL & Status Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Address Bar */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
          {isHttps ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          ) : (
            <Globe className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          )}
          <span className="text-slate-500 text-[10px] uppercase font-mono tracking-wider flex-shrink-0">URL:</span>
          <span className="text-slate-200 font-mono text-[11px] truncate flex-1" title={actualBrowserUrl || requestedUrl}>
            {actualBrowserUrl || requestedUrl}
          </span>
          {isExecuting && (
            <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin flex-shrink-0" />
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 ${
            isDemo 
              ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60' 
              : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isDemo ? 'bg-purple-400' : 'bg-emerald-400'}`}></span>
            {isDemo ? 'Built-in Demo' : 'External Website'}
          </span>

          <span className="hidden sm:inline-flex text-[10px] font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded items-center gap-1">
            <Laptop className="w-3 h-3 text-indigo-400" />
            Playwright Chromium
          </span>
        </div>
      </div>

      {/* Target Title & Sub-header */}
      <div className="bg-slate-900/40 border-b border-slate-800/80 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <span className="text-slate-500 font-mono">Title:</span>
          <span className="font-medium text-slate-200 truncate">{targetPageTitle || requestedUrl}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
          <span>Stage:</span>
          <span className="text-indigo-300 font-bold uppercase">{stage}</span>
        </div>
      </div>

      {/* Main Content Area: Live Chromium Screenshot or DOM Visualization */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {targetScreenshot ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                Live Chromium Browser Capture
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                Real Rendering
              </span>
            </div>

            <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shadow-lg group">
              <img 
                src={targetScreenshot} 
                alt="Target Application Screenshot"
                className="w-full h-auto max-h-[300px] object-cover object-top transition-transform group-hover:scale-[1.01]"
              />
              <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur border border-slate-700 text-[10px] text-slate-300 px-2 py-0.5 rounded font-mono">
                1280x800 Viewport
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 text-center space-y-3 my-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center mx-auto text-indigo-400">
              {isExecuting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">
                {isExecuting ? 'Autonomous Browser Navigating Target...' : 'Live Target Application Viewer'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                {isExecuting 
                  ? `Playwright Chromium is exploring live pages on ${actualBrowserUrl || requestedUrl} and generating observations.`
                  : `Target: ${actualBrowserUrl || requestedUrl}. Click "Start Autonomous Run" to launch live inspection.`}
              </p>
            </div>
          </div>
        )}

        {/* Live DOM Summary Grid */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Observed DOM Interactive Controls
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Real-time Inspection</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 text-center">
              <span className="text-[10px] text-slate-500 block">Buttons</span>
              <span className="font-bold text-indigo-400 text-sm">
                {domSummary?.buttonsCount ?? 0}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 text-center">
              <span className="text-[10px] text-slate-500 block">Inputs</span>
              <span className="font-bold text-teal-400 text-sm">
                {domSummary?.inputsCount ?? 0}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 text-center">
              <span className="text-[10px] text-slate-500 block">Links</span>
              <span className="font-bold text-emerald-400 text-sm">
                {domSummary?.linksCount ?? 0}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 text-center">
              <span className="text-[10px] text-slate-500 block">Headings</span>
              <span className="font-bold text-amber-400 text-sm">
                {domSummary?.headingsCount ?? 0}
              </span>
            </div>
          </div>

          {/* Sample Interactive Elements */}
          {domSummary?.sampleElements && domSummary.sampleElements.length > 0 && (
            <div className="pt-2 border-t border-slate-800/60 text-xs">
              <span className="text-[10px] text-slate-400 block mb-1">Discovered Controls Sample:</span>
              <div className="flex flex-wrap gap-1.5">
                {domSummary.sampleElements.slice(0, 6).map((elem, idx) => (
                  <span 
                    key={idx} 
                    className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-300 px-2 py-0.5 rounded truncate max-w-[160px]"
                    title={elem}
                  >
                    {elem}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamically Crawled Routes / Navigation Candidates */}
        {discoveredCandidates.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                Dynamic Navigation Candidates Discovered ({discoveredCandidates.length})
              </span>
              <span className="text-[10px] font-mono text-indigo-400">Autonomous Crawl</span>
            </div>

            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {discoveredCandidates.slice(0, 6).map((route, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-950/80 border border-slate-800/80 rounded px-2.5 py-1 text-[11px] flex items-center justify-between gap-2"
                >
                  <span className="font-medium text-slate-200 truncate">
                    {route.label || route.targetHref || route.selector}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800 uppercase flex-shrink-0">
                    {route.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Security & Execution Guarantee */}
      <div className="bg-slate-900/80 border-t border-slate-800 px-3 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Real Browser Sandboxing: SSRF & Link-Local Blocked</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[180px]">
          Target: {requestedUrl}
        </span>
      </div>
    </div>
  );
};
