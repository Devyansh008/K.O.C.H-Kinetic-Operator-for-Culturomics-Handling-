/**
 * test/integration/helper.ts
 *
 * Test harness helper for executing TanStack Start server functions
 * within the Vitest test runner.
 */

import { runWithStartContext } from '@tanstack/start-storage-context';

export async function callFn<TInput, TOutput>(
  serverFn: any,
  data: TInput,
): Promise<TOutput> {
  const dummyContext = {
    getRouter: () => ({}) as any,
    request: new Request('http://localhost:3000'),
    startOptions: {},
    contextAfterGlobalMiddlewares: {},
    executedRequestMiddlewares: new Set(),
    handlerType: 'serverFn' as const,
  };

  return await runWithStartContext(dummyContext, async () => {
    if (typeof serverFn?.__executeServer === 'function') {
      const res: any = await serverFn.__executeServer({
        method: serverFn.method || 'POST',
        data,
      });
      if (res?.error) {
        throw res.error;
      }
      return res?.result;
    }
    return await serverFn({ data });
  });
}
