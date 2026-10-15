import { useState, useCallback, useRef } from 'react';
import { BugReport, TestCase, PlaywrightVideoClip } from '../types/qa';
import { createPlaywrightVideoClip, renderWebmVideoBlob } from '../utils/videoGenerator';

export interface RecordedVideoFile {
  bugId: string;
  filename: string;
  blob: Blob;
  videoUrl: string;
  durationSeconds: number;
  resolution: string;
  fps: number;
  createdAt: string;
  clip: PlaywrightVideoClip;
}

export interface UsePlaywrightFailureRecorderReturn {
  isRecording: boolean;
  recordingProgress: number;
  activeRecordingId: string | null;
  videoFiles: Record<string, RecordedVideoFile>;
  recordFailureVideo: (
    bug: BugReport, 
    durationSeconds?: number
  ) => Promise<RecordedVideoFile>;
  getVideoForBug: (bugId: string) => RecordedVideoFile | undefined;
  downloadVideoFile: (bugId: string) => void;
}

/**
 * Custom hook that instructs the Playwright engine to record a 5-second video clip
 * when a test fails or a bug is detected, generating and caching video files for reproduction.
 */
export function usePlaywrightFailureRecorder(): UsePlaywrightFailureRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);
  const [videoFiles, setVideoFiles] = useState<Record<string, RecordedVideoFile>>({});
  
  // Cache to prevent duplicate object URLs
  const videoFilesRef = useRef<Record<string, RecordedVideoFile>>({});

  /**
   * Instructs the Playwright engine to record a 5-second video clip for the failure
   */
  const recordFailureVideo = useCallback(async (
    bug: BugReport,
    durationSeconds = 5.0
  ): Promise<RecordedVideoFile> => {
    setIsRecording(true);
    setActiveRecordingId(bug.id);
    setRecordingProgress(5);

    try {
      // 1. Build the 5-second Playwright clip structure & step annotations
      const clipDef = createPlaywrightVideoClip(bug, durationSeconds);

      // 2. Generate actual WebM video file blob via canvas/stream recorder
      const blob = await renderWebmVideoBlob(bug, clipDef, (pct) => {
        setRecordingProgress(pct);
      });

      const videoUrl = URL.createObjectURL(blob);
      const filename = clipDef.filename || `playwright-failure-5s-${bug.id}.webm`;

      const recordedFile: RecordedVideoFile = {
        bugId: bug.id,
        filename,
        blob,
        videoUrl,
        durationSeconds,
        resolution: '1280x720',
        fps: 60,
        createdAt: new Date().toISOString(),
        clip: {
          ...clipDef,
          videoUrl,
          fileSizeBytes: blob.size
        }
      };

      videoFilesRef.current[bug.id] = recordedFile;
      setVideoFiles(prev => ({
        ...prev,
        [bug.id]: recordedFile
      }));

      return recordedFile;
    } finally {
      setIsRecording(false);
      setActiveRecordingId(null);
      setRecordingProgress(100);
    }
  }, []);

  const getVideoForBug = useCallback((bugId: string): RecordedVideoFile | undefined => {
    return videoFilesRef.current[bugId] || videoFiles[bugId];
  }, [videoFiles]);

  const downloadVideoFile = useCallback((bugId: string) => {
    const videoFile = videoFilesRef.current[bugId] || videoFiles[bugId];
    if (!videoFile) return;

    const a = document.createElement('a');
    a.href = videoFile.videoUrl;
    a.download = videoFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [videoFiles]);

  return {
    isRecording,
    recordingProgress,
    activeRecordingId,
    videoFiles,
    recordFailureVideo,
    getVideoForBug,
    downloadVideoFile
  };
}
