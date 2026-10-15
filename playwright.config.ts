import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4400',
    trace: 'on-first-retry',
  },
  // No webServer block: astro preview (like astro dev --background) manages
  // itself as a detached singleton and returns immediately once it's up, so
  // Playwright's spawn-and-wait-for-port model would read that as the
  // process "exiting early." The npm pretest:e2e/posttest:e2e hooks on
  // test:e2e (see package.json) build, start, and stop that preview daemon
  // around the test run instead. A fixed, uncommon port: 4321/4322 are
  // routinely already bound (this project's own `astro dev --background`
  // server commonly lives on 4322).
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/*.reduced-motion.spec.ts', '**/*.no-js.spec.ts'],
    },
    {
      name: 'chromium-reduced-motion',
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
      testMatch: ['**/*.reduced-motion.spec.ts'],
    },
    {
      name: 'chromium-no-js',
      use: { ...devices['Desktop Chrome'], javaScriptEnabled: false },
      testMatch: ['**/*.no-js.spec.ts'],
    },
  ],
})
