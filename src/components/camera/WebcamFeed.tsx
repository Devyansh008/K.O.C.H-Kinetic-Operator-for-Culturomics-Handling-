import React, { useState } from 'react';
import { Camera, CameraOff, Crosshair, Zap, Layers, RefreshCw } from 'lucide-react';
import { useWebcamStream } from '../../hooks/useWebcamStream';
import { CoordinateReticle } from './CoordinateReticle';
import { useKoch } from '../../lib/mockState';

export const WebcamFeed: React.FC = () => {
  const { stream, isActive, error, startCamera, stopCamera, captureFrame, videoRef } = useWebcamStream();
  const { state, emitFrameMark, selectWell } = useKoch();
  const [reticleEnabled, setReticleEnabled] = useState(true);
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);

  const activeWell = state.selectedWell ?? 'C7';

  const handleCapture = () => {
    const dataUrl = captureFrame();
    if (dataUrl) {
      setLastCaptureUrl(dataUrl);
      emitFrameMark(activeWell);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between font-mono text-xs relative">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-amber-500/20 mb-2">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-amber-300 uppercase tracking-wider text-xs">
            LENS 2: Optical Video Telemetry
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-stone-400">FPS: 30</span>
          <span className="text-stone-500">|</span>
          <span className={isActive ? 'text-emerald-400 font-bold' : 'text-stone-500'}>
            {isActive ? 'OPTICAL FEED LIVE' : 'FEED OFFLINE'}
          </span>
        </div>
      </div>

      {/* Main Video Screen with Reticle Overlay */}
      <div className="relative flex-1 bg-stone-950 rounded-xl overflow-hidden border border-amber-500/30 flex items-center justify-center min-h-[260px] shadow-2xl">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />

        {/* Reticle Canvas */}
        {isActive && reticleEnabled && (
          <CoordinateReticle targetCoordinate={activeWell} />
        )}

        {/* Scan line effect */}
        {isActive && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent animate-scan pointer-events-none" />
        )}

        {/* Offline / Error Placeholder */}
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stone-950/80">
            {error ? (
              <p className="text-red-400 text-xs mb-3">{error}</p>
            ) : (
              <p className="text-stone-400 text-xs mb-3">
                Live camera focused on multi-well culture plates
              </p>
            )}
            <button
              onClick={startCamera}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Initialize Optical Sensor
            </button>
          </div>
        )}

        {/* Last Capture Watermark overlay */}
        {lastCaptureUrl && (
          <div className="absolute top-3 right-3 w-20 h-14 rounded-lg overflow-hidden border border-amber-500/40 shadow-lg bg-black">
            <img src={lastCaptureUrl} alt="Thumbnail" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-amber-300 text-center py-0.5">
              SYNCED
            </div>
          </div>
        )}
      </div>

      {/* Controls Strip */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isActive ? (
            <button
              onClick={stopCamera}
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 rounded-lg flex items-center gap-1.5"
            >
              <CameraOff className="w-3.5 h-3.5" /> Stop
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-lg flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" /> Start Feed
            </button>
          )}

          <button
            onClick={() => setReticleEnabled(!reticleEnabled)}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
              reticleEnabled
                ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                : 'bg-stone-900 border-stone-800 text-stone-500'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Reticle: {reticleEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Target Well Selector */}
          <div className="flex items-center gap-1 bg-stone-900/80 px-2 py-1 rounded-lg border border-amber-500/20 text-[11px]">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-stone-400">Target:</span>
            <select
              value={activeWell}
              onChange={(e) => selectWell(e.target.value)}
              className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer"
            >
              {['A1', 'B3', 'C7', 'D5', 'F8', 'H12'].map((w) => (
                <option key={w} value={w} className="bg-stone-900 text-amber-200">
                  {w}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCapture}
            disabled={!isActive}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:pointer-events-none text-stone-950 font-bold rounded-lg shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" /> Correlate Frame
          </button>
        </div>
      </div>
    </div>
  );
};
