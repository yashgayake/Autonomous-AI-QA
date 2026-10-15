import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Download, FastForward, 
  Video, Sparkles, Check, AlertOctagon, Terminal, 
  ExternalLink, Layers, Info, Code2
} from 'lucide-react';
import { BugReport, PlaywrightVideoClip, VideoAnnotation } from '../../types/qa';
import { renderWebmVideoBlob } from '../../utils/videoGenerator';

interface PlaywrightVideoPlayerProps {
  bug: BugReport;
  clip: PlaywrightVideoClip;
}

export const PlaywrightVideoPlayer: React.FC<PlaywrightVideoPlayerProps> = ({ bug, clip }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showPlaywrightConfig, setShowPlaywrightConfig] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [viewMode, setViewMode] = useState<'interactive' | 'html5'>(clip.videoUrl ? 'html5' : 'interactive');
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(clip.videoUrl || null);

  const totalDurationMs = clip.durationSeconds * 1000;
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  // Auto-generate video URL if requested in HTML5 mode
  const ensureVideoFile = async () => {
    if (localVideoUrl) return;
    setIsExportingVideo(true);
    try {
      const blob = await renderWebmVideoBlob(bug, clip, (pct) => setExportProgress(pct));
      const url = URL.createObjectURL(blob);
      setLocalVideoUrl(url);
      clip.videoUrl = url;
    } catch (e) {
      console.error('Failed to generate video stream:', e);
    } finally {
      setIsExportingVideo(false);
      setExportProgress(0);
    }
  };

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      lastTickRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const tick = (now: number) => {
      if (lastTickRef.current === null) {
        lastTickRef.current = now;
      }
      const delta = (now - lastTickRef.current) * playbackSpeed;
      lastTickRef.current = now;

      setCurrentTimeMs(prev => {
        const next = prev + delta;
        if (next >= totalDurationMs) {
          setIsPlaying(false);
          return totalDurationMs;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, totalDurationMs]);

  // Current active annotation based on playback time
  const activeAnnotation: VideoAnnotation = 
    clip.annotations.slice().reverse().find(a => currentTimeMs >= a.timestampMs) ||
    clip.annotations[0];

  const handlePlayPause = () => {
    if (currentTimeMs >= totalDurationMs) {
      setCurrentTimeMs(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTimeMs(0);
  };

  const handleSeek = (newTimeMs: number) => {
    setCurrentTimeMs(Math.max(0, Math.min(totalDurationMs, newTimeMs)));
  };

  const handleDownloadWebm = async () => {
    setIsExportingVideo(true);
    setExportProgress(10);
    try {
      const blob = await renderWebmVideoBlob(bug, clip, (pct) => setExportProgress(pct));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = clip.filename || `playwright-bug-${bug.id}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download video failed:', e);
    } finally {
      setIsExportingVideo(false);
      setExportProgress(0);
    }
  };

  const handleCopyPlaywrightCode = () => {
    const pwSnippet = `// Playwright Screen Recording Configuration
import { test, expect } from '@playwright/test';

test.use({
  video: {
    mode: 'on',
    size: { width: 1280, height: 720 },
  },
});

test('reproduce ${bug.title}', async ({ page }) => {
  await page.goto('http://localhost:3000');
  ${bug.stepsToReproduce.map(s => `// ${s}`).join('\n  ')}
});
`;
    navigator.clipboard.writeText(pwSnippet);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const currentSeconds = (currentTimeMs / 1000).toFixed(1);
  const totalSeconds = clip.durationSeconds.toFixed(1);
  const progressPercent = Math.min(100, (currentTimeMs / totalDurationMs) * 100);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Video Window Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Video className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-white font-mono">5.0s Playwright Failure Recording</span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
            5.0s Clip • {clip.resolution} • {clip.fps} FPS
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Mode switch */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'interactive' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Annotated HUD
            </button>
            <button
              onClick={() => {
                setViewMode('html5');
                ensureVideoFile();
              }}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'html5' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              HTML5 Video Stream
            </button>
          </div>

          <button
            onClick={() => setShowPlaywrightConfig(!showPlaywrightConfig)}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
          >
            <Code2 className="w-3 h-3 text-indigo-400" />
            <span>Config</span>
          </button>

          <button
            onClick={handleDownloadWebm}
            disabled={isExportingVideo}
            className="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-2.5 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <Download className="w-3 h-3" />
            <span>{isExportingVideo ? `Exporting (${exportProgress}%)...` : 'Download 5s Video (.webm)'}</span>
          </button>
        </div>
      </div>

      {/* Playwright Recording Config Modal / Collapsible */}
      {showPlaywrightConfig && (
        <div className="bg-slate-900/90 border-b border-slate-800 p-3.5 text-xs font-mono space-y-2">
          <div className="flex justify-between items-center text-slate-300">
            <span>Playwright Failure Recording Hook: recordVideo option</span>
            <button
              onClick={handleCopyPlaywrightCode}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
            >
              {copiedConfig ? <Check className="w-3 h-3 text-emerald-400" /> : null}
              <span>{copiedConfig ? 'Copied Snippet' : 'Copy Snippet'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 text-slate-300 p-2.5 rounded text-[10px] overflow-x-auto border border-slate-800">
{`const context = await browser.newContext({
  recordVideo: {
    dir: 'test-results/videos/',
    size: { width: 1280, height: 720 },
  },
});
const page = await context.newPage();`}
          </pre>
        </div>
      )}

      {/* VIEWPORT: NATIVE HTML5 VIDEO OR ANNOTATED SIMULATOR */}
      {viewMode === 'html5' ? (
        <div className="relative aspect-video bg-black flex items-center justify-center border-b border-slate-800 overflow-hidden">
          {localVideoUrl ? (
            <video
              src={localVideoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center p-6 space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 text-rose-400 flex items-center justify-center mx-auto border border-slate-700">
                <Video className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-300">
                Playwright 5-second failure video file ready to stream.
              </p>
              <button
                onClick={ensureVideoFile}
                disabled={isExportingVideo}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <span>{isExportingVideo ? `Rendering Stream (${exportProgress}%)...` : 'Render & Stream Video File'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Main Screen Recording Viewport with Overlays */
        <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex flex-col justify-between border-b border-slate-800 select-none">
        
        {/* Top Watermark & HUD */}
        <div className="p-3 flex justify-between items-start z-10">
          <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-md border border-slate-800 text-[11px] font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-white font-bold">REC</span>
            <span>00:0{currentSeconds}</span>
          </div>

          <div className="bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-md border border-slate-800 text-[10px] font-mono text-slate-400">
            Chromium Headless • Playwright Video Driver
          </div>
        </div>

        {/* Visual Target Mockup Page in Center */}
        <div className="absolute inset-x-8 inset-y-12 bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between pointer-events-none opacity-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-indigo-400">ApexMart E-Commerce Sandbox</span>
            <span className="text-[10px] font-mono text-slate-500">http://localhost:3000/app</span>
          </div>

          {/* Simulated content wireframes */}
          <div className="grid grid-cols-3 gap-3 my-2 flex-1">
            <div className="bg-slate-900/60 border border-slate-800/60 rounded p-2 text-[10px] text-slate-400 flex flex-col justify-between">
              <div>
                <div className="h-10 bg-slate-800/50 rounded mb-1"></div>
                <div className="h-2 w-16 bg-slate-700/60 rounded mb-1"></div>
                <div className="h-2 w-10 bg-slate-700/40 rounded"></div>
              </div>
              <div className="h-4 bg-indigo-600/30 rounded"></div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/60 rounded p-2 text-[10px] text-slate-400 flex flex-col justify-between">
              <div>
                <div className="h-10 bg-slate-800/50 rounded mb-1"></div>
                <div className="h-2 w-16 bg-slate-700/60 rounded mb-1"></div>
                <div className="h-2 w-10 bg-slate-700/40 rounded"></div>
              </div>
              <div className="h-4 bg-indigo-600/30 rounded"></div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/60 rounded p-2 text-[10px] text-slate-400 flex flex-col justify-between">
              <div>
                <div className="h-10 bg-slate-800/50 rounded mb-1"></div>
                <div className="h-2 w-16 bg-slate-700/60 rounded mb-1"></div>
                <div className="h-2 w-10 bg-slate-700/40 rounded"></div>
              </div>
              <div className="h-4 bg-indigo-600/30 rounded"></div>
            </div>
          </div>
        </div>

        {/* Animated Playwright Cursor & Target Box */}
        {activeAnnotation && (
          <div 
            className="absolute transition-all duration-300 pointer-events-none z-20"
            style={{
              left: `${Math.min(85, Math.max(15, (activeAnnotation.coordinates.x / 1280) * 100))}%`,
              top: `${Math.min(80, Math.max(20, (activeAnnotation.coordinates.y / 720) * 100))}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Pulsing ring */}
            <div className={`w-14 h-14 rounded-full border-2 animate-ping absolute -inset-2 ${
              activeAnnotation.isAnomalyPoint ? 'border-rose-500' : 'border-indigo-400'
            }`} />

            {/* Bounding box around target */}
            <div className={`px-2.5 py-1 rounded border shadow-lg text-[10px] font-mono whitespace-nowrap backdrop-blur ${
              activeAnnotation.isAnomalyPoint 
                ? 'bg-rose-950/90 border-rose-500 text-rose-200' 
                : 'bg-indigo-950/90 border-indigo-400 text-indigo-200'
            }`}>
              <div className="font-bold flex items-center gap-1">
                <span>{activeAnnotation.selector}</span>
              </div>
            </div>

            {/* Simulated Mouse Pointer */}
            <svg 
              className="w-5 h-5 text-white drop-shadow-md mt-1 ml-4" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>
          </div>
        )}

        {/* Big Anomaly Alert Overlay when at defect step */}
        {activeAnnotation?.isAnomalyPoint && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-rose-950/90 border border-rose-500/80 rounded-xl p-4 shadow-2xl backdrop-blur-md max-w-sm text-center space-y-1.5 animate-bounce">
            <div className="flex items-center justify-center gap-1.5 text-rose-400 font-bold text-xs uppercase font-mono">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              <span>Verified Anomaly Captured</span>
            </div>
            <p className="text-xs text-white font-medium leading-relaxed">
              {bug.actualBehavior}
            </p>
            <div className="text-[10px] font-mono text-rose-300 bg-rose-900/40 py-0.5 rounded">
              Reproducibility: 100% Deterministic
            </div>
          </div>
        )}

        {/* Bottom Annotation Banner Overlay */}
        <div className="z-10 bg-slate-950/90 backdrop-blur border-t border-slate-800 p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-bold flex-shrink-0">
              STEP {activeAnnotation?.stepIndex || 1}/{clip.annotations.length}
            </span>
            <p className="text-white truncate font-medium">
              {activeAnnotation?.text || 'Executing Journey...'}
            </p>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex-shrink-0">
            {activeAnnotation?.selector}
          </div>
        </div>

      </div>
      )}

      {/* Video Player Transport Controls & Timeline Scrubber */}
      <div className="p-3.5 bg-slate-900 space-y-2.5">
        
        {/* Timeline Scrubber with Step Markers */}
        <div className="relative pt-1">
          <div 
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              handleSeek(pct * totalDurationMs);
            }}
            className="w-full bg-slate-950 h-2 rounded-full cursor-pointer overflow-hidden relative border border-slate-800"
          >
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Step marker pins along timeline */}
          <div className="flex justify-between items-center mt-1 text-[9px] font-mono text-slate-500">
            {clip.annotations.map((a, i) => (
              <button
                key={i}
                onClick={() => handleSeek(a.timestampMs)}
                className={`hover:text-white transition-colors flex items-center gap-0.5 ${
                  a.isAnomalyPoint ? 'text-rose-400 font-bold' : ''
                }`}
              >
                <span>{a.isAnomalyPoint ? '🚨 S' + a.stepIndex : 'S' + a.stepIndex}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Control Buttons row */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-sm"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset Video"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <span className="font-mono text-[11px] text-slate-300 ml-1">
              {currentSeconds}s <span className="text-slate-600">/</span> {totalSeconds}s
            </span>
          </div>

          {/* Speed adjustments */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono bg-slate-950 p-1 rounded border border-slate-800">
            <span className="text-slate-500 mr-1">Speed:</span>
            {[0.5, 1, 1.5, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  playbackSpeed === spd ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
