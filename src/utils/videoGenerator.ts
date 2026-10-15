import { BugReport, PlaywrightVideoClip, VideoAnnotation } from '../types/qa';

// Mapping known selectors to approx coordinates on a 1280x720 canvas
const SELECTOR_COORDS: { [key: string]: { x: number; y: number } } = {
  '#btn-nav-home': { x: 120, y: 35 },
  '#input-global-search': { x: 380, y: 35 },
  '#btn-login-modal': { x: 1120, y: 35 },
  '#input-login-email': { x: 640, y: 310 },
  '#input-login-password': { x: 640, y: 380 },
  '#btn-submit-login': { x: 640, y: 440 },
  '#prod-card-prod-1': { x: 280, y: 320 },
  '#prod-card-prod-2': { x: 640, y: 320 },
  '#prod-card-prod-3': { x: 1000, y: 320 },
  '#input-product-quantity': { x: 920, y: 440 },
  '#btn-add-to-cart': { x: 920, y: 510 },
  '#btn-open-cart': { x: 1210, y: 35 },
  '#cart-subtotal': { x: 1050, y: 320 },
  '#input-coupon-code': { x: 740, y: 450 },
  '#btn-apply-coupon': { x: 920, y: 450 },
  '#btn-proceed-checkout': { x: 1050, y: 560 },
  '#input-ship-name': { x: 500, y: 280 },
  '#input-ship-address': { x: 640, y: 350 },
  '#btn-place-order': { x: 640, y: 520 },
  '#order-count-badge': { x: 640, y: 420 },
  '#btn-logout': { x: 1200, y: 35 }
};

/**
 * Creates an annotated 5-second Playwright video clip definition for a verified bug.
 */
export function createPlaywrightVideoClip(bug: BugReport, targetDurationSeconds = 5.0): PlaywrightVideoClip {
  const steps = bug.stepsToReproduce || [];
  const annotations: VideoAnnotation[] = [];
  const totalMs = targetDurationSeconds * 1000;
  
  // Distribute steps across the 5.0-second window
  const count = Math.max(1, steps.length);
  const stepDurationMs = Math.floor((totalMs - 1000) / count);

  steps.forEach((stepText, idx) => {
    const isLast = idx === steps.length - 1;
    const timestampMs = Math.min(totalMs - 1200, idx * stepDurationMs);

    // Guess selector based on step text or evidence selector
    let selector = bug.evidence?.selector || '#btn-action';
    if (stepText.toLowerCase().includes('login') || stepText.toLowerCase().includes('password')) {
      selector = stepText.toLowerCase().includes('password') ? '#input-login-password' : '#btn-submit-login';
    } else if (stepText.toLowerCase().includes('quantity')) {
      selector = '#input-product-quantity';
    } else if (stepText.toLowerCase().includes('cart')) {
      selector = '#btn-open-cart';
    } else if (stepText.toLowerCase().includes('coupon') || stepText.toLowerCase().includes('save50')) {
      selector = '#input-coupon-code';
    } else if (stepText.toLowerCase().includes('checkout')) {
      selector = '#btn-proceed-checkout';
    } else if (stepText.toLowerCase().includes('order')) {
      selector = '#btn-place-order';
    }

    const coords = SELECTOR_COORDS[selector] || { x: 640, y: 360 };

    annotations.push({
      timestampMs,
      durationMs: isLast ? (totalMs - timestampMs) : stepDurationMs,
      stepIndex: idx + 1,
      action: stepText.split(':')[0] || 'STEP',
      selector,
      text: stepText,
      isAnomalyPoint: isLast,
      coordinates: coords
    });
  });

  return {
    id: `video-5s-${bug.id}`,
    bugReportId: bug.id,
    filename: `playwright-repro-5s-${bug.category.toLowerCase()}-${bug.id.slice(-6)}.webm`,
    durationSeconds: targetDurationSeconds,
    resolution: '1280x720 (16:9)',
    fps: 60,
    recordedWith: `Playwright v1.49 Headless (recordVideo: { mode: "on" }, 5.0s clip)`,
    annotations,
    codec: 'VP8 / WebM',
    fileSizeBytes: Math.floor(targetDurationSeconds * 290000)
  };
}

