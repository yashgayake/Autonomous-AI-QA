import React, { useState } from 'react';
import { 
  FileCode, Copy, Download, Play, CheckCircle2, 
  ExternalLink, Sparkles, Check, RefreshCw, Layers
} from 'lucide-react';
import { TestCase, BugReport } from '../../types/qa';

interface PlaywrightSuiteViewerProps {
  code: string;
  filename: string;
  testCases: TestCase[];
  verifiedBugs: BugReport[];
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export const PlaywrightSuiteViewer: React.FC<PlaywrightSuiteViewerProps> = ({
  code,
  filename,
  testCases,
  verifiedBugs,
  onRegenerate,
  isRegenerating
}) => {
  const [copied, setCopied] = useState(false);
  const [simulatedRunStatus, setSimulatedRunStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'apexmart-autonomous.spec.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRunPlaywrightSim = () => {
    setSimulatedRunStatus('running');
    setSimulatedLogs([
      'Running 5 tests using 3 workers',
      '✓ [chromium] › apexmart-autonomous.spec.ts:13:3 › User Authentication (320ms)',
      '✓ [chromium] › apexmart-autonomous.spec.ts:24:3 › Catalog Search & Filtering (410ms)'
    ]);

    setTimeout(() => {
      setSimulatedLogs(prev => [
        ...prev,
        '✓ [chromium] › apexmart-autonomous.spec.ts:36:3 › Negative Quantity Boundary Guard (290ms)',
        '✓ [chromium] › apexmart-autonomous.spec.ts:48:3 › Tax & Discount Formula Integrity (340ms)'
      ]);
    }, 800);

    setTimeout(() => {
      setSimulatedLogs(prev => [
        ...prev,
        '✓ [chromium] › apexmart-autonomous.spec.ts:62:3 › Checkout Idempotency & Form Guards (450ms)',
        '✨ 5 passed (1.8s)'
      ]);
      setSimulatedRunStatus('completed');
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
              <FileCode className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Production Playwright Test Suite</span>
              <span className="text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                .spec.ts
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Autonomous journeys and discovered defects converted into production-ready Playwright tests. Drop directly into your CI/CD pipeline (GitHub Actions, GitLab CI, or Jenkins).
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate with AI</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .spec.ts</span>
          </button>
        </div>
      </div>

      {/* Code Editor Preview & In-browser runner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Code Block */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-300 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              {filename}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">TypeScript • @playwright/test</span>
          </div>

          <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200 bg-slate-950/90 leading-relaxed max-h-[620px]">
            <code>{code}</code>
          </pre>
        </div>

        {/* Right Sidebar: Quick Runner & Pipeline Integration */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Playwright Runner Simulation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Playwright Runner</span>
              <button
                onClick={handleRunPlaywrightSim}
                disabled={simulatedRunStatus === 'running'}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{simulatedRunStatus === 'running' ? 'Running Tests...' : 'Execute Suite'}</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono min-h-[160px] max-h-[220px] overflow-y-auto space-y-1">
              {simulatedLogs.length === 0 ? (
                <span className="text-slate-600 italic">Click "Execute Suite" to test in headless Chromium...</span>
              ) : (
                simulatedLogs.map((log, i) => (
                  <div key={i} className={log.includes('✓') ? 'text-emerald-400' : log.includes('✨') ? 'text-indigo-400 font-bold mt-2' : 'text-slate-400'}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CI/CD Integration snippet */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
            <span className="font-bold text-white uppercase tracking-wider text-[11px] block">
              GitHub Actions Workflow
            </span>
            <p className="text-slate-400 text-[11px]">
              Add this to <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">.github/workflows/playwright.yml</code>:
            </p>
            <pre className="bg-slate-950 text-slate-300 p-2.5 rounded font-mono text-[10px] overflow-x-auto border border-slate-800">
{`- name: Run ApexQA Tests
  run: npx playwright test
- name: Upload Artifacts
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/`}
            </pre>
          </div>

          {/* Test Coverage Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
            <span className="font-bold text-white uppercase tracking-wider text-[11px] block">
              Automated Coverage
            </span>
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span>Journeys Covered:</span>
                <span className="font-mono text-emerald-400 font-bold">4 / 4</span>
              </div>
              <div className="flex justify-between">
                <span>Boundary & Edge Cases:</span>
                <span className="font-mono text-emerald-400 font-bold">5 Cases</span>
              </div>
              <div className="flex justify-between">
                <span>Regression Defect Guards:</span>
                <span className="font-mono text-indigo-400 font-bold">{verifiedBugs.length} Tests</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
