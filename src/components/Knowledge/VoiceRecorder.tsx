'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit, Permission } from '@worldcoin/minikit-js';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { Microphone, Play, Square, Restart, Trash } from 'iconoir-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type RecorderState = 'idle' | 'ready' | 'recording' | 'recorded';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onRecordingClear: () => void;
  disabled?: boolean;
}

const MAX_DURATION_SEC = 180; // 3 minutes

export function VoiceRecorder({
  onRecordingComplete,
  onRecordingClear,
  disabled,
}: VoiceRecorderProps) {
  const { isInstalled } = useMiniKit();
  const [state, setState] = useState<RecorderState>('idle');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  // Check microphone permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (isInstalled) {
        try {
          const result = await MiniKit.commandsAsync.getPermissions();
          if (
            result?.finalPayload.status === 'success' &&
            result.finalPayload.permissions?.microphone
          ) {
            setPermissionGranted(true);
            setState('ready');
          }
        } catch {
          // Permission not granted yet, stay in idle
        }
      } else {
        // Outside World App — assume permission available via browser
        setPermissionGranted(true);
        setState('ready');
      }
    };
    checkPermission();
  }, [isInstalled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const requestPermission = async () => {
    setError(null);
    try {
      if (isInstalled) {
        const result = await MiniKit.commandsAsync.requestPermission({
          permission: Permission.Microphone,
        });
        if (result?.finalPayload.status === 'success') {
          setPermissionGranted(true);
          setState('ready');
        } else {
          setError('Microphone permission was denied. Please enable it in World App settings.');
        }
      } else {
        // Browser fallback — requesting getUserMedia will trigger browser permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setPermissionGranted(true);
        setState('ready');
      }
    } catch {
      setError('Failed to request microphone permission.');
    }
  };

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 40;
      const barWidth = canvas.width / barCount;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255;
        const barHeight = value * canvas.height * 0.9;
        const x = i * barWidth;
        const y = (canvas.height - barHeight) / 2;

        ctx.fillStyle = `rgba(59, 130, 246, ${0.4 + value * 0.6})`;
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
        ctx.fill();
      }
    };
    draw();
  }, []);

  const safeStopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = async () => {
    if (state !== 'ready') return; // guard against double-tap
    setState('recording'); // immediately block further taps
    setError(null);
    setElapsedSec(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Close any previous AudioContext
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }

      // Set up analyser for waveform
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);
        setState('recorded');
        onRecordingCompleteRef.current(blob);
        stopStream();
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
        }
      };

      mediaRecorder.start(100); // collect data every 100ms

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => {
          if (prev + 1 >= MAX_DURATION_SEC) {
            safeStopRecording();
            return MAX_DURATION_SEC;
          }
          return prev + 1;
        });
      }, 1000);

      // Start waveform
      drawWaveform();
    } catch {
      setState('ready'); // revert on failure
      setError('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = safeStopRecording;

  const reRecord = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrlRef.current = null;
    setAudioUrl(null);
    setElapsedSec(0);
    setState('ready');
    onRecordingClear();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Idle — need permission
  if (!permissionGranted) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
          <Microphone className="w-8 h-8 text-blue-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">Microphone Access Required</p>
          <p className="text-xs text-gray-500 mt-1">
            Grant microphone access to record a voice sample for voice cloning.
          </p>
        </div>
        {error && (
          <p className="text-xs text-red-600 text-center">{error}</p>
        )}
        <Button onClick={requestPermission} size="lg" disabled={disabled}>
          <Microphone className="w-5 h-5 mr-2" />
          Grant Microphone Access
        </Button>
      </div>
    );
  }

  // Ready — can start recording
  if (state === 'ready') {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">Record Your Voice</p>
          <p className="text-xs text-gray-500 mt-1">
            Record about 2 minutes of your voice for voice cloning.
            Speak naturally and clearly.
          </p>
        </div>
        {error && (
          <p className="text-xs text-red-600 text-center">{error}</p>
        )}
        <button
          onClick={startRecording}
          disabled={disabled}
          className="w-20 h-20 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 rounded-full flex items-center justify-center transition-colors shadow-lg"
        >
          <Microphone className="w-10 h-10 text-white" />
        </button>
        <p className="text-xs text-gray-400">Tap to start recording</p>
      </div>
    );
  }

  // Recording — live waveform + timer
  if (state === 'recording') {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-lg font-mono font-semibold text-gray-900">
            {formatTime(elapsedSec)}
          </span>
          <span className="text-xs text-gray-400">/ {formatTime(MAX_DURATION_SEC)}</span>
        </div>

        <canvas
          ref={canvasRef}
          width={280}
          height={60}
          className="w-full max-w-[280px] h-[60px]"
        />

        <button
          onClick={stopRecording}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
        >
          <Square className="w-6 h-6 text-white" />
        </button>
        <p className="text-xs text-gray-400">Tap to stop recording</p>
      </div>
    );
  }

  // Recorded — playback preview
  if (state === 'recorded' && audioUrl) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-medium text-gray-900">
            Recording Complete — {formatTime(elapsedSec)}
          </span>
        </div>

        <audio controls src={audioUrl} className="w-full max-w-xs" />

        <div className="flex gap-3">
          <button
            onClick={reRecord}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 rounded-xl transition-colors"
          >
            <Restart className="w-4 h-4" />
            Re-record
          </button>
          <button
            onClick={reRecord}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:bg-gray-50 rounded-xl transition-colors"
          >
            <Trash className="w-4 h-4" />
            Discard
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Preview your recording above. Click &quot;Upload Voice&quot; below to upload.
        </p>
      </div>
    );
  }

  return null;
}
