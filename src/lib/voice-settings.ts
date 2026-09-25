/**
 * src/lib/voice-settings.ts
 *
 * Persisted user preferences for the K.O.C.H. voice assistant.
 * Stored in localStorage via zustand persist middleware so the
 * "Hey KOCH" hands-free wake preference survives page reloads.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface VoiceSettingsState {
  /** Automatically enable hands-free "Hey KOCH" wake-word listening on page load. */
  autoWakeEnabled: boolean;
  setAutoWakeEnabled: (enabled: boolean) => void;
  toggleAutoWakeEnabled: () => void;
}

export const useVoiceSettings = create<VoiceSettingsState>()(
  persist(
    (set) => ({
      autoWakeEnabled: true, // wake is ON by default
      setAutoWakeEnabled: (autoWakeEnabled) => set({ autoWakeEnabled }),
      toggleAutoWakeEnabled: () => set((s) => ({ autoWakeEnabled: !s.autoWakeEnabled })),
    }),
    {
      name: 'koch-voice-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ autoWakeEnabled: s.autoWakeEnabled }),
    },
  ),
);
