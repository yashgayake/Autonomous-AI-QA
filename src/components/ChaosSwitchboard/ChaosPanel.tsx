import React from 'react';
import { 
  Bug, AlertTriangle, CheckCircle, ShieldAlert, Zap, 
  RotateCcw, Sliders, Info, Eye, EyeOff
} from 'lucide-react';
import { PlantedBugConfig, BugReport } from '../../types/qa';

interface ChaosPanelProps {
  bugs: PlantedBugConfig[];
  onToggleBug: (bugId: string) => void;
  onSetPreset: (preset: 'all' | 'none' | 'financial' | 'security') => void;
  verifiedBugs: BugReport[];
  isJudgeMode: boolean;
  onToggleJudgeMode: () => void;
}

export const ChaosPanel: React.FC<ChaosPanelProps> = ({
  bugs,
  onToggleBug,
  onSetPreset,
  verifiedBugs,
  isJudgeMode,
  onToggleJudgeMode
}) => {
  const activeCount = bugs.filter(b => b.enabled).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Bug className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">Controlled Defect Profiles & Anomaly Sandbox</h3>
            <span className="text-[11px] font-mono bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full">
              {activeCount} / {bugs.length} Armed
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Target anomaly injection controls for verification benchmarking. The autonomous engine explores and discovers defects dynamically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleJudgeMode}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
              isJudgeMode
                ? 'bg-amber-950/70 border-amber-600/60 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isJudgeMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isJudgeMode ? 'Anomaly Overlay: ON' : 'Blind Test Mode'}</span>
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
          <Sliders className="w-3 h-3" /> Presets:
        </span>
        <button
          onClick={() => onSetPreset('all')}
          className="bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-700/60 px-2.5 py-1 rounded text-xs transition-colors"
        >
          Arm All 8 Bugs
        </button>
        <button
          onClick={() => onSetPreset('financial')}
          className="bg-amber-900/30 hover:bg-amber-900/50 text-amber-200 border border-amber-700/50 px-2.5 py-1 rounded text-xs transition-colors"
        >
          Financial Math Only
        </button>
        <button
          onClick={() => onSetPreset('security')}
          className="bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-200 border border-indigo-700/50 px-2.5 py-1 rounded-lg text-xs transition-colors"
        >
          Auth & Session Only
        </button>
        <button
          onClick={() => onSetPreset('none')}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded text-xs transition-colors"
        >
          Clean Baseline (All Fixed)
        </button>
      </div>

      {/* Bug Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
        {bugs.map((bug, index) => {
          const isDiscovered = verifiedBugs.some(
            vb => vb.category === bug.category || vb.title.toLowerCase().includes(bug.name.toLowerCase().slice(0, 10))
          );

          return (
            <div
              key={bug.id}
              className={`p-3 rounded-lg border transition-all text-xs flex flex-col justify-between ${
                bug.enabled
                  ? 'bg-slate-950/70 border-slate-700/80 hover:border-slate-600'
                  : 'bg-slate-950/30 border-slate-800/40 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500 font-bold">#{index + 1}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                      bug.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                      bug.severity === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}>
                      {bug.severity}
                    </span>
                    <span className="font-semibold text-slate-200 truncate max-w-[180px]">{bug.name}</span>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => onToggleBug(bug.id)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      bug.enabled ? 'bg-rose-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        bug.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {bug.description}
                </p>
              </div>

              {/* Status footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono text-[10px]">{bug.category}</span>

                {isDiscovered ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Discovered by AI
                  </span>
                ) : (
                  <span className="text-slate-500 font-medium">
                    {bug.enabled ? 'Awaiting AI Discovery' : 'Deactivated'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
