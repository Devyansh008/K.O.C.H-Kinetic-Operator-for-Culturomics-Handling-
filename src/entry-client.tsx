/**
 * src/entry-client.tsx
 *
 * Client-side hydration entry point for TanStack Start.
 * CSS must be imported here so Vite can inject the compiled
 * stylesheet link into the SSR'd HTML document.
 */

import './styles.css';
import { StartClient } from '@tanstack/react-start/client';
import { hydrateRoot } from 'react-dom/client';

hydrateRoot(document, <StartClient />);
