import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT || 4173);

// Browser tests of every package, against _site/ as scripts/serve.mjs serves it: each package's
// page and fixtures are under /<name>/.
export default defineConfig({
  testDir: 'packages',
  testMatch: '*/test/e2e/**/*.spec.ts',
  timeout: 45_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  // Screenshots differ between operating systems; baselines are kept per platform, next to the
  // package's tests.
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{platform}/{arg}{ext}',
  expect: { toHaveScreenshot: { threshold: 0.05, maxDiffPixelRatio: 0.002, animations: 'disabled' } },
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: `node scripts/serve.mjs ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 900 } } },
  ],
});
