import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { SteampunkFrame } from '../components/layout/SteampunkFrame';
import { VerticalLensSidebar } from '../components/layout/VerticalLensSidebar';
import { CrtOverlay } from '../components/ui/CrtOverlay';
import { GlobalVoiceAssistant } from '../components/voice/GlobalVoiceAssistant';
import { VoiceOrbVisualizer } from '../components/voice/VoiceOrbVisualizer';
import { WebcamFeed } from '../components/camera/WebcamFeed';
import { SystemEventLogs } from '../components/telemetry/SystemEventLogs';

// JARVIS 6-Box HUD Suite
import { SttTranscriptBox } from '../components/hud/SttTranscriptBox';
import { IntentParserBox } from '../components/hud/IntentParserBox';
import { MacroSimulatorBox } from '../components/hud/MacroSimulatorBox';
import { SpecimenMonitorBox } from '../components/hud/SpecimenMonitorBox';
import { AtmosphereTelemetryBox } from '../components/hud/AtmosphereTelemetryBox';
import { GrowthKineticsBox } from '../components/hud/GrowthKineticsBox';

const experimentSearchSchema = z.object({
  lens: z.enum(['sts', 'webcam', 'logs']).default('sts'),
  experimentId: z.string().optional(),
});

export const Route = createFileRoute('/experiment')({
  validateSearch: (search) => experimentSearchSchema.parse(search),
  component: ExperimentLensPage,
});

function ExperimentLensPage() {
  const { lens } = Route.useSearch();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-stone-950 font-mono select-none">
      {/* CRT Retro Screen Scanlines & Radial Vignette */}
      <CrtOverlay />

      {/* Strictly Preserved Vertical Lens Sidebar (Far Left Edge) */}
      <VerticalLensSidebar activeLens={lens} />

      {/* Main Optical Microscope Viewport & Atmospheric Lens Video */}
      <SteampunkFrame>
        <div className="w-full h-full max-w-[1920px] mx-auto flex flex-col justify-between py-1 gap-2.5 relative z-10">
          {/* Top Global Telemetry Status Bar */}
          <header className="flex items-center justify-between px-5 py-2 rounded-xl bg-stone-950/80 backdrop-blur-md border border-amber-500/30 shadow-xl shrink-0 font-mono">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
              <span className="text-xs font-bold tracking-widest text-amber-300 uppercase drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                PROJECT K.O.C.H. // JARVIS CULTUROMICS HUD
              </span>
              <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300/80 border border-amber-500/30 font-semibold uppercase">
                STRICT ANAEROBIC HOOD · ISO-5
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-stone-400">
                ACTIVE LENS: <strong className="text-amber-400 uppercase font-bold">{lens}</strong>
              </span>
              <span className="text-stone-600 hidden sm:inline">|</span>
              <span className="text-stone-300 hidden sm:inline">40× Plan-Apochromat</span>
              <span className="text-stone-600 hidden sm:inline">|</span>
              <span className="text-amber-400 font-semibold">λ: 600nm</span>
            </div>
          </header>

          {/* JARVIS Multi-Box Grid Surrounding Central Optical Eyepiece */}
          <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
            {/* Left Column (Boxes 1, 2, 3) */}
            <div className="lg:col-span-3 xl:col-span-3 flex flex-col gap-2.5 h-full overflow-hidden">
              {/* Box 1: Live AssemblyAI stream + Decibel meter */}
              <SttTranscriptBox className="flex-1 min-h-[140px]" />

              {/* Box 2: Parsed JSON intent + Confidence gauge */}
              <IntentParserBox className="flex-1 min-h-[140px]" />

              {/* Box 3: Development utterance test triggers */}
              <MacroSimulatorBox className="flex-1 min-h-[140px]" />
            </div>

            {/* Center Column: Central Optical Eyepiece Viewport */}
            <div className="lg:col-span-6 xl:col-span-6 flex flex-col items-center justify-center relative rounded-2xl border border-amber-500/30 bg-stone-950/40 backdrop-blur-sm p-4 shadow-[inset_0_0_40px_rgba(245,158,11,0.08)] overflow-hidden h-full">
              {/* Central Viewport Reticle Rings & Crosshairs */}
              <div className="w-full h-full flex items-center justify-center relative">
                {lens === 'sts' && <VoiceOrbVisualizer />}
                {lens === 'webcam' && <WebcamFeed />}
                {lens === 'logs' && <SystemEventLogs />}
              </div>
            </div>

            {/* Right Column (Boxes 4, 5, 6) */}
            <div className="lg:col-span-3 xl:col-span-3 flex flex-col gap-2.5 h-full overflow-hidden">
              {/* Box 4: Floating 3D/SVG microbe model */}
              <SpecimenMonitorBox className="flex-1 min-h-[140px]" />

              {/* Box 5: Anaerobic gas mix grid */}
              <AtmosphereTelemetryBox className="flex-1 min-h-[140px]" />

              {/* Box 6: OD600 readout & growth velocity */}
              <GrowthKineticsBox className="flex-1 min-h-[140px]" />
            </div>
          </div>
        </div>

        {/* Floating Global Voice Assistant Bubble */}
        <GlobalVoiceAssistant />
      </SteampunkFrame>
    </div>
  );
}
