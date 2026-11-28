import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveConfig } from 'vite';

test('SSR test servers cannot replace the running app dependency cache', async () => {
  const app = await resolveConfig({}, 'serve');
  const fixture = await resolveConfig({ server: { middlewareMode: true } }, 'serve');
  assert.notEqual(fixture.cacheDir, app.cacheDir);
  assert.ok(fixture.cacheDir.replaceAll('\\', '/').endsWith(`.vite-tests/${process.pid}`));
  assert.equal(fixture.optimizeDeps.noDiscovery, true);
  assert.deepEqual(fixture.optimizeDeps.include, []);
  assert.ok(app.optimizeDeps.include.includes('recharts'));
});

test('SSR fixtures retain their explicitly isolated cache directories', async () => {
  const fixture = await resolveConfig({ cacheDir: 'node_modules/.vite-explicit-fixture', server: { middlewareMode: true } }, 'serve');
  assert.ok(fixture.cacheDir.replaceAll('\\', '/').endsWith('.vite-explicit-fixture'));
});
