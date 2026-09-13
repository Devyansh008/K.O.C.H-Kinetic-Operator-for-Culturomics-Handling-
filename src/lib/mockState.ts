/**
 * src/lib/mockState.ts
 *
 * In-memory app state for K.O.C.H. testing frontend.
 * React Context + useReducer — no external state library required.
 * All mutations are append-only (TelemetryEvent log never deletes).
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import type {
  Experiment,
  Plate,
  Well,
  TelemetryEvent,
  SttStatus,
  TtsQueueItem,
  WellState,
  TranscriptEntry,
} from '../types';
import { createTelemetryEvent, uid } from './telemetryLogger';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

function buildInitialWells(plateId: string): Well[] {
  const wells: Well[] = [];
  for (const row of ROWS) {
    for (const col of COLS) {
      const coord = `${row}${col}`;
      let state: WellState = 'uninoculated';
      let od600: number | undefined;
      // Pre-seed some interesting wells
      if (coord === 'C7') { state = 'colony_positive'; od600 = 0.145; }
      else if (['A1', 'B3', 'D5', 'F8', 'H12'].includes(coord)) { state = 'inoculated'; }
      wells.push({ id: uid('well'), plateId, coordinate: coord, state, od600 });
    }
  }
  return wells;
}

// ─── State shape ─────────────────────────────────────────────────────────────

export interface KochState {
  experiment: Experiment | null;
  plate: Plate | null;
  wells: Well[];
  events: TelemetryEvent[];
  selectedWell: string | null; // coordinate like "C7"
  sttStatus: SttStatus;
  transcripts: TranscriptEntry[];
  ttsQueue: TtsQueueItem[];
  ttsItl: number;       // ms
  ttsNextFrame: number; // ms
  pbrEnabled: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type KochAction =
  | { type: 'START_EXPERIMENT'; payload: { name: string } }
  | { type: 'END_EXPERIMENT'; payload: { status: 'COMPLETED' | 'ABORTED' } }
  | { type: 'APPEND_EVENT'; payload: TelemetryEvent }
  | { type: 'SELECT_WELL'; payload: string }
  | { type: 'SET_WELL_STATE'; payload: { coordinate: string; state: WellState } }
  | { type: 'SET_STT_STATUS'; payload: SttStatus }
  | { type: 'PUSH_TRANSCRIPT'; payload: TranscriptEntry }
  | { type: 'PUSH_TTS'; payload: TtsQueueItem }
  | { type: 'UPDATE_TTS_STATUS'; payload: { id: string; status: TtsQueueItem['status'] } }
  | { type: 'CLEAR_TTS_QUEUE' }
  | { type: 'SET_ITL'; payload: { itl: number; nextFrame: number } }
  | { type: 'TOGGLE_PBR' };

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_PLATE_ID = uid('plate');
const INITIAL_WELLS = buildInitialWells(INITIAL_PLATE_ID);

const INITIAL_STATE: KochState = {
  experiment: null,
  plate: null,
  wells: INITIAL_WELLS,
  events: [],
  selectedWell: null,
  sttStatus: 'MUTED',
  transcripts: [],
  ttsQueue: [],
  ttsItl: 7.16,
  ttsNextFrame: 9.62,
  pbrEnabled: false,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function kochReducer(state: KochState, action: KochAction): KochState {
  switch (action.type) {
    case 'START_EXPERIMENT': {
      const expId = uid('exp');
      const plateId = uid('plate');
      const wells = buildInitialWells(plateId);
      const exp: Experiment = {
        id: expId,
        name: action.payload.name,
        startedAt: new Date(),
        status: 'ACTIVE',
      };
      const plate: Plate = { id: plateId, experimentId: expId, label: 'Plate 4' };
      const initEvent = createTelemetryEvent(expId, 'STATE_CHANGE', {
        action: 'EXPERIMENT_STARTED',
        experimentName: action.payload.name,
      });
      return {
        ...state,
        experiment: exp,
        plate,
        wells,
        events: [initEvent],
        selectedWell: null,
        sttStatus: 'LISTENING',
      };
    }

    case 'END_EXPERIMENT': {
      if (!state.experiment) return state;
      const evt = createTelemetryEvent(state.experiment.id, 'STATE_CHANGE', {
        action: 'EXPERIMENT_ENDED',
        status: action.payload.status,
      });
      return {
        ...state,
        experiment: {
          ...state.experiment,
          status: action.payload.status,
          endedAt: new Date(),
        },
        events: [...state.events, evt],
        sttStatus: 'MUTED',
      };
    }

    case 'APPEND_EVENT':
      return { ...state, events: [...state.events, action.payload] };

    case 'SELECT_WELL': {
      if (!state.experiment) return state;
      const evt = createTelemetryEvent(state.experiment.id, 'STATE_CHANGE', {
        action: 'WELL_SELECTED',
        coordinate: action.payload,
      });
      return {
        ...state,
        selectedWell: action.payload,
        events: [...state.events, evt],
      };
    }

    case 'SET_WELL_STATE': {
      const updated = state.wells.map((w) =>
        w.coordinate === action.payload.coordinate
          ? { ...w, state: action.payload.state, od600: action.payload.state === 'colony_positive' ? 0.145 : w.od600 }
          : w,
      );
      if (!state.experiment) return { ...state, wells: updated };
      const evt = createTelemetryEvent(state.experiment.id, 'INTENT', {
        action: 'MARK_WELL',
        coordinate: action.payload.coordinate,
        newState: action.payload.state,
      });
      return { ...state, wells: updated, events: [...state.events, evt] };
    }

    case 'SET_STT_STATUS':
      return { ...state, sttStatus: action.payload };

    case 'PUSH_TRANSCRIPT':
      return {
        ...state,
        transcripts: [action.payload, ...state.transcripts].slice(0, 50),
      };

    case 'PUSH_TTS':
      return { ...state, ttsQueue: [...state.ttsQueue, action.payload] };

    case 'UPDATE_TTS_STATUS':
      return {
        ...state,
        ttsQueue: state.ttsQueue.map((item) =>
          item.id === action.payload.id
            ? { ...item, status: action.payload.status }
            : item,
        ),
      };

    case 'CLEAR_TTS_QUEUE':
      return {
        ...state,
        ttsQueue: state.ttsQueue.map((item) =>
          item.status === 'queued' || item.status === 'playing'
            ? { ...item, status: 'cancelled' }
            : item,
        ),
      };

    case 'SET_ITL':
      return { ...state, ttsItl: action.payload.itl, ttsNextFrame: action.payload.nextFrame };

    case 'TOGGLE_PBR':
      return { ...state, pbrEnabled: !state.pbrEnabled };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface KochContextValue {
  state: KochState;
  dispatch: React.Dispatch<KochAction>;
  // Convenience action creators
  startExperiment: (name: string) => void;
  endExperiment: (status: 'COMPLETED' | 'ABORTED') => void;
  selectWell: (coordinate: string) => void;
  markWell: (coordinate: string, state: WellState) => void;
  emitVoiceUtterance: (transcript: string) => void;
  emitFrameMark: (wellId?: string) => void;
}

const KochContext = createContext<KochContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function KochProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(kochReducer, INITIAL_STATE);

  const startExperiment = useCallback(
    (name: string) => dispatch({ type: 'START_EXPERIMENT', payload: { name } }),
    [],
  );

  const endExperiment = useCallback(
    (status: 'COMPLETED' | 'ABORTED') =>
      dispatch({ type: 'END_EXPERIMENT', payload: { status } }),
    [],
  );

  const selectWell = useCallback(
    (coordinate: string) => dispatch({ type: 'SELECT_WELL', payload: coordinate }),
    [],
  );

  const markWell = useCallback(
    (coordinate: string, wellState: WellState) =>
      dispatch({ type: 'SET_WELL_STATE', payload: { coordinate, state: wellState } }),
    [],
  );

  const emitVoiceUtterance = useCallback(
    (transcript: string) => {
      if (!state.experiment) return;
      const entry: TranscriptEntry = {
        id: uid('tr'),
        text: transcript,
        confidence: 0.9 + Math.random() * 0.1,
        timestamp: new Date(),
      };
      dispatch({ type: 'PUSH_TRANSCRIPT', payload: entry });

      // Also emit a telemetry event
      const evt = createTelemetryEvent(state.experiment.id, 'VOICE_UTTERANCE', {
        transcript,
        source: 'mock-stt',
      });
      dispatch({ type: 'APPEND_EVENT', payload: evt });

      // Emit a TTS response
      const ttsItem: TtsQueueItem = {
        id: uid('tts'),
        text: `Acknowledged: "${transcript}"`,
        status: 'queued',
        durationMs: 1200 + Math.random() * 800,
      };
      dispatch({ type: 'PUSH_TTS', payload: ttsItem });
    },
    [state.experiment],
  );

  const emitFrameMark = useCallback(
    (wellId?: string) => {
      if (!state.experiment) return;
      const evt = createTelemetryEvent(
        state.experiment.id,
        'FRAME_MARK',
        { frameRef: `frame_${Date.now()}.jpg`, wellTarget: wellId ?? 'none' },
        wellId,
      );
      dispatch({ type: 'APPEND_EVENT', payload: evt });
    },
    [state.experiment],
  );

  const value = useMemo(
    () => ({
      state,
      dispatch,
      startExperiment,
      endExperiment,
      selectWell,
      markWell,
      emitVoiceUtterance,
      emitFrameMark,
    }),
    [state, dispatch, startExperiment, endExperiment, selectWell, markWell, emitVoiceUtterance, emitFrameMark],
  );

  return React.createElement(KochContext.Provider, { value }, children);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKoch(): KochContextValue {
  const ctx = useContext(KochContext);
  if (!ctx) throw new Error('useKoch must be used within <KochProvider>');
  return ctx;
}
