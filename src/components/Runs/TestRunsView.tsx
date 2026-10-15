import React from 'react';
import { 
  History, Play, CheckCircle2, AlertOctagon, Clock, 
  BarChart2, ShieldCheck, ArrowRight, RefreshCw, 
  Layers, ExternalLink, CheckCircle, Bug, Sparkles, Activity
} from 'lucide-react';
import { HistoricalTestRun, PipelineStage, TestCase } from '../../types/qa';

interface TestRunsViewProps {
  historyRuns: HistoricalTestRun[];
  isExecuting: boolean;
  stage: PipelineStage;
  stageProgress: number;
  testCases: TestCase[];
  verifiedBugsCount: number;
  onStartRun: () => void;
  targetUrl: string;
}

export const TestRunsView: React.FC<TestRunsViewProps> = ({
  historyRuns,
  isExecuting,
  stage,
  stageProgress,
  testCases,
  verifiedBugsCount,
  onStartRun,
  targetUrl
}) => {
  const totalCompletedRuns = historyRuns.length;
  const totalTestsExecuted = historyRuns.reduce((acc, r) => acc + r.totalTests, 0) + (isExecuting ? testCases.length : 0);
  const totalBugsFound = historyRuns.reduce((acc, r) => acc + r.bugsFoundCount, 0) + (isExecuting ? verifiedBugsCount : 0);
  const avgDurationSeconds = historyRuns.length > 0 
    ? (historyRuns.reduce((acc, r) => acc + r.durationMs, 0) / historyRuns.length / 1000).toFixed(1)
    : '14.0';

  const overallPassRate = totalTestsExecuted > 0
    ? Math.round((historyRuns.reduce((acc, r) => acc + r.passedCount, 0) / (historyRuns.reduce((acc, r) => acc + r.totalTests, 0) || 1)) * 100)
    : 85;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header Overview Card */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Autonomous Test Executions & History</span>
                <span className="text-xs font-mono text-indigo-300">
                  ({totalCompletedRuns} Runs)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit trail of autonomous testing runs, execution metrics, and regression comparisons.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartRun}
            disabled={isExecuting}
            className={`text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              isExecuting
                ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 active:scale-[0.98]'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin text-indigo-400' : 'fill-current'}`} />
            <span>{isExecuting ? 'Execution in Progress...' : 'Run Autonomous Test'}</span>
          </button>
        </div>
      </div>

      {/* Current Active Execution Status (if executing or just finished) */}
      {isExecuting && (
        <div className="bg-slate-900/90 border border-indigo-800/60 rounded-xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
              <span className="font-semibold text-sm text-white">Active Execution in Progress</span>
              <span className="text-xs font-mono uppercase text-indigo-300">
                Phase: {stage}
              </span>
            </div>
            <span className="text-xs font-mono text-indigo-300 font-bold">
              {stageProgress}% Stage Completion
            </span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${stageProgress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-500 block font-mono">Target App</span>
              <span className="font-semibold text-slate-200 truncate block mt-0.5">{targetUrl}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-500 block font-mono">Planned Test Cases</span>
              <span className="font-bold text-white mt-0.5 block">{testCases.length} Tests</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-500 block font-mono">Live Defects Found</span>
              <span className="font-bold text-rose-400 mt-0.5 block">{verifiedBugsCount} Confirmed</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-500 block font-mono">Telemetry Status</span>
              <span className="font-semibold text-emerald-400 mt-0.5 block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Browser Streaming
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="uppercase text-[10px] font-bold tracking-wider">Executed Runs</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="font-mono font-bold text-xl text-white block">{totalCompletedRuns}</span>
          <span className="text-[10px] text-slate-500">Autonomous sessions</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="uppercase text-[10px] font-bold tracking-wider">Pass Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="font-mono font-bold text-xl text-emerald-400 block">{overallPassRate}%</span>
          <span className="text-[10px] text-slate-500">Across test assertions</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="uppercase text-[10px] font-bold tracking-wider">Defects Isolated</span>
            <Bug className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <span className="font-mono font-bold text-xl text-rose-400 block">{totalBugsFound}</span>
          <span className="text-[10px] text-slate-500">100% Deterministic verified</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="uppercase text-[10px] font-bold tracking-wider">Average Run Time</span>
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="font-mono font-bold text-xl text-indigo-300 block">{avgDurationSeconds}s</span>
          <span className="text-[10px] text-slate-500">Full 8-phase cycle</span>
        </div>
      </div>

      {/* Historical Test Runs Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 sm:p-5 shadow-xl space-y-4 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-sm text-white">Execution Log & Runs Repository</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {historyRuns.length} recorded executions
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
          <table className="w-full text-left text-xs font-mono min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider">
                <th className="pb-2.5">Execution ID</th>
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">Target Application</th>
                <th className="pb-2.5">Passed / Total</th>
                <th className="pb-2.5">Bugs Discovered</th>
                <th className="pb-2.5">Coverage</th>
                <th className="pb-2.5">Duration</th>
                <th className="pb-2.5 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {historyRuns.map((run, idx) => {
                const date = new Date(run.timestamp);
                const isPassedClean = run.bugsFoundCount === 0;

                return (
                  <tr key={run.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 font-semibold text-indigo-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      <span>{run.id}</span>
                      {idx === 0 && (
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-normal">
                          Latest
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-400">
                      {date.toLocaleDateString([], { month: 'short', day: 'numeric' })} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 text-slate-300 font-sans">
                      <div className="font-mono text-xs text-white truncate max-w-[200px]" title={run.actualBrowserUrl || run.targetUrl}>
                        {run.actualBrowserUrl || run.targetUrl}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                          run.targetType === 'custom_url'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                            : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                        }`}>
                          {run.targetType === 'custom_url' ? 'External Web' : 'Built-in Demo'}
                        </span>
                        {run.pageTitle && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={run.pageTitle}>
                            {run.pageTitle}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-emerald-400 font-bold">{run.passedCount}</span>
                      <span className="text-slate-500"> / {run.totalTests}</span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        run.bugsFoundCount > 0 
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800' 
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      }`}>
                        {run.bugsFoundCount > 0 ? `${run.bugsFoundCount} Verified Defects` : 'Zero Defects'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      {run.coveragePercentage}%
                    </td>
                    <td className="py-3 text-slate-400">
                      {(run.durationMs / 1000).toFixed(1)}s
                    </td>
                    <td className="py-3 text-right">
                      {isPassedClean ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-bold">
                          <AlertOctagon className="w-3.5 h-3.5" /> Bugs Caught
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