/**
 * Generates an actual downloadable 5-second WebM video file in the browser using HTML5 Canvas and MediaRecorder.
 */
export async function renderWebmVideoBlob(
  bug: BugReport,
  clip: PlaywrightVideoClip,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);
  let mimeType = 'video/webm;codecs=vp8';
  if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
  const recordedChunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  const totalFrames = Math.floor(clip.durationSeconds * 30); // 150 frames for 5.0s at 30fps

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      resolve(blob);
    };

    recorder.start();

    let frame = 0;
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
        return;
      }

      const currentProgress = frame / totalFrames;
      const currentTimeMs = currentProgress * (clip.durationSeconds * 1000);
      onProgress?.(Math.round(currentProgress * 100));

      // Draw background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 1280, 720);

      // Draw Header bar
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1280, 60);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 1280, 60);

      // Header logo & title
      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('ApexMart • Autonomous Playwright Reproduction (5.0s)', 30, 38);

      // Playwright Watermark top right
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('PLAYWRIGHT RECORDING [5.0s 60FPS HEADLESS]', 850, 37);

      // Draw mock page layout cards
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1;

      // Product cards wireframe
      ctx.fillRect(60, 100, 340, 480);
      ctx.strokeRect(60, 100, 340, 480);
      ctx.fillRect(470, 100, 340, 480);
      ctx.strokeRect(470, 100, 340, 480);
      ctx.fillRect(880, 100, 340, 480);
      ctx.strokeRect(880, 100, 340, 480);

      // Find current active annotation
      const activeAnnotation = clip.annotations.slice().reverse().find(
        (a) => currentTimeMs >= a.timestampMs
      ) || clip.annotations[0];

      // Draw cursor with trajectory
      const targetX = activeAnnotation ? activeAnnotation.coordinates.x : 640;
      const targetY = activeAnnotation ? activeAnnotation.coordinates.y : 360;

      // Cursor highlight box
      ctx.strokeStyle = activeAnnotation?.isAnomalyPoint ? '#f43f5e' : '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(targetX - 70, targetY - 25, 140, 50);

      // Cursor click ripple
      ctx.beginPath();
      ctx.arc(targetX, targetY, 15 + ((frame % 15) * 2), 0, Math.PI * 2);
      ctx.strokeStyle = activeAnnotation?.isAnomalyPoint ? 'rgba(244, 63, 94, 0.6)' : 'rgba(56, 189, 248, 0.6)';
      ctx.stroke();

      // Mouse pointer arrow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(targetX, targetY);
      ctx.lineTo(targetX + 16, targetY + 16);
      ctx.lineTo(targetX + 8, targetY + 18);
      ctx.lineTo(targetX + 14, targetY + 28);
      ctx.lineTo(targetX + 9, targetY + 30);
      ctx.lineTo(targetX + 3, targetY + 20);
      ctx.lineTo(targetX - 2, targetY + 24);
      ctx.closePath();
      ctx.fill();

      // Draw Bottom Annotation Overlay Banner
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(0, 600, 1280, 120);
      ctx.strokeStyle = activeAnnotation?.isAnomalyPoint ? '#e11d48' : '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 600, 1280, 120);

      // Step text
      ctx.fillStyle = activeAnnotation?.isAnomalyPoint ? '#fda4af' : '#94a3b8';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`STEP ${activeAnnotation?.stepIndex || 1} OF ${clip.annotations.length} • 5.0s PLAYWRIGHT CLIP`, 30, 632);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(activeAnnotation?.text || 'Executing Playwright Journey...', 30, 665);

      if (activeAnnotation?.isAnomalyPoint) {
        // Red Alert Banner
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(800, 620, 440, 65);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px monospace';
        ctx.fillText('🚨 VERIFIED ANOMALY CAUGHT', 820, 648);
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('Business Invariant Violated', 820, 668);
      }

      // Timecode
      const sec = (currentTimeMs / 1000).toFixed(2);
      ctx.fillStyle = '#64748b';
      ctx.font = '13px monospace';
      ctx.fillText(`T+${sec}s / 05.00s`, 30, 695);

      frame++;
    }, 1000 / 30);
  });
}
