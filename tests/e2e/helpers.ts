import type { Page } from '@playwright/test'

// Sums the actual bytes transferred over the wire (post-compression, the way
// browser devtools and Lighthouse report it) for every JS resource loaded
// while navigating to `path`. response.body() would give decoded/uncompressed
// size instead, which is not what the JS budgets in CLAUDE.md are measuring,
// so this goes through CDP's Network domain for encodedDataLength.
export async function measureJsBytes(page: Page, path: string): Promise<number> {
  const client = await page.context().newCDPSession(page)
  await client.send('Network.enable')

  const mimeTypeByRequestId = new Map<string, string>()
  let totalBytes = 0

  client.on('Network.responseReceived', (event) => {
    mimeTypeByRequestId.set(event.requestId, event.response.mimeType ?? '')
  })

  client.on('Network.loadingFinished', (event) => {
    const mimeType = mimeTypeByRequestId.get(event.requestId) ?? ''
    if (mimeType.includes('javascript')) totalBytes += event.encodedDataLength
  })

  await page.goto(path, { waitUntil: 'networkidle' })

  return totalBytes
}
