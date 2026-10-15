import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Bug, ShieldAlert, Cpu, Sparkles, FileCode, 
  GraduationCap, Terminal, Sliders, Globe, RefreshCw, 
  CheckCircle2, Layers, AlertTriangle, ArrowRight, ExternalLink,
  ChevronDown, Check, Activity, History, ArrowLeft,
  Clock, Target, Hash, Timer, Menu, X, ChevronRight
} from 'lucide-react';
import { INITIAL_PLANTED_BUGS } from './data/plantedBugs';
import { StoreView } from './components/TargetStore/StoreView';
import { ChaosPanel } from './components/ChaosSwitchboard/ChaosPanel';
import { PipelineProgress } from './components/Orchestrator/PipelineProgress';
import { LiveAgentConsole } from './components/Orchestrator/LiveAgentConsole';
import { BugReportsList } from './components/Bugs/BugReportsList';
import { PlaywrightSuiteViewer } from './components/Automation/PlaywrightSuiteViewer';
import { LearningEngineView } from './components/Learning/LearningEngineView';
import { TestRunsView } from './components/Runs/TestRunsView';
import { LiveTargetViewer } from './components/Orchestrator/LiveTargetViewer';
import { useAutonomousQA } from './hooks/useAutonomousQA';
import { HistoricalTestRun, PlantedBugConfig } from './types/qa';
import { 
  auth, 
  onAuthStateChanged, 
  signInWithGoogle, 
  signOutUser, 
  loadTestRunsFromFirestore, 
  testFirestoreConnection 
} from './lib/firebase';
import { User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'runs' | 'findings' | 'suite' | 'learning' | 'sandbox'>('workspace');
  const [bugConfigs, setBugConfigs] = useState<PlantedBugConfig[]>(INITIAL_PLANTED_BUGS);
  const [isJudgeMode, setIsJudgeMode] = useState(true);
  const [targetMode, setTargetMode] = useState<'preset' | 'custom'>('preset');
  const [customUrl, setCustomUrl] = useState('https://example.com/app');
  const [targetDescription, setTargetDescription] = useState('ApexMart: E-commerce web platform with product catalog, cart calculations, coupon discounts, checkout validation, and session auth');
  const [isAiPrioritizing, setIsAiPrioritizing] = useState(false);
  const [isTargetMenuOpen, setIsTargetMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<'console' | 'target'>('target');
  const [activeHighlightSelector, setActiveHighlightSelector] = useState<string | null>(null);

  const targetMenuRef = useRef<HTMLDivElement>(null);

  // Close Target Menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (targetMenuRef.current && !targetMenuRef.current.contains(event.target as Node)) {
        setIsTargetMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Firebase Auth and Firestore state (kept intact for backend persistence)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firestoreConnected, setFirestoreConnected] = useState(true);

  // Historical test runs
  const [historyRuns, setHistoryRuns] = useState<HistoricalTestRun[]>([
    {
      id: 'RUN-2026-10-05-A',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      targetUrl: 'http://localhost:3000 (ApexMart)',
      totalTests: 8,
      passedCount: 3,
      failedCount: 5,
      bugsFoundCount: 5,
      durationMs: 14200,
      coveragePercentage: 82,
      criticalBugsFound: 2
    },
    {
      id: 'RUN-2026-10-06-B',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      targetUrl: 'http://localhost:3000 (ApexMart)',
      totalTests: 8,
      passedCount: 4,
      failedCount: 4,
      bugsFoundCount: 4,
      durationMs: 13800,
      coveragePercentage: 88,
      criticalBugsFound: 2
    }
  ]);

  // Real-time run completion listener
  const handleRunComplete = useCallback((newRun: HistoricalTestRun) => {
    setHistoryRuns(prev => {
      const exists = prev.some(r => r.id === newRun.id);
      if (exists) return prev;
      return [newRun, ...prev];
    });
  }, []);

  // Hook for Autonomous QA Agent
  const {
    stage,
    stageProgress,
    logs,
    testCases,
    verifiedBugs,
    journeys,
    playwrightCode,
    isExecuting,
    pagesDiscovered,
    testsExecutedCount,
    potentialFindingsCount,
    currentRunId,
    runStartTime,
    runDurationMs,
    llmStatus,
    prioritizationResult,
    activeTargetUrl,
    actualBrowserUrl,
    targetPageTitle,
    targetType,
    targetScreenshot,
    targetDomSummary,
    discoveredCandidates,
    runFullAutonomousPipeline,
    applyLearnedPriorities,
    requestAiPrioritization,
    clearLogs
  } = useAutonomousQA(bugConfigs, setActiveHighlightSelector, currentUser, handleRunComplete);

  const [rightPaneView, setRightPaneView] = useState<'auto' | 'target' | 'sandbox'>('auto');

  // Initialize Firebase Auth listener & initial connection test
  useEffect(() => {
    testFirestoreConnection()
      .then((ok) => setFirestoreConnected(ok))
      .catch(() => setFirestoreConnected(false));

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const remoteRuns = await loadTestRunsFromFirestore();
        if (remoteRuns.length > 0) {
          setHistoryRuns(remoteRuns);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Toggle bug switch
  const handleToggleBug = (bugId: string) => {
    setBugConfigs(prev =>
      prev.map(b => (b.id === bugId ? { ...b, enabled: !b.enabled } : b))
    );
  };

  // Preset configuration
  const handleSetPreset = (preset: 'all' | 'none' | 'financial' | 'security') => {
    setBugConfigs(prev =>
      prev.map(b => {
        if (preset === 'all') return { ...b, enabled: true };
        if (preset === 'none') return { ...b, enabled: false };
        if (preset === 'financial') {
          return { ...b, enabled: b.category === 'CALCULATION' || b.category === 'VALIDATION' };
        }
        if (preset === 'security') {
          return { ...b, enabled: b.category === 'AUTH' || b.category === 'SESSION' };
        }
        return b;
      })
    );
  };

  const activeBugsCount = bugConfigs.filter(b => b.enabled).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      
      {/* =========================================================
          1. CLEAN REFINED HEADER & NAVIGATION
          - LEFT: Branding & Clean unboxed status (v3.0 · Gemini 3.8 Flash · Active)
          - CENTER: Desktop Segmented Navigation (5 clean tabs)
          - RIGHT: Target Selector + Primary 'Start Run' + Mobile Hamburger
      ========================================================= */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          
          {/* LEFT: Branding & Platform identity */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10 text-indigo-400 flex-shrink-0">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-white tracking-tight truncate max-w-[125px] xs:max-w-[160px] sm:max-w-none">
                  Autonomous AI QA
                </span>
                {/* Clean unboxed metadata (shown on large desktops where ample room exists) */}
                <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                  <span>v3.0</span>
                  <span>·</span>
                  <span className="text-indigo-400 font-semibold">{llmStatus?.model || 'Gemini 3.8 Flash'}</span>
                  <span>·</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Primary Navigation Tabs (Desktop & Tablet >= 1024px) */}
          <nav className="hidden lg:flex items-center bg-slate-950/80 border border-slate-800/80 p-1 rounded-xl text-xs gap-1 flex-shrink-0">
            <button
              onClick={() => setActiveTab('workspace')}
              className={`px-2.5 xl:px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'workspace'
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('runs')}
              className={`px-2.5 xl:px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'runs'
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>
                <span className="hidden xl:inline">Test </span>Runs
              </span>
              {historyRuns.length > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  activeTab === 'runs' ? 'bg-indigo-900/80 text-indigo-200 border border-indigo-400/30' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}>
                  {historyRuns.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('findings')}
              className={`px-2.5 xl:px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'findings'
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Findings</span>
              {verifiedBugs.length > 0 && (
                <span className="bg-rose-500 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {verifiedBugs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('suite')}
              className={`px-2.5 xl:px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'suite'
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>
                <span className="hidden xl:inline">Test </span>Suite
              </span>
              {playwrightCode && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('learning')}
              className={`px-2.5 xl:px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'learning'
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>
                <span className="hidden xl:inline">Risk & </span>Learning
              </span>
            </button>
          </nav>

          {/* RIGHT / ACTIONS: Target Application Selector + Primary Action + Mobile Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            
            {/* Target Application Dropdown Menu */}
            <div className="relative" ref={targetMenuRef}>
              <button
                onClick={() => setIsTargetMenuOpen(!isTargetMenuOpen)}
                className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200 transition-colors shadow-sm"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="text-slate-400 text-[11px] hidden sm:inline">Target:</span>
                <span className="font-semibold text-white max-w-[70px] sm:max-w-none truncate">
                  {targetMode === 'preset' ? 'ApexMart' : 'Custom'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              {isTargetMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-2 z-50 text-xs backdrop-blur-md">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Target Application
                  </div>

                  {/* Preset: ApexMart Sandbox */}
                  <button
                    onClick={() => {
                      setTargetMode('preset');
                      setIsTargetMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                      targetMode === 'preset' 
                        ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30' 
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>ApexMart Sandbox</span>
                        <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded font-mono">
                          Built-in
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Autonomous e-commerce store with planted defects</p>
                    </div>
                    {targetMode === 'preset' && <Check className="w-4 h-4 text-indigo-400" />}
                  </button>

                  {/* Custom URL Option */}
                  <div className={`mt-1.5 p-2 rounded-lg ${
                    targetMode === 'custom' ? 'bg-indigo-500/10 border border-indigo-500/25' : 'hover:bg-slate-800/60'
                  }`}>
                    <button
                      onClick={() => {
                        setTargetMode('custom');
                      }}
                      className="w-full text-left flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>Custom Website</span>
                          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-mono">
                            Live URL
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Explore any live authorized web application</p>
                      </div>
                      {targetMode === 'custom' && <Check className="w-4 h-4 text-indigo-400" />}
                    </button>

                    {targetMode === 'custom' && (
                      <div className="mt-2 pt-2 border-t border-slate-800">
                        <input
                          type="text"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          placeholder="https://example.com/app"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="my-1.5 border-t border-slate-800" />

                  {/* Secondary: Standalone Sandbox View for Judges */}
                  <button
                    onClick={() => {
                      setActiveTab('sandbox');
                      setIsTargetMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <div>
                        <div className="font-medium text-slate-200">ApexMart Sandbox View</div>
                        <p className="text-[10px] text-slate-400">Standalone store & defect profiles</p>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              )}
            </div>

            {/* PRIMARY ACTION: Start Autonomous Run */}
            <button
              onClick={() => runFullAutonomousPipeline(targetMode === 'preset' ? 'http://localhost:3000' : customUrl.trim(), targetDescription)}
              disabled={isExecuting}
              className={`text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 shadow-lg transition-all ${
                isExecuting
                  ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-indigo-600/25 active:scale-[0.98]'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin text-indigo-400' : 'fill-current'}`} />
              <span className="hidden sm:inline">
                {isExecuting ? 'Running QA...' : 'Start Autonomous Run'}
              </span>
              <span className="sm:hidden">
                {isExecuting ? 'Running...' : 'Run'}
              </span>
            </button>

            {/* Mobile / Tablet Hamburger Toggle (< 1024px) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Navigation Drawer / Panel (< 1024px) */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-800 space-y-3 pb-2 animate-fadeIn">
            {/* Mobile Navigation List */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                onClick={() => {
                  setActiveTab('workspace');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                  activeTab === 'workspace' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-950/70 text-slate-300'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Workspace</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('runs');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-lg flex items-center justify-between font-medium transition-colors ${
                  activeTab === 'runs' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-950/70 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Runs</span>
                </div>
                {historyRuns.length > 0 && (
                  <span className="text-[10px] font-mono bg-indigo-900/80 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-400/30">
                    {historyRuns.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab('findings');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-lg flex items-center justify-between font-medium transition-colors ${
                  activeTab === 'findings' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-950/70 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  <span>Findings</span>
                </div>
                {verifiedBugs.length > 0 && (
                  <span className="text-[10px] font-mono bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {verifiedBugs.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab('suite');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                  activeTab === 'suite' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-950/70 text-slate-300'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>Test Suite</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('learning');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-lg flex items-center gap-2 font-medium col-span-2 transition-colors ${
                  activeTab === 'learning' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-950/70 text-slate-300'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Risk & Learning Engine</span>
              </button>
            </div>

            {/* Mobile Target Switcher */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
              <span className="text-slate-400 font-semibold block text-[11px]">Select Target Application:</span>
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                <button
                  onClick={() => setTargetMode('preset')}
                  className={`flex-1 py-1.5 text-center rounded text-xs font-semibold ${
                    targetMode === 'preset' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  ApexMart (Demo)
                </button>
                <button
                  onClick={() => setTargetMode('custom')}
                  className={`flex-1 py-1.5 text-center rounded text-xs font-semibold ${
                    targetMode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Custom Target URL
                </button>
              </div>

              {targetMode === 'custom' && (
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/app"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 pb-24 lg:pb-8 min-w-0 overflow-x-hidden">
        
        {/* Target & LLM Specification Bar */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 space-y-3 text-xs shadow-md backdrop-blur-sm">
          {/* Top Target Selector Row */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
              {/* Mode Toggle Buttons */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto flex-shrink-0">
                <button
                  onClick={() => setTargetMode('preset')}
                  className={`flex-1 sm:flex-initial justify-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    targetMode === 'preset'
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>ApexMart Demo</span>
                </button>
                <button
                  onClick={() => setTargetMode('custom')}
                  className={`flex-1 sm:flex-initial justify-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    targetMode === 'custom'
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Custom Website</span>
                </button>
              </div>

              {/* URL Input */}
              <div className="flex items-center gap-2 flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 transition-colors min-w-0">
                <Globe className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span className="text-slate-500 text-[11px] font-mono flex-shrink-0">URL:</span>
                {targetMode === 'preset' ? (
                  <div className="flex items-center justify-between flex-1 font-mono text-xs truncate">
                    <span className="text-indigo-300 font-semibold truncate">http://localhost:3000</span>
                    <span className="text-[10px] bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 px-1.5 py-0.2 rounded font-mono ml-2 flex-shrink-0">
                      Sandbox Safe
                    </span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://example.com/app"
                    className="bg-transparent text-white font-mono text-xs flex-1 focus:outline-none placeholder:text-slate-600 truncate"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-auto font-mono text-[11px] flex-shrink-0">
              <span className="text-slate-400">LLM Engine:</span>
              <span className="text-indigo-300 bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded-lg font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Gemini 3.8 Flash (Active)
              </span>
            </div>
          </div>

          {/* Active Target Banner before execution */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
            <div className="flex items-center gap-2 text-slate-400 min-w-0 flex-wrap">
              <span className="text-slate-500">TARGET:</span>
              <span className="text-white font-bold truncate max-w-[260px] sm:max-w-none">
                {targetMode === 'preset' ? 'http://localhost:3000' : customUrl || '(Missing URL)'}
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded border ${
                targetMode === 'preset' 
                  ? 'bg-purple-950/80 text-purple-300 border-purple-800' 
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              }`}>
                {targetMode === 'preset' ? 'Built-in Demo' : 'External Web App'}
              </span>
            </div>

            {actualBrowserUrl && actualBrowserUrl !== 'http://localhost:3000' && (
              <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
                <span className="text-slate-500">Actual Final:</span>
                <span className="text-emerald-400 font-bold truncate max-w-[180px] sm:max-w-none">{actualBrowserUrl}</span>
              </div>
            )}
          </div>

          {/* Description for LLM */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium text-[11px] flex-shrink-0">Target Description for LLM:</span>
            <input
              type="text"
              value={targetDescription}
              onChange={(e) => setTargetDescription(e.target.value)}
              placeholder="e.g. E-commerce application with auth, product catalog, cart calculations, checkout validation"
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* 8-Stage Pipeline Progress Tracker */}
        <PipelineProgress 
          currentStage={stage} 
          stageProgress={stageProgress} 
        />

        {/* =========================================================
            TAB 1: WORKSPACE (SPLIT SCREEN CONTROL ROOM)
        ========================================================= */}
        {activeTab === 'workspace' && (
          <div className="space-y-5 sm:space-y-6">
            
            {/* Dedicated 'Current Run' Status Section */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 shadow-md backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl border ${
                    isExecuting 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                      : stage === 'completed'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    <Activity className={`w-4 h-4 ${isExecuting ? 'animate-pulse text-amber-400' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Current Run Status
                      </h3>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isExecuting
                          ? 'bg-amber-950/90 text-amber-300 border border-amber-600/60'
                          : stage === 'completed'
                          ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/60'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isExecuting ? 'bg-amber-400 animate-ping' : stage === 'completed' ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}></span>
                        {isExecuting ? 'RUN IN PROGRESS' : stage === 'completed' ? 'COMPLETED' : 'IDLE / READY'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {isExecuting 
                        ? `Autonomous QA engine active in ${stage.toUpperCase()} phase (${stageProgress}%)` 
                        : stage === 'completed'
                        ? 'Autonomous cycle completed with full defect verification and Playwright suite generation'
                        : 'No active run. Select target and launch autonomous test.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                  {!isExecuting && (
                    <button
                      onClick={() => runFullAutonomousPipeline(targetMode === 'preset' ? 'http://localhost:3000' : customUrl, targetDescription)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98]"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{stage === 'completed' ? 'Re-Run Pipeline' : 'Start Run'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 5 Status Fields: Run ID, Target, Status, Started, Duration */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
                
                {/* Field 1: Run ID */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Hash className="w-3 h-3 text-indigo-400" />
                    <span>Run ID</span>
                  </div>
                  <div className="font-mono font-bold text-xs sm:text-sm text-white truncate">
                    {currentRunId ? currentRunId : '—'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                    {currentRunId ? 'Active Session' : 'No active run'}
                  </span>
                </div>

                {/* Field 2: Target */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Target className="w-3 h-3 text-indigo-400" />
                    <span>Target</span>
                  </div>
                  <div className="font-mono font-bold text-xs sm:text-sm text-indigo-300 truncate">
                    {targetMode === 'preset' ? 'ApexMart' : customUrl || 'Custom Application'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                    {targetMode === 'preset' ? 'localhost:3000' : 'External Host'}
                  </span>
                </div>

                {/* Field 3: Status */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    <span>Status</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                      isExecuting
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : stage === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isExecuting ? 'bg-amber-400 animate-ping' : stage === 'completed' ? 'bg-emerald-400' : 'bg-slate-400'
                      }`}></span>
                      {isExecuting ? 'RUNNING' : stage === 'completed' ? 'DONE' : 'READY'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block mt-1 truncate">
                    {isExecuting ? `${stage.toUpperCase()} (${stageProgress}%)` : stage === 'completed' ? 'All done' : 'Standing by'}
                  </span>
                </div>

                {/* Field 4: Started */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    <span>Started</span>
                  </div>
                  <div className="font-mono font-bold text-xs sm:text-sm text-white truncate">
                    {runStartTime ? new Date(runStartTime).toLocaleTimeString() : '—'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                    {runStartTime ? new Date(runStartTime).toLocaleDateString() : 'Idle'}
                  </span>
                </div>

                {/* Field 5: Duration */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Timer className="w-3 h-3 text-indigo-400" />
                    <span>Duration</span>
                  </div>
                  <div className={`font-mono font-bold text-xs sm:text-sm truncate ${isExecuting ? 'text-amber-300' : 'text-white'}`}>
                    {runDurationMs > 0 ? `${(runDurationMs / 1000).toFixed(1)}s` : '0.0s'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                    {isExecuting ? 'Live timer' : runDurationMs > 0 ? 'Total elapsed' : 'Idle'}
                  </span>
                </div>

              </div>
            </div>
            
            {/* Neutral & Real-time Autonomous KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              
              {/* Metric 1: Pages Discovered */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 text-xs backdrop-blur-sm">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">
                  Pages Discovered
                </span>
                <span className={`font-mono font-bold text-xl mt-1 block ${pagesDiscovered > 0 ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {pagesDiscovered}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate block">
                  {stage === 'idle' ? 'Awaiting crawler' : stage === 'explore' ? 'Traversing DOM' : 'Routes mapped'}
                </span>
              </div>

              {/* Metric 2: Tests Generated */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 text-xs backdrop-blur-sm">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">
                  Tests Generated
                </span>
                <span className={`font-mono font-bold text-xl mt-1 block ${testCases.length > 0 ? 'text-teal-400' : 'text-slate-500'}`}>
                  {testCases.length}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate block">
                  {stage === 'idle' ? 'Awaiting planner' : testCases.length > 0 ? 'Edge & journeys' : 'Synthesizing'}
                </span>
              </div>

              {/* Metric 3: Tests Executed */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 text-xs backdrop-blur-sm">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">
                  Tests Executed
                </span>
                <span className={`font-mono font-bold text-xl mt-1 block ${testsExecutedCount > 0 ? 'text-white' : 'text-slate-500'}`}>
                  {testsExecutedCount}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate block">
                  {stage === 'idle' ? 'Awaiting execution' : isExecuting ? `Live (${testsExecutedCount}/${testCases.length || 8})` : 'All finished'}
                </span>
              </div>

              {/* Metric 4: Potential Findings */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 text-xs backdrop-blur-sm">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">
                  Potential Findings
                </span>
                <span className={`font-mono font-bold text-xl mt-1 block ${potentialFindingsCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {potentialFindingsCount}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate block">
                  {stage === 'idle' ? 'No anomalies' : potentialFindingsCount > 0 ? 'Invariants flagged' : 'Monitoring DOM'}
                </span>
              </div>

              {/* Metric 5: Verified Bugs */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 text-xs col-span-2 sm:col-span-1 backdrop-blur-sm">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">
                  Verified Bugs
                </span>
                <span className={`font-mono font-bold text-xl mt-1 block ${verifiedBugs.length > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {verifiedBugs.length}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate block">
                  {stage === 'idle' ? '0 confirmed' : verifiedBugs.length > 0 ? '100% reproducible' : 'Verifying determinism'}
                </span>
              </div>

            </div>

            {/* Mobile Workspace View Switcher (Solves mobile nested 1200px scroll-trap) */}
            <div className="flex lg:hidden items-center justify-center p-1 bg-slate-900/90 border border-slate-800/80 rounded-xl gap-1">
              <button
                onClick={() => setMobileWorkspaceTab('console')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  mobileWorkspaceTab === 'console'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Agent Console ({logs.length})</span>
              </button>
              <button
                onClick={() => setMobileWorkspaceTab('target')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  mobileWorkspaceTab === 'target'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Live Target Preview</span>
              </button>
            </div>

            {/* Split Screen Layout: Left = Agent Activity Console, Right = Live App Sandbox */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[480px] lg:min-h-[580px]">
              
              {/* Left Column: Observable Agent Activity Console */}
              <div className={`lg:col-span-5 h-[480px] lg:h-[580px] ${mobileWorkspaceTab === 'console' ? 'block' : 'hidden lg:block'}`}>
                <LiveAgentConsole 
                  logs={logs} 
                  onClearLogs={clearLogs}
                  isExecuting={isExecuting}
                />
              </div>

              {/* Right Column: Live Target Application Sandbox / Live External Monitor */}
              <div className={`lg:col-span-7 flex flex-col h-[480px] lg:h-[580px] ${mobileWorkspaceTab === 'target' ? 'block' : 'hidden lg:flex'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border-t border-x border-slate-800 rounded-t-xl px-4 py-2.5 gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white tracking-wider text-xs">LIVE TARGET APPLICATION</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isExecuting
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-600/60'
                          : stage === 'completed'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isExecuting ? 'bg-amber-400 animate-ping' : stage === 'completed' ? 'bg-emerald-400' : 'bg-slate-400'
                        }`}></span>
                        {isExecuting ? 'RUNNING' : stage === 'completed' ? 'COMPLETED' : 'READY'}
                      </span>
                    </div>

                    {/* View Switcher Controls */}
                    <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[10px]">
                      <button
                        onClick={() => setRightPaneView('target')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          (rightPaneView === 'target' || (rightPaneView === 'auto' && targetMode === 'custom'))
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Target Monitor
                      </button>
                      <button
                        onClick={() => setRightPaneView('sandbox')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          (rightPaneView === 'sandbox' || (rightPaneView === 'auto' && targetMode === 'preset'))
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ApexMart Demo
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="text-slate-500">Target:</span>
                    <span className="text-indigo-400 font-bold truncate max-w-[150px]" title={targetMode === 'preset' ? 'ApexMart' : customUrl}>
                      {targetMode === 'preset' ? 'ApexMart' : customUrl || 'Custom Application'}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500 hidden sm:inline">Active:</span>
                    <span className="text-slate-300 text-[10px] truncate max-w-[120px]">
                      {activeHighlightSelector ? activeHighlightSelector : 'Idle / Ready'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden border-b border-x border-slate-800 rounded-b-xl">
                  {((rightPaneView === 'auto' && targetMode === 'custom') || rightPaneView === 'target') ? (
                    <LiveTargetViewer
                      requestedUrl={targetMode === 'preset' ? 'http://localhost:3000' : customUrl}
                      actualBrowserUrl={actualBrowserUrl}
                      targetPageTitle={targetPageTitle}
                      isExecuting={isExecuting}
                      stage={stage}
                      targetType={targetType}
                      targetScreenshot={targetScreenshot}
                      domSummary={targetDomSummary}
                      discoveredCandidates={discoveredCandidates}
                    />
                  ) : (
                    <StoreView 
                      bugConfigs={bugConfigs}
                      externalActiveHighlightSelector={activeHighlightSelector}
                    />
                  )}
                </div>
              </div>

            </div>

            {/* Anomaly Controls Quick Drawer */}
            <ChaosPanel
              bugs={bugConfigs}
              onToggleBug={handleToggleBug}
              onSetPreset={handleSetPreset}
              verifiedBugs={verifiedBugs}
              isJudgeMode={isJudgeMode}
              onToggleJudgeMode={() => setIsJudgeMode(!isJudgeMode)}
            />

          </div>
        )}

        {/* =========================================================
            TAB 2: TEST RUNS (PREVIOUS / CURRENT EXECUTIONS)
        ========================================================= */}
        {activeTab === 'runs' && (
          <TestRunsView
            historyRuns={historyRuns}
            isExecuting={isExecuting}
            stage={stage}
            stageProgress={stageProgress}
            testCases={testCases}
            verifiedBugsCount={verifiedBugs.length}
            onStartRun={() => runFullAutonomousPipeline(targetMode === 'preset' ? 'http://localhost:3000' : customUrl.trim())}
            targetUrl={targetMode === 'preset' ? 'http://localhost:3000 (ApexMart)' : customUrl.trim()}
          />
        )}

        {/* =========================================================
            TAB 3: FINDINGS (POTENTIAL & VERIFIED DEFECTS & EVIDENCE)
        ========================================================= */}
        {activeTab === 'findings' && (
          <BugReportsList 
            bugs={verifiedBugs}
            potentialFindingsCount={potentialFindingsCount}
            onStartRun={() => runFullAutonomousPipeline(targetMode === 'preset' ? 'http://localhost:3000' : customUrl.trim(), targetDescription)}
            onNavigateWorkspace={() => setActiveTab('workspace')}
            targetName={targetMode === 'preset' ? 'ApexMart Sandbox' : customUrl.trim() || 'Custom Application'}
            targetUrl={targetMode === 'preset' ? 'http://localhost:3000' : customUrl.trim()}
          />
        )}

        {/* =========================================================
            TAB 4: TEST SUITE (REUSABLE PLAYWRIGHT EXPORT)
        ========================================================= */}
        {activeTab === 'suite' && (
          <PlaywrightSuiteViewer
            code={playwrightCode || `// Click "Start Autonomous Run" in the top bar to generate production Playwright tests.`}
            filename="apexmart-autonomous.spec.ts"
            testCases={testCases}
            verifiedBugs={verifiedBugs}
            onRegenerate={() => runFullAutonomousPipeline(targetMode === 'preset' ? 'http://localhost:3000' : customUrl.trim(), targetDescription)}
            isRegenerating={isExecuting}
          />
        )}

        {/* =========================================================
            TAB 5: RISK & LEARNING (LEARNING, RISK SCORES & PRIORITIZATION)
        ========================================================= */}
        {activeTab === 'learning' && (
          <LearningEngineView
            historyRuns={historyRuns}
            journeys={journeys}
            verifiedBugs={verifiedBugs}
            testCases={testCases}
            prioritizationResult={prioritizationResult}
            onRequestAiPrioritization={async () => {
              setIsAiPrioritizing(true);
              const effectiveUrl = targetMode === 'preset' ? 'http://localhost:3000' : customUrl;
              await requestAiPrioritization(historyRuns, verifiedBugs, effectiveUrl, targetDescription);
              setIsAiPrioritizing(false);
            }}
            isAiPrioritizing={isAiPrioritizing}
            onApplyPriorities={applyLearnedPriorities}
            onStartPrioritizedRun={() => {
              setActiveTab('workspace');
              runFullAutonomousPipeline(targetMode === 'preset' ? 'http://localhost:3000' : customUrl, targetDescription);
            }}
            onNavigateWorkspace={() => setActiveTab('workspace')}
          />
        )}

        {/* =========================================================
            SECONDARY VIEW: APEXMART SANDBOX & CHAOS CONTROLS
            Accessible via Target Application -> ApexMart Sandbox
        ========================================================= */}
        {activeTab === 'sandbox' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block text-sm">Target Application Sandbox: ApexMart</span>
                  <span className="text-slate-400 text-[11px]">
                    Controlled planted defects environment for evaluation and manual inspection.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('workspace')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors text-xs shadow-md shadow-indigo-600/20 self-start sm:self-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Workspace</span>
              </button>
            </div>

            <ChaosPanel
              bugs={bugConfigs}
              onToggleBug={handleToggleBug}
              onSetPreset={handleSetPreset}
              verifiedBugs={verifiedBugs}
              isJudgeMode={isJudgeMode}
              onToggleJudgeMode={() => setIsJudgeMode(!isJudgeMode)}
            />

            <div className="h-[750px] shadow-2xl">
              <StoreView
                bugConfigs={bugConfigs}
                externalActiveHighlightSelector={activeHighlightSelector}
              />
            </div>
          </div>
        )}

      </main>

      {/* Modern Desktop Footer (Desktop only >= 1024px) */}
      <footer className="hidden lg:block border-t border-slate-800/80 bg-slate-900/60 py-4 px-6 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <strong className="text-slate-300">ApexQA: Autonomous AI QA Engineer</strong> · Autonomous Quality Assurance Platform
          </div>
          <div>
            Orchestrator: <span className="text-indigo-400">Gemini 3.8 Flash</span> · Real Browser DOM Automation & Playwright Export
          </div>
        </div>
      </footer>

      {/* =========================================================
          MOBILE / TABLET STICKY BOTTOM NAVIGATION BAR (< 1024px)
          Thumb-friendly navigation with touch targets >= 44px
      ========================================================= */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 px-2 py-1.5 flex items-center justify-around shadow-2xl"
        aria-label="Mobile Navigation"
      >
        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-xl transition-all ${
            activeTab === 'workspace' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Workspace</span>
        </button>

        <button
          onClick={() => setActiveTab('runs')}
          className={`relative flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-xl transition-all ${
            activeTab === 'runs' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Runs</span>
          {historyRuns.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-indigo-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('findings')}
          className={`relative flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-xl transition-all ${
            activeTab === 'findings' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bug className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Findings</span>
          {verifiedBugs.length > 0 && (
            <span className="absolute top-0.5 right-1.5 text-[9px] bg-rose-500 text-white font-mono px-1 rounded-full font-bold">
              {verifiedBugs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('suite')}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-xl transition-all ${
            activeTab === 'suite' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileCode className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Suite</span>
        </button>

        <button
          onClick={() => setActiveTab('learning')}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-xl transition-all ${
            activeTab === 'learning' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Learning</span>
        </button>
      </nav>

    </div>
  );
}
