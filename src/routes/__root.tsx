/**
 * src/routes/__root.tsx
 *
 * Root layout: wraps every page with the full K.O.C.H. shell.
 * Provides KochProvider (in-memory state), Header, and Sidebar.
 */

import { Outlet, createRootRoute, Scripts, ScrollRestoration, HeadContent } from '@tanstack/react-router';
import { KochProvider } from '../lib/mockState';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>K.O.C.H. — Kinetic Operator for Culturomics &amp; Handling</title>
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
          </div>
        </KochProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
