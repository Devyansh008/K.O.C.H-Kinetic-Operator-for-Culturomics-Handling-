import { useState, useCallback, useEffect, useRef } from 'react';

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'checking';

interface UseMicrophoneStreamReturn {
  isRecording: boolean;
  audioStream: MediaStream | null;
  error: string | null;
  permissionStatus: PermissionStatus;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useMicrophoneStream(): UseMicrophoneStreamReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check initial permission status if the Permissions API is supported
    const checkPermissions = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissionStatus(result.state as PermissionStatus);

          result.onchange = () => {
            setPermissionStatus(result.state as PermissionStatus);
          };
        } else {
          // Fallback if permissions API is not fully supported for microphone
          setPermissionStatus('prompt');
        }
      } catch (err) {
        console.warn('Permissions API not fully supported', err);
        setPermissionStatus('prompt');
      }
    };

    checkPermissions();

    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      streamRef.current = stream;
      setAudioStream(stream);
      setIsRecording(true);
      setPermissionStatus('granted');
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      let errorMessage = 'Failed to access microphone.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied. Please allow access in your browser settings.';
        setPermissionStatus('denied');
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone device found.';
      }

      setError(errorMessage);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setAudioStream(null);
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    audioStream,
    error,
    permissionStatus,
    startRecording,
    stopRecording,
  };
}
