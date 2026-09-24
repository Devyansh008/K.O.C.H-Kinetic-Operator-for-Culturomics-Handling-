/**
 * src/entry-server.tsx
 *
 * Server-side rendering entry point for TanStack Start.
 */

import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';

export default createStartHandler(defaultStreamHandler);
