import React, { useEffect, useRef, useState } from 'react';
import { useMicrophoneStream } from '../../hooks/useMicrophoneStream';
import { useLmsNoiseFilter } from '../../hooks/useLmsNoiseFilter';
import { LocalAudioTrack } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react'; // If used within a LiveKitRoom

export const Stage1AudioTester: React.FC = () => {
  const {
    isRecording,
    audioStream,
    error,
    permissionStatus,
    startRecording,
    stopRecording
  } = useMicrophoneStream();

  const {
    filteredStream,
    isFiltering,
    toggleFilter
  } = useLmsNoiseFilter(audioStream);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<LocalAudioTrack | null>(null);
  const [initTimeMs, setInitTimeMs] = useState<number | null>(null);
  
  // Try to get room context, will be null if not inside <LiveKitRoom>
  let room: any = null;
  try {
    room = useRoomContext();
  } catch (e) {
    // Ignore error if not inside room provider for standalone testing
  }

  // Handle LiveKit LocalAudioTrack creation
  useEffect(() => {
    if (filteredStream) {
      const mediaStreamTrack = filteredStream.getAudioTracks()[0];
      if (mediaStreamTrack) {
        const t0 = performance.now();
        const localTrack = new LocalAudioTrack(mediaStreamTrack);
        trackRef.current = localTrack;
        const t1 = performance.now();
        setInitTimeMs(t1 - t0);

        // If we have a connected room, we could publish it here:
        // if (room && room.state === 'connected') {
        //   room.localParticipant.publishTrack(localTrack);
        // }
      }
    } else {
      if (trackRef.current) {
        trackRef.current.stop();
        trackRef.current = null;
      }
      setInitTimeMs(null);
    }
    
    return () => {
      if (trackRef.current) {
        trackRef.current.stop();
      }
    };
  }, [filteredStream, room]);

  // Audio Level Visualization
  useEffect(() => {
    if (!filteredStream || !canvasRef.current) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    
    const source = audioCtx.createMediaStreamSource(filteredStream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    let animationFrameId: number = 0;

    const draw = () => {
      if (!canvasCtx) return;
      
      const width = canvas.width;
      const height = canvas.height;
      
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = 'rgb(15, 23, 42)'; // tailwind slate-900
      canvasCtx.fillRect(0, 0, width, height);

      const barWidth = (width / dataArray.length) * 2.5;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i] / 2;
        
        const r = barHeight + (25 * (i / dataArray.length));
        const g = 250 * (i / dataArray.length);
        const b = 50;

        canvasCtx.fillStyle = `rgb(\${r},\${g},\${b})`;
        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      source.disconnect();
      audioCtx.close();
    };
  }, [filteredStream]);

  return (
    <div className="p-6 max-w-2xl mx-auto bg-slate-900 text-slate-100 rounded-xl shadow-2xl border border-slate-700">
      <div className="flex flex-col space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            K.O.C.H. Stage 1: Audio Ingestion
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Client-Side Acoustic Noise Filtering & WebRTC Transport
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-6 py-2 rounded-md font-semibold transition-all duration-200 \${
              isRecording 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50'
                : 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 border border-teal-500/50'
            }`}
          >
            {isRecording ? 'Stop Recording' : 'Start Microphone'}
          </button>

          <div className="flex-1" />

          <div className="flex items-center space-x-3">
            <span className="text-sm text-slate-300">Raw Audio</span>
            <button
              onClick={() => toggleFilter(!isFiltering)}
              disabled={!isRecording}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none \${
                isFiltering ? 'bg-teal-500' : 'bg-slate-600'
              } \${!isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 \${
                  isFiltering ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-semibold text-teal-400">LMS Filtered</span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 flex flex-col">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Permission</span>
            <span className={`mt-1 font-medium \${
              permissionStatus === 'granted' ? 'text-green-400' :
              permissionStatus === 'denied' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {permissionStatus.toUpperCase()}
            </span>
          </div>
          
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 flex flex-col">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">LiveKit Track Init</span>
            <span className="mt-1 font-medium text-blue-400">
              {initTimeMs !== null ? `\${initTimeMs.toFixed(2)} ms` : 'Waiting...'}
            </span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Visualizer */}
        <div className="flex flex-col space-y-2">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Live Audio Feed</span>
          <div className="w-full h-32 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative">
            {!isRecording && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
                Microphone inactive
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={600}
              height={128}
              className="w-full h-full"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
