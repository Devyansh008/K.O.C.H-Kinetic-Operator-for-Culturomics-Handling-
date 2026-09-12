/**
 * src/routes/api/plate.ts
 *
 * API route: POST /api/plate
 *
 * Thin HTTP adapter exposing createPlateWithWells for the dashboard.
 * Uses TanStack Start's event-handler pattern for API routes.
 *
 * Body: { experimentId: string }
 * Returns: { id, label, wells: [{ id, coordinate }] }
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createPlateWithWells } from '../../server/db/repositories';

const WELL_COORDS_24 = [
  'A1','A2','A3','A4','A5','A6',
  'B1','B2','B3','B4','B5','B6',
  'C1','C2','C3','C4','C5','C6',
  'D1','D2','D3','D4','D5','D6',
];

const CreatePlateSchema = z.object({
  experimentId: z.string().min(1),
});

/**
 * createPlate server function — called via fetch('/api/plate') from the dashboard.
 * Wraps createPlateWithWells repository call as a proper TanStack Start server fn.
 */
export const createPlate = createServerFn({ method: 'POST' })
  .validator((data: unknown) => CreatePlateSchema.parse(data))
  .handler(async ({ data }) => {
    return createPlateWithWells(data.experimentId, 'Plate 1', WELL_COORDS_24);
  });
