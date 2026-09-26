import { useState, useCallback, useEffect, useRef } from 'react';

interface UseWebcamStreamOptions {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
}

interface UseWebcamStreamReturn {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: (format?: string) => string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function useWebcamStream(options: UseWebcamStreamOptions = {}): UseWebcamStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam mediaDevices API not supported on this browser');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: options.width ?? 1280 },
          height: { ideal: options.height ?? 720 },
          facingMode: options.facingMode ?? 'environment',
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Webcam access failed';
      console.warn('Camera stream error:', msg);
      setError(msg);
    }
  }, [options.width, options.height, options.facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const captureFrame = useCallback((format = 'image/jpeg') => {
    const video = videoRef.current;
    if (!video || !stream) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(format, 0.9);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    isActive: !!stream,
    error,
    startCamera,
    stopCamera,
    captureFrame,
    videoRef,
  };
}
