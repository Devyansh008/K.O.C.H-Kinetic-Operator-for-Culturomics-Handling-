/**
 * src/routes/__root.tsx
 *
 * Root layout: wraps every page with the full K.O.C.H. shell.
 * Provides KochProvider (in-memory state), Header, and Sidebar.
 */

import { Outlet, createRootRoute, Scripts, HeadContent } from '@tanstack/react-router';
import { KochProvider } from '../lib/mockState';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { GlobalVoiceAssistant } from '../components/voice/GlobalVoiceAssistant';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { title: 'K.O.C.H. — Kinetic Operator for Culturomics & Handling' },
    ],
    links: [
      { rel: 'stylesheet', href: '/styles.css' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
      },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-lab-bg text-lab-text min-h-screen overflow-hidden">
        <KochProvider>
          <div className="flex flex-col h-screen">
            {/* Top header bar */}
            <Header />

            {/* Body: sidebar + main content */}
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-auto bg-lab-bg p-4">
                <Outlet />
              </main>
            </div>

            {/* Persistent Site-Wide Voice Assistant */}
            <GlobalVoiceAssistant />
          </div>
        </KochProvider>
        <Scripts />
      </body>
    </html>
  );
}
