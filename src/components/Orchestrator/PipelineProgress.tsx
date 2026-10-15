import React from 'react';
import { 
  Compass, Brain, ClipboardList, Play, AlertOctagon, 
  CheckCircle, FileText, GraduationCap, Check, Loader2 
} from 'lucide-react';
import { PipelineStage } from '../../types/qa';

interface PipelineProgressProps {
  currentStage: PipelineStage;
  stageProgress: number; // 0 to 100
  onSelectStage?: (stage: PipelineStage) => void;
}

const STAGES: { id: PipelineStage; label: string; icon: any; description: string }[] = [
  { id: 'explore', label: 'Explore', icon: Compass, description: 'Crawl DOM, routes & elements' },
  { id: 'understand', label: 'Understand', icon: Brain, description: 'Extract semantic maps & journeys' },
  { id: 'plan', label: 'Plan', icon: ClipboardList, description: 'Generate test cases & edge cases' },
  { id: 'execute', label: 'Execute', icon: Play, description: 'Autonomous browser execution' },
  { id: 'detect', label: 'Detect', icon: AlertOctagon, description: 'Identify invariant breaches' },
  { id: 'verify', label: 'Verify', icon: CheckCircle, description: 'Re-run to confirm determinism' },
  { id: 'report', label: 'Report', icon: FileText, description: 'Synthesize reproducible bug dossier' },
  { id: 'learn', label: 'Learn', icon: GraduationCap, description: 'Generate Playwright & update priorities' }
];

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  currentStage,
  stageProgress
}) => {
  const getStageStatus = (stageId: PipelineStage) => {
    if (currentStage === 'completed') return 'done';
    if (currentStage === 'idle') return 'pending';

    const stageOrder: PipelineStage[] = ['explore', 'understand', 'plan', 'execute', 'detect', 'verify', 'report', 'learn'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stageId);

    if (stageIndex < currentIndex) return 'done';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold">
              Autonomous Agent Lifecycle
            </span>
            <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              8-Stage Lifecycle
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
            Explore → Understand → Plan → Execute → Detect → Verify → Report → Learn
          </h2>
        </div>

        {currentStage !== 'idle' && currentStage !== 'completed' && (
          <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-800/80 px-3 py-1.5 rounded-lg text-xs text-indigo-300 self-start sm:self-auto">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span className="font-mono capitalize font-medium">{currentStage} Phase Active</span>
            <span className="font-mono text-white font-bold ml-1">{stageProgress}%</span>
          </div>
        )}

        {currentStage === 'completed' && (
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-lg text-xs text-emerald-300 self-start sm:self-auto">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">Autonomous Cycle Complete</span>
          </div>
        )}
      </div>

      {/* Interactive Step Track */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {STAGES.map((stage, idx) => {
          const status = getStageStatus(stage.id);
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className={`relative rounded-lg p-2.5 border transition-all text-left flex flex-col justify-between ${
                status === 'active'
                  ? 'bg-indigo-950/80 border-indigo-500 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500/50'
                  : status === 'done'
                  ? 'bg-slate-900 border-emerald-500/30'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-500 font-bold">0{idx + 1}</span>
                {status === 'done' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-[9px] font-semibold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    <span>DONE</span>
                  </span>
                ) : status === 'active' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono text-[9px] font-bold">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span>RUN</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-700/80 text-slate-500 text-[10px] select-none">
                    ○
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${
                    status === 'active' ? 'text-indigo-400' :
                    status === 'done' ? 'text-emerald-400' : 'text-slate-500'
                  }`} />
                  <span className={`text-xs font-bold capitalize ${
                    status === 'active' ? 'text-white' :
                    status === 'done' ? 'text-slate-200' : 'text-slate-400'
                  }`}>
                    {stage.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">
                  {stage.description}
                </p>
              </div>

              {/* Progress bar line for active stage */}
              {status === 'active' && (
                <div className="w-full bg-indigo-950 rounded-full h-1 mt-2 overflow-hidden border border-indigo-800">
                  <div
                    className="bg-indigo-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${stageProgress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
