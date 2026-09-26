/**
 * src/routes/__root.tsx
 *
 * Root layout: wraps every page with the full K.O.C.H. shell.
 * Provides KochProvider (in-memory state), Header, and Sidebar.
 */

import { useState, useEffect } from 'react';
import { Outlet, createRootRoute, Scripts, HeadContent, useRouterState } from '@tanstack/react-router';
import { KochProvider } from '../lib/mockState';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { GlobalVoiceAssistant } from '../components/voice/GlobalVoiceAssistant';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const router = useRouterState();
  const isExperimentRoute = router.location.pathname.startsWith('/experiment');
  const isIntroRoute = router.location.pathname === '/';
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Mark hydrated on client mount
    setHydrated(true);
  }, []);

  return (
    <html lang="en" className="dark" style={{ backgroundColor: '#0c0a09' }}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>K.O.C.H. — Kinetic Operator for Culturomics &amp; Handling</title>
        <style dangerouslySetInnerHTML={{ __html: `html, body, #root, :root { background-color: #0c0a09 !important; color: #fef3c7; margin: 0; padding: 0; overflow: hidden; }` }} />
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/koch_app_favicon_transparent.png" />
        <link rel="shortcut icon" href="/koch_app_favicon_transparent.png" />
        <link rel="apple-touch-icon" href="/koch_app_favicon_transparent.png" />
        {/* Pre-compiled Tailwind CSS — served as a static asset from /public */}
        <link rel="stylesheet" href="/styles.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <HeadContent />
      </head>
      <body className="bg-stone-950 text-amber-100 min-h-screen overflow-hidden" style={{ backgroundColor: '#0c0a09' }}>
        {/* Black curtain overlay to prevent FOUC / media buffering flash */}
        <div
          className={`fixed inset-0 bg-stone-950 z-50 transition-opacity duration-700 pointer-events-none ${
            hydrated ? 'opacity-0' : 'opacity-100'
          }`}
          aria-hidden="true"
        />

        <div className="w-full h-screen bg-stone-950 overflow-hidden relative">
          <KochProvider>
            {isExperimentRoute || isIntroRoute ? (
              <div className="w-full h-screen overflow-hidden">
                <Outlet />
              </div>
            ) : (
              <div className="flex flex-col h-screen overflow-hidden bg-stone-950">
                {/* Top header bar */}
                <Header />

                {/* Body: sidebar + main content */}
                <div className="flex flex-1 overflow-hidden">
                  <Sidebar />
                  <main className="flex-1 overflow-auto bg-stone-950 p-4">
                    <Outlet />
                  </main>
                </div>

                {/* Persistent Site-Wide Voice Assistant */}
                <GlobalVoiceAssistant />
              </div>
            )}
          </KochProvider>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
