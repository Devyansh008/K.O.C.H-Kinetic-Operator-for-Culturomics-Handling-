/**
 * src/components/lab/WebcamFeed.tsx
 *
 * Live laptop webcam stream with crosshair overlay and frame-capture.
 * Uses navigator.mediaDevices.getUserMedia — no external deps.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Crosshair, Zap, Monitor } from 'lucide-react';
import { useKoch } from '../../lib/mockState';

interface FrameCapture {
  dataUrl: string;
  timestamp: string;
  frameId: string;
}

export function WebcamFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<FrameCapture | null>(null);
  const [capturing, setCapturing] = useState(false);
  const { emitFrameMark, state } = useKoch();

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access denied');
    }
  }, []);

  // Stop webcam
  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  // Capture frame
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !stream) return;

    setCapturing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);

    // Burn timestamp onto frame
    const ts = new Date().toISOString();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '12px monospace';
    ctx.fillText(`FRAME: ${ts}`, 10, 20);
    ctx.fillText(`PLATE 4 | WELL: ${state.selectedWell ?? '---'}`, 10, 36);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const frameId = `frame_${Date.now()}`;
    setLastCapture({ dataUrl, timestamp: ts, frameId });

    // Emit telemetry
    emitFrameMark(state.selectedWell ?? undefined);

    setTimeout(() => setCapturing(false), 300);
  }, [stream, state.selectedWell, emitFrameMark]);

  const isActive = !!stream;

  return (
    <div className="card flex flex-col gap-3 h-full">
      <div className="card-header">
        <Monitor className="w-4 h-4" />
        Live Camera Telemetry
        {isActive && (
          <span className="ml-auto badge-active">
            <span className="status-dot-active" />
            STREAMING
          </span>
        )}
      </div>

      {/* Camera viewport */}
      <div className="relative bg-black rounded-lg overflow-hidden flex-1 min-h-[220px]">
        {/* Video element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />

        {/* Crosshair overlay */}
        {isActive && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Outer corners */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-lab-accent/70" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-lab-accent/70" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-lab-accent/70" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-lab-accent/70" />
            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Crosshair className="w-8 h-8 text-lab-accent/50" />
            </div>
            {/* Frame info overlay */}
            <div className="absolute bottom-2 left-2 font-mono text-[9px] text-lab-accent/80 space-y-0.5">
              <div>PLATE 4 | WELL: {state.selectedWell ?? '---'}</div>
              <div>{new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
            </div>
            {/* Scan line animation */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-lab-accent/30 to-transparent animate-scan" />
          </div>
        )}

        {/* Placeholder when no stream */}
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-lab-surface">
            {error ? (
              <>
                <CameraOff className="w-10 h-10 text-lab-danger" />
                <p className="text-xs font-mono text-lab-danger text-center max-w-[200px]">{error}</p>
              </>
            ) : (
              <>
                <Camera className="w-10 h-10 text-lab-muted" />
                <p className="text-xs font-mono text-lab-subtext">Camera inactive</p>
              </>
            )}
          </div>
        )}

        {/* Flash on capture */}
        {capturing && (
          <div className="absolute inset-0 bg-lab-accent/20 rounded-lg pointer-events-none" />
        )}
      </div>

      {/* Hidden canvas for frame grab */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!isActive ? (
          <button className="btn-primary text-xs flex-1" onClick={startCamera}>
            <Camera className="w-3.5 h-3.5" />
            Start Camera
          </button>
        ) : (
          <>
            <button
              className="btn bg-lab-accent2/20 text-lab-accent2 border border-lab-accent2/30 hover:bg-lab-accent2/30 text-xs flex-1"
              onClick={captureFrame}
              disabled={capturing}
            >
              <Zap className="w-3.5 h-3.5" />
              Capture Frame
            </button>
            <button className="btn-ghost text-xs" onClick={stopCamera}>
              <CameraOff className="w-3.5 h-3.5" />
              Stop
            </button>
          </>
        )}
      </div>

      {/* Last capture preview */}
      {lastCapture && (
        <div className="border border-lab-border rounded-lg overflow-hidden">
          <div className="px-2 py-1 bg-lab-surface flex items-center justify-between">
            <span className="text-[9px] font-mono text-lab-subtext">LAST FRAME</span>
            <span className="text-[9px] font-mono text-lab-accent">{lastCapture.frameId}</span>
          </div>
          <img
            src={lastCapture.dataUrl}
            alt="Last captured frame"
            className="w-full h-16 object-cover"
          />
          <div className="px-2 py-1">
            <span className="text-[9px] font-mono text-lab-subtext">{lastCapture.timestamp}</span>
          </div>
        </div>
      )}
    </div>
  );
}
