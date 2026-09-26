import { startExperiment } from './src/server/functions/experiment';
import { runWithStartContext } from '@tanstack/start-storage-context';

async function test() {
  const dummyContext = {
    getRouter: () => ({}) as any,
    request: new Request('http://localhost:3000'),
    startOptions: {},
    contextAfterGlobalMiddlewares: {},
    executedRequestMiddlewares: new Set(),
    handlerType: 'serverFn' as const,
  };
  await runWithStartContext(dummyContext, async () => {
    try {
      const res = await (startExperiment as any).__executeServer({ method: 'POST', data: { name: 'test 3' } });
      console.log('__executeServer returned:', res);
    } catch (e) {
      console.error('Error:', e);
    }
  });
}
test();
