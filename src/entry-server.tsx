/**
 * src/entry-server.tsx
 *
 * Server-side rendering entry point for TanStack Start.
 */

import './styles.css';
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';

export default createStartHandler(defaultStreamHandler);
