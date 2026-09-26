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
      color: 'text-stone-400',
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none font-mono">
      <div className="pointer-events-auto bg-stone-950/95 backdrop-blur-xl border border-amber-500/40 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
        
        {/* Top Control Ribbon */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/20 bg-black/40">
          
          {/* Left: Status Badge & Wake word info */}
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-medium ${statusConfig.bg} ${statusConfig.color}`}>
              <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
              <span>{statusConfig.label}</span>
            </div>

            {state.isHandsFree && (
              <span className="hidden sm:inline-block text-[11px] font-mono text-stone-400">
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
                    {state.assistantReply.actionResult && (
                      <span className="text-stone-400 italic">
                        {state.assistantReply.actionResult.message}
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
        )}

      </div>
    </div>
  );
};
