/**
 * src/components/voice/GlobalVoiceAssistant.tsx
 *
 * Persistent Global Voice Assistant HUD docked at the bottom center of the screen.
 * Features:
 *   - Continuous hands-free "Hey KOCH" wake-word listening.
 *   - AssemblyAI Real-Time speech-to-text waveform & interim transcription.
 *   - AI response card powered by Google Gemini with culturomics actions.
 *   - Browser Text-To-Speech (TTS) spoken replies with mute toggle.
 *   - Quick-trigger command pills & manual push-to-talk button.
 */

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronUp,
  ChevronDown,
  X,
  Bot,
  Terminal,
  Activity,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';

const QUICK_COMMANDS = [
  'Mark plate 4 well C7 positive',
  'Log OD600 0.145',
  'What is the incubator temperature?',
  'Start incubation protocol timer',
  'Status of culturomics session',
];

export const GlobalVoiceAssistant: React.FC = () => {
  const {
    state,
    toggleHandsFree,
    triggerManualTalk,
    toggleTtsMute,
    dismissAssistant,
    processFinalTranscript,
  } = useVoiceAssistant();

  // Default to collapsed capsule in standby
  const [isExpanded, setIsExpanded] = useState(false);

  const isCapturing = state.status === 'HEARD_WAKEWORD' || state.status === 'LISTENING_SPEECH';
  const isThinking = state.status === 'GENERATING_REPLY';
  const isSpeaking = state.status === 'SPEAKING';
  const isListeningWake = state.status === 'LISTENING_WAKEWORD';

  // Auto-expand when wake-word triggers, user initiates speech, or an AI reply arrives
  React.useEffect(() => {
    if (state.status === 'HEARD_WAKEWORD' || state.status === 'LISTENING_SPEECH' || state.assistantReply) {
      setIsExpanded(true);
    }
  }, [state.status, state.assistantReply]);

  const handleDismiss = () => {
    dismissAssistant();
    setIsExpanded(false);
  };

  // Status configuration
  const statusConfig = {
    IDLE: {
      label: 'Voice Standby',
      color: 'text-amber-300',
      bg: 'bg-amber-950/40 border-amber-500/40',
      dot: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
    },
    LISTENING_WAKEWORD: {
      label: "Say 'Hey KOCH'",
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-500/40',
      dot: 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]',
    },
    HEARD_WAKEWORD: {
      label: 'Wake Word Detected',
      color: 'text-cyan-300',
      bg: 'bg-cyan-950/60 border-cyan-400',
      dot: 'bg-cyan-300 animate-ping shadow-[0_0_8px_#06b6d4]',
    },
    LISTENING_SPEECH: {
      label: `Streaming to ${state.sttEngine}`,
      color: 'text-teal-300',
      bg: 'bg-teal-950/60 border-teal-400/60 shadow-[0_0_15px_rgba(20,184,166,0.25)]',
      dot: 'bg-teal-400 animate-pulse shadow-[0_0_8px_#14b8a6]',
    },
    GENERATING_REPLY: {
      label: 'K.O.C.H. AI Thinking…',
      color: 'text-indigo-300',
      bg: 'bg-indigo-950/60 border-indigo-400/60',
      dot: 'bg-indigo-400 animate-spin shadow-[0_0_8px_#818cf8]',
    },
    SPEAKING: {
      label: 'Speaking Response',
      color: 'text-amber-300',
      bg: 'bg-amber-950/60 border-amber-400/60',
      dot: 'bg-amber-400 animate-bounce shadow-[0_0_8px_#f59e0b]',
    },
    ERROR: {
      label: 'Voice Error',
      color: 'text-rose-400',
      bg: 'bg-rose-950/60 border-rose-500/50',
      dot: 'bg-rose-400 shadow-[0_0_8px_#f43f5e]',
    },
  }[state.status] || {
    label: 'Voice Standby',
    color: 'text-amber-300',
    bg: 'bg-amber-950/40 border-amber-500/40',
    dot: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999999,
        pointerEvents: 'none',
      }}
      className="font-mono flex flex-col items-end"
    >
      {!isExpanded ? (
        /* Collapsed Standby Capsule (Bottom Right) */
        <div
          style={{ pointerEvents: 'auto' }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-stone-950/95 backdrop-blur-2xl border-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.5),0_10px_30px_rgba(0,0,0,0.95)] hover:border-amber-400 transition-all duration-300 select-none"
        >
          {/* Status Indicator & Label - Click to Expand */}
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-none"
            title="Click to expand Voice HUD"
          >
            <div className="relative flex items-center justify-center">
              <span className={`w-3 h-3 rounded-full ${statusConfig.dot}`} />
              {isCapturing && (
                <span className="absolute -inset-1 rounded-full bg-amber-400/40 animate-ping" />
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold tracking-wide uppercase ${statusConfig.color}`}>
                  {isCapturing
                    ? 'Listening…'
                    : isThinking
                    ? 'Thinking…'
                    : isSpeaking
                    ? 'Speaking…'
                    : statusConfig.label}
                </span>
                {state.isHandsFree && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold uppercase">
                    AUTO
                  </span>
                )}
              </div>
              {state.currentTranscript && (
                <span className="text-[10px] text-amber-200/90 truncate max-w-[140px]">
                  "{state.currentTranscript}"
                </span>
              )}
            </div>
          </button>

          {/* Mini Waveform Visualizer (When active speech is detected) */}
          {isCapturing && (
            <div className="flex items-center gap-0.5 h-4 px-1.5 bg-black/60 rounded-full border border-amber-500/30">
              {state.audioLevels.slice(0, 5).map((lvl, idx) => (
                <span
                  key={idx}
                  className="w-0.5 bg-amber-400 rounded-full transition-all duration-75 shadow-[0_0_6px_#f59e0b]"
                  style={{ height: `${Math.max(3, Math.min(16, lvl / 2))}px` }}
                />
              ))}
            </div>
          )}

          <div className="h-5 w-px bg-amber-500/30" />

          {/* Push-to-Talk Mic Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerManualTalk();
              setIsExpanded(true);
            }}
            disabled={isThinking}
            title={isCapturing ? 'Stop Recording' : 'Push-To-Talk (Speak Now)'}
            className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer shadow-md ${
              isCapturing
                ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.7)] animate-pulse border border-rose-400'
                : 'bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] border border-amber-400'
            }`}
          >
            {isCapturing ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 font-bold" />}
          </button>

          {/* Expand HUD Chevron */}
          <button
            onClick={() => setIsExpanded(true)}
            title="Expand Voice Assistant HUD"
            className="p-1.5 rounded-full text-stone-400 hover:text-amber-300 hover:bg-stone-800/80 transition-colors cursor-pointer"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Expanded HUD Panel (Bottom Right) */
        <div
          style={{ pointerEvents: 'auto' }}
          className="w-96 sm:w-[420px] max-w-[calc(100vw-2rem)] bg-stone-950/95 backdrop-blur-xl border-2 border-amber-500/80 shadow-[0_0_35px_rgba(245,158,11,0.4),0_20px_40px_rgba(0,0,0,0.95)] rounded-2xl overflow-hidden transition-all duration-300"
        >
          {/* Top Control Ribbon */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/20 bg-black/40">
            {/* Left: Status Badge & Wake word info */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                <span>{statusConfig.label}</span>
              </div>

              {state.isHandsFree && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  AUTO
                </span>
              )}
            </div>

            {/* Right: Actions (Hands-Free Toggle, TTS, Collapse to Capsule, Dismiss) */}
            <div className="flex items-center gap-1.5">
              {/* Hands-Free Toggle */}
              <button
                onClick={toggleHandsFree}
                title={state.isHandsFree ? 'Mute hands-free wake word' : 'Enable hands-free wake word'}
                className={`p-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  state.isHandsFree
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              {/* TTS Audio Mute Toggle */}
              <button
                onClick={toggleTtsMute}
                title={state.ttsMuted ? 'Unmute voice replies' : 'Mute voice replies'}
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  state.ttsMuted
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {state.ttsMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {/* Collapse back to capsule */}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                title="Collapse to capsule"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Dismiss */}
              {(state.assistantReply || state.currentTranscript) && (
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  title="Dismiss reply"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Expanded HUD Body */}
          <div className="p-4 space-y-3">
            
            {/* Real-time Audio Waveform & Push-To-Talk Button */}
            <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-amber-500/20">
              {/* Push-to-Talk / Tap to Speak Button */}
              <button
                onClick={triggerManualTalk}
                disabled={isThinking}
                className={`p-3.5 rounded-xl border font-mono font-semibold text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                  isCapturing
                    ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                }`}
              >
                {isCapturing ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isCapturing ? 'Stop Recording' : 'Push-To-Talk'}</span>
              </button>

              {/* Dynamic 16-bar Audio Waveform */}
              <div className="flex-1 flex items-center justify-center gap-1 h-10 px-2 bg-stone-900/60 rounded-lg border border-amber-500/10">
                {state.audioLevels.map((lvl, idx) => (
                  <span
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isCapturing
                        ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                        : isSpeaking
                        ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                        : 'bg-stone-700'
                    }`}
                    style={{ height: `${Math.max(4, Math.min(32, lvl))}px` }}
                  />
                ))}
              </div>
            </div>

            {/* Live Streaming Speech Transcript */}
            {state.currentTranscript && (
              <div className="p-3 bg-stone-900/70 border border-amber-500/25 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-amber-400 font-mono">
                  <span>LIVE RECOGNITION</span>
                  <span className="animate-pulse">● Active Stream</span>
                </div>
                <p className="text-amber-100 font-mono text-sm leading-relaxed">
                  "{state.currentTranscript}"
                </p>
              </div>
            )}

            {/* AI Assistant Spoken Reply Card */}
            {state.assistantReply && (
              <div className="p-3.5 bg-gradient-to-br from-amber-950/30 to-stone-900/80 border border-amber-500/30 rounded-xl text-xs space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-300 font-mono font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>K.O.C.H. ASSISTANT // CO-PILOT</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                    {state.assistantReply.source.toUpperCase()}
                  </span>
                </div>

                <p className="text-stone-100 font-mono text-xs leading-relaxed">
                  {state.assistantReply.replyText}
                </p>

                {/* Intent Execution Confirmation */}
                {state.assistantReply.intent && (
                  <div className="pt-2 border-t border-amber-500/15 flex items-center justify-between text-[10px] font-mono text-stone-400">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Action: {state.assistantReply.intent.action}</span>
                    </div>
                    {state.assistantReply.actionExecuted && (
                      <span className="text-stone-400 italic">
                        Action completed successfully
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quick-Trigger Laboratory Voice Commands */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 mb-1.5">
                <span>QUICK LAB PHRASES (TAP TO TEST)</span>
                {!state.isHandsFree && (
                  <span className="text-emerald-400 hover:underline cursor-pointer" onClick={toggleHandsFree}>
                    Turn on hands-free "Hey KOCH"
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_COMMANDS.map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => processFinalTranscript(cmd)}
                    disabled={isCapturing || isThinking}
                    className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    "{cmd}"
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
