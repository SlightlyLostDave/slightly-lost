import { test as base, expect } from '@playwright/test'

// Every route on this site is expected to run with zero console errors and
// zero uncaught page errors. Rather than repeat pageerror/console listeners
// in every spec, this fixture wires them up once and fails the test if
// anything was logged during it.
export const test = base.extend<{ failOnConsoleErrors: void }>({
  failOnConsoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []

      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
      })

      await use()

      expect(errors, `Unexpected console/page errors:\n${errors.join('\n')}`).toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
