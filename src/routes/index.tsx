import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { startExperiment, endExperiment, getActiveState } from '../server/functions/experiment';
import { ingestVoiceIntent, ingestFrameMark } from '../server/functions/telemetry';
import { requestColonyDetection, getRecipeRecommendation } from '../server/functions/perception';
import { generateElnReport, exportStandardized } from '../server/functions/eln';
import { createPlate } from './api/-plate';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)('/')({
  component: SimpleTestDashboard,
});

function SimpleTestDashboard() {
  const [output, setOutput] = useState<string>('Ready.');
  const [expId, setExpId] = useState<string>('');
  const [plateId, setPlateId] = useState<string>('');
  const [wellId, setWellId] = useState<string>('');

  const log = (msg: string, data?: any) => {
    setOutput(prev => prev + '\n' + msg + (data ? '\n' + JSON.stringify(data, null, 2) : ''));
  };

  const btnStyle = { padding: '8px 12px', margin: '4px', cursor: 'pointer' };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <strong>Current State:</strong><br />
        Experiment ID: {expId || 'None'}<br />
        Plate ID: {plateId || 'None'}<br />
        Well ID: {wellId || 'None'}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <button style={btnStyle} onClick={async () => {
          try {
            const exp = await startExperiment({ data: { name: 'Test Exp' } });
            setExpId(exp.id);
            log('Started Experiment:', exp);
          } catch (e) { log('Error:', e); }
        }}>1. Start Experiment</button>

        <button style={btnStyle} onClick={async () => {
          if (!expId) return log('Need Experiment ID');
          try {
            const state = await getActiveState({ data: { experimentId: expId } });
            log('Active State:', state);
          } catch (e) { log('Error:', e); }
        }}>2. Get Active State</button>

        <button style={btnStyle} onClick={async () => {
          if (!expId) return log('Need Experiment ID');
          try {
            const plate = await createPlate({ data: { experimentId: expId } }) as any;
            setPlateId(plate.id);
            setWellId(plate.wells?.[0]?.id || '');
            log('Created Plate:', plate);
          } catch (e) { log('Error:', e); }
        }}>3. Create Plate & Wells</button>

        <button style={btnStyle} onClick={async () => {
          if (!expId || !plateId) return log('Need Exp ID and Plate ID');
          try {
            const res = await ingestVoiceIntent({ data: {
              experimentId: expId, transcript: 'test voice',
              intent: { action: 'MARK_WELL', plateLabel: 'Plate 1', plateId: plateId, wellCoordinate: 'A1', wellId: wellId }
            }});
            log('Ingested Voice:', res);
          } catch (e) { log('Error:', e); }
        }}>4. Voice Intent</button>

        <button style={btnStyle} onClick={async () => {
          if (!expId || !wellId) return log('Need Exp ID and Well ID');
          try {
            const res = await ingestFrameMark({ data: { experimentId: expId, wellId, frameTimestamp: new Date().toISOString() } });
            log('Ingested Frame:', res);
          } catch (e) { log('Error:', e); }
        }}>5. Frame Mark</button>

        <button style={btnStyle} onClick={async () => {
          if (!wellId) return log('Need Well ID');
          try {
            const res = await requestColonyDetection({ data: { wellId, frameRef: 'test_frame.png' } });
            log('Colony Detection:', res);
          } catch (e) { log('Error:', e); }
        }}>6. Detect Colonies</button>

        <button style={btnStyle} onClick={async () => {
          if (!wellId) return log('Need Well ID');
          try {
            const res = await getRecipeRecommendation({ data: { wellId } });
            log('Pathway Rec:', res);
          } catch (e) { log('Error:', e); }
        }}>7. Pathway Recommendation</button>

        <button style={btnStyle} onClick={async () => {
          if (!expId) return log('Need Exp ID');
          try {
            const res = await generateElnReport({ data: { experimentId: expId, format: 'MARKDOWN' } });
            log('ELN Report:', res);
          } catch (e) { log('Error:', e); }
        }}>8. Generate ELN</button>

        <button style={btnStyle} onClick={async () => {
          if (!expId) return log('Need Exp ID');
          try {
            const res = await endExperiment({ data: { experimentId: expId, status: 'COMPLETED' } });
            log('Ended Experiment:', res);
          } catch (e) { log('Error:', e); }
        }}>9. End Experiment</button>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '10px', background: '#f5f5f5' }}>
        <strong>Output Logs:</strong>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{output}</pre>
      </div>
    </div>
  );
}
