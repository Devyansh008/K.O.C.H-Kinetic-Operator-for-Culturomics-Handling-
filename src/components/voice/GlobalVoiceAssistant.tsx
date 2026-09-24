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

  const [isExpanded, setIsExpanded] = useState(true);

  const isCapturing = state.status === 'HEARD_WAKEWORD' || state.status === 'LISTENING_SPEECH';
  const isThinking = state.status === 'GENERATING_REPLY';
  const isSpeaking = state.status === 'SPEAKING';
  const isListeningWake = state.status === 'LISTENING_WAKEWORD';

  // Status configuration
  const statusConfig = {
    IDLE: {
      label: 'Voice Standby',
      color: 'text-lab-muted',
      bg: 'bg-zinc-800/60 border-zinc-700',
      dot: 'bg-zinc-500',
    },
    LISTENING_WAKEWORD: {
      label: "Say 'Hey KOCH'",
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-500/40',
      dot: 'bg-emerald-400 animate-pulse',
    },
    HEARD_WAKEWORD: {
      label: 'Wake Word Detected',
      color: 'text-cyan-300',
      bg: 'bg-cyan-950/60 border-cyan-400',
      dot: 'bg-cyan-300 animate-ping',
    },
    LISTENING_SPEECH: {
      label: `Streaming to ${state.sttEngine}`,
      color: 'text-teal-300',
      bg: 'bg-teal-950/60 border-teal-400/60 shadow-[0_0_15px_rgba(20,184,166,0.25)]',
      dot: 'bg-teal-400 animate-pulse',
    },
    GENERATING_REPLY: {
      label: 'K.O.C.H. AI Thinking…',
      color: 'text-indigo-300',
      bg: 'bg-indigo-950/60 border-indigo-400/60',
      dot: 'bg-indigo-400 animate-spin',
    },
    SPEAKING: {
      label: 'Speaking Response',
      color: 'text-amber-300',
      bg: 'bg-amber-950/60 border-amber-400/60',
      dot: 'bg-amber-400 animate-bounce',
    },
    ERROR: {
      label: 'Voice Error',
      color: 'text-rose-400',
      bg: 'bg-rose-950/60 border-rose-500/50',
      dot: 'bg-rose-400',
    },
  }[state.status];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none">
      <div className="pointer-events-auto bg-lab-surface/95 backdrop-blur-xl border border-lab-border/80 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
        
        {/* Top Control Ribbon */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-lab-border/50 bg-black/20">
          
          {/* Left: Status Badge & Wake word info */}
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-medium ${statusConfig.bg} ${statusConfig.color}`}>
              <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
              <span>{statusConfig.label}</span>
            </div>

            {state.isHandsFree && (
              <span className="hidden sm:inline-block text-[11px] font-mono text-lab-muted">
                Hands-free mic active
              </span>
            )}
          </div>

          {/* Right: Actions (Hands-Free Toggle, TTS, Minimize, Dismiss) */}
          <div className="flex items-center gap-1.5">
            {/* Hands-Free Toggle */}
            <button
              onClick={toggleHandsFree}
              title={state.isHandsFree ? 'Mute hands-free wake word' : 'Enable hands-free wake word'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                state.isHandsFree
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {state.isHandsFree ? 'Wake: ON' : 'Wake: OFF'}
              </span>
            </button>

            {/* TTS Audio Mute Toggle */}
            <button
              onClick={toggleTtsMute}
              title={state.ttsMuted ? 'Unmute voice replies' : 'Mute voice replies'}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                state.ttsMuted
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {state.ttsMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Minimize / Expand */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              title={isExpanded ? 'Collapse HUD' : 'Expand HUD'}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {/* Dismiss */}
            {(state.assistantReply || state.currentTranscript) && (
              <button
                onClick={dismissAssistant}
                className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                title="Dismiss reply"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Expandable Body */}
        {isExpanded && (
          <div className="p-4 space-y-3">
            
            {/* Real-time Audio Waveform & Push-To-Talk Button */}
            <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-lab-border/60">
              {/* Push-to-Talk / Tap to Speak Button */}
              <button
                onClick={triggerManualTalk}
                className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 flex-shrink-0 ${
                  isCapturing
                    ? 'bg-rose-500 text-white ring-4 ring-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse'
                    : 'bg-teal-600/20 text-teal-400 border border-teal-500/40 hover:bg-teal-500/30 hover:scale-105'
                }`}
                title={isCapturing ? 'Click to finish speaking' : 'Click to speak manually'}
              >
                {isCapturing ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Animated Waveform Visualizer */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between text-[10px] font-mono text-lab-subtext mb-1">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-lab-accent" />
                    {isCapturing ? 'LIVE SPEECH INPUT' : isListeningWake ? 'AWAITING "HEY KOCH"' : 'STANDBY'}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-lab-muted">
                    {state.sttEngine}
                  </span>
                </div>

                {/* Bars */}
                <div className="flex items-end gap-1 h-7 bg-zinc-950/60 px-2 py-1 rounded-md border border-zinc-800">
                  {state.audioLevels.map((lvl, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 rounded-sm transition-all duration-75 ${
                        isCapturing
                          ? 'bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)]'
                          : isThinking
                          ? 'bg-indigo-400 animate-pulse'
                          : isSpeaking
                          ? 'bg-amber-400'
                          : 'bg-zinc-700/50'
                      }`}
                      style={{
                        height: `${Math.max(3, Math.min(24, lvl))}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {state.errorMessage && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs font-mono">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{state.errorMessage}</span>
              </div>
            )}

            {/* Live Speech Transcription Bubble */}
            {(isCapturing || state.currentTranscript) && (
              <div className="p-3 bg-zinc-900/90 rounded-xl border border-teal-500/30 animate-fadeIn">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-teal-400 uppercase tracking-wider mb-1">
                  <Terminal className="w-3 h-3" />
                  Operator Speech (Live):
                </div>
                <p className="text-sm font-sans text-zinc-100 italic">
                  "{state.currentTranscript || 'Listening…'}"
                </p>
              </div>
            )}

            {/* Assistant AI Reply Bubble */}
            {state.assistantReply && (
              <div className="p-3.5 bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/40 rounded-xl border border-indigo-500/30 shadow-lg animate-fadeIn">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-indigo-400 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    K.O.C.H. Assistant Reply
                  </div>
                  <div className="flex items-center gap-2">
                    {state.assistantReply.actionExecuted && (
                      <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Action Executed
                      </span>
                    )}
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {state.assistantReply.source === 'gemini' ? 'Gemini 2.5 Flash' : 'K.O.C.H. Engine'}
                    </span>
                  </div>
                </div>

                <p className="text-sm font-medium text-zinc-100 leading-relaxed">
                  {state.assistantReply.replyText}
                </p>

                {state.assistantReply.intent.action !== 'UNKNOWN' && (
                  <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                    <span className="text-zinc-500">Intent:</span>
                    <span className="text-indigo-300 font-semibold">{state.assistantReply.intent.action}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick-Trigger Laboratory Voice Commands */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-lab-muted mb-1.5">
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
                    className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors disabled:opacity-40"
                  >
                    "{cmd}"
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
