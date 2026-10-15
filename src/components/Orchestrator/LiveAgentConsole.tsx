import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, ShieldAlert, CheckCircle2, AlertTriangle, 
  Sparkles, ArrowDown, Trash2, Cpu, Activity
} from 'lucide-react';
import { ExecutionLog } from '../../types/qa';

interface LiveAgentConsoleProps {
  logs: ExecutionLog[];
  onClearLogs?: () => void;
  isExecuting: boolean;
}

export const LiveAgentConsole: React.FC<LiveAgentConsoleProps> = ({
  logs,
  onClearLogs,
  isExecuting
}) => {
  const [filter, setFilter] = useState<'all' | 'agent' | 'error' | 'success'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'agent') return log.level === 'agent';
    if (filter === 'error') return log.level === 'error' || log.level === 'warn';
    if (filter === 'success') return log.level === 'success';
    return true;
  });

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-xl font-mono text-xs">
      {/* Console Header */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="font-semibold text-slate-200 truncate">Agent Console</span>
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">· Live Telemetry</span>
          {isExecuting && (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Streaming
            </span>
          )}
        </div>

        {/* Filter and control buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[10px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter('agent')}
              className={`px-2 py-0.5 rounded transition-colors ${filter === 'agent' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Agent
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-2 py-0.5 rounded transition-colors ${filter === 'error' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Anomalies
            </button>
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded border text-[10px] flex items-center gap-1 transition-colors ${
              autoScroll ? 'bg-slate-800 border-slate-700 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title="Toggle Auto-scroll"
          >
            <ArrowDown className="w-3 h-3" />
          </button>

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="p-1.5 rounded border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[10px] transition-colors"
              title="Clear Console"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Log Stream */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3.5 space-y-2 bg-slate-950/90 selection:bg-indigo-500/30"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 italic py-8 text-center">
            No telemetry records yet. Click "Start Autonomous Run" to begin.
          </div>
        ) : (
          filteredLogs.map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            let prefix = '[INFO]';
            let color = 'text-slate-300';
            let bg = 'bg-transparent';

            if (log.stage === 'explore') prefix = '[EXPLORER]';
            else if (log.stage === 'understand') prefix = '[ANALYZER]';
            else if (log.stage === 'plan') prefix = '[PLANNER]';
            else if (log.stage === 'execute') prefix = '[EXECUTOR]';
            else if (log.stage === 'detect') prefix = '[DETECTOR]';
            else if (log.stage === 'verify') prefix = '[VERIFIER]';
            else if (log.stage === 'report') prefix = '[REPORTER]';
            else if (log.stage === 'learn') prefix = '[LEARN]';
            else prefix = '[EXECUTOR]';

            if (log.level === 'agent') {
              color = 'text-indigo-300';
              bg = 'bg-indigo-950/20 border-l-2 border-indigo-500 pl-2';
            } else if (log.level === 'warn') {
              prefix = '[DETECTOR]';
              color = 'text-amber-300';
              bg = 'bg-amber-950/20 border-l-2 border-amber-400 pl-2';
            } else if (log.level === 'error') {
              prefix = log.stage === 'verify' ? '[VERIFIER]' : '[DEFECT]';
              color = 'text-rose-400 font-semibold';
              bg = 'bg-rose-950/30 border-l-2 border-rose-500 pl-2';
            } else if (log.level === 'success') {
              prefix = '[ASSERT PASS]';
              color = 'text-emerald-300';
              bg = 'bg-emerald-950/20 border-l-2 border-emerald-400 pl-2';
            }

            return (
              <div key={log.id} className={`py-1 text-[11px] leading-relaxed transition-all ${bg}`}>
                <div className="flex items-start gap-2">
                  <span className="text-slate-600 select-none flex-shrink-0 text-[10px]">{time}</span>
                  <span className={`font-bold select-none text-[10px] flex-shrink-0 ${
                    log.level === 'agent' ? 'text-indigo-400' :
                    log.level === 'error' ? 'text-rose-400' :
                    log.level === 'warn' ? 'text-amber-400' :
                    log.level === 'success' ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {prefix}
                  </span>
                  <span className={`break-all ${color}`}>
                    {log.message}
                  </span>
                </div>

                {log.meta && (
                  <pre className="mt-1 ml-16 text-[10px] bg-slate-900/90 text-slate-400 p-1.5 rounded overflow-x-auto border border-slate-800">
                    {JSON.stringify(log.meta, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Footer Telemetry */}
      <div className="bg-slate-900/90 border-t border-slate-800 px-3.5 py-1.5 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-indigo-400" />
            <span>Gemini 3.8 Flash (Active)</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>Playwright Chromium Driver</span>
          </span>
        </div>
        <span className="hidden sm:inline">v3.0 Production</span>
      </div>
    </div>
  );
};
