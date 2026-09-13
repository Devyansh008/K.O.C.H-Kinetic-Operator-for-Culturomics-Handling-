/**
 * src/routes/voice.tsx
 *
 * Dedicated STT / TTS Pipeline Testing View.
 * Full-width VoiceSimulator + recent voice events feed.
 */

import { createFileRoute } from '@tanstack/react-router';
import { VoiceSimulator } from '../components/lab/VoiceSimulator';
import { useKoch } from '../lib/mockState';
import { MessageSquare } from 'lucide-react';

export const Route = createFileRoute('/voice')({
  component: VoiceView,
});

function VoiceView() {
  const { state } = useKoch();
  const voiceEvents = state.events
    .filter((e) => e.type === 'VOICE_UTTERANCE' || e.type === 'INTENT')
    .slice()
    .reverse()
    .slice(0, 20);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Voice simulator panels */}
      <VoiceSimulator />

      {/* Recent voice events */}
      <div className="card">
        <div className="card-header">
          <MessageSquare className="w-4 h-4" />
          Recent Voice Events
          <span className="ml-1 text-lab-subtext font-normal">({voiceEvents.length})</span>
        </div>
        <div className="space-y-1.5">
          {voiceEvents.length === 0 ? (
            <p className="text-[10px] font-mono text-lab-muted/50 italic py-2">
              No voice events yet. Start an experiment and use the quick-trigger phrases above.
            </p>
          ) : (
            voiceEvents.map((evt) => (
              <div key={evt.id} className="log-entry log-entry-utterance">
                <div className="flex items-center gap-2 text-[9px]">
                  <span className="text-lab-subtext">{evt.createdAt.toISOString()}</span>
                  <span
                    className={`font-mono uppercase font-semibold ${
                      evt.type === 'VOICE_UTTERANCE' ? 'text-lab-warn' : 'text-lab-accent2'
                    }`}
                  >
                    {evt.type}
                  </span>
                </div>
                <div className="text-[10px] text-lab-text font-mono mt-0.5 truncate">
                  {JSON.stringify(evt.rawPayload)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
