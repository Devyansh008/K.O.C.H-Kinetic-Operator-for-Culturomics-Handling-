/**
 * src/entry-client.tsx
 *
 * Client-side hydration entry point for TanStack Start.
 */

import { StartClient } from '@tanstack/react-start/client';
import { hydrateRoot } from 'react-dom/client';

hydrateRoot(document, <StartClient />);
