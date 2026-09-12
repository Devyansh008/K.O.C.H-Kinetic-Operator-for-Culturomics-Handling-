import {
  Outlet,
  createRootRoute,
  Scripts,
} from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <html>
      <head>
        <title>K.O.C.H. Backend Test</title>
      </head>
      <body style={{ padding: '20px', fontFamily: 'monospace' }}>
        <h1>K.O.C.H. Backend Test Dashboard</h1>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
