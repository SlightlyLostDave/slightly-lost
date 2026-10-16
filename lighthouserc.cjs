// Lighthouse CI: the performance budget from CLAUDE.md, enforced on every
// pull request against the Cloudflare preview deployment for that PR (see
// .github/workflows/ci.yml). Measuring the real preview rather than a local
// server means transfer sizes reflect Cloudflare's compression and headers,
// which is what readers get.
//
// Every assertion is an error, never a warning. When one fails, fix the
// regression; do not raise the number here. These values mirror the budget
// table in CLAUDE.md, and changing one means changing that table first, in
// its own PR, with a reason. See "When the performance gate fails" in
// README.md.
//
// Run locally against any deployed or served copy of the site:
//   LHCI_BASE_URL=https://pr-12-slightly-lost.example.workers.dev npm run lhci

const baseUrl = (process.env.LHCI_BASE_URL ?? '').replace(/\/$/, '')
if (!baseUrl) {
  throw new Error('lighthouserc.cjs: set LHCI_BASE_URL to the site origin to audit')
}

// The same seeded article the Playwright suite uses (tests/e2e/article.spec.ts).
const ARTICLE_PATH = '/field-notes/underwater/sonar-return-bridge'
// The atlas index, which carries the map island, and a seeded fuzzed entry,
// which carries the safety notices and the location plate.
const ATLAS_PATHS = ['/atlas', '/atlas/centre-hill-headframe']

const KB = 1024

// Median of the runs, so one noisy run on a shared CI machine neither fails
// nor passes the gate on its own.
const budget = (maxNumericValue) => ['error', { maxNumericValue, aggregationMethod: 'median' }]

module.exports = {
  ci: {
    collect: {
      url: [
        `${baseUrl}/`,
        `${baseUrl}${ARTICLE_PATH}`,
        // The 404 page itself. An unknown path returns a 404 status, which
        // Lighthouse refuses to audit (ERRORED_DOCUMENT_REQUEST); /404 serves
        // the same page with a 200.
        `${baseUrl}/404`,
        ...ATLAS_PATHS.map((path) => `${baseUrl}${path}`),
      ],
      numberOfRuns: 3,
      // Lighthouse's default: mobile emulation with simulated throttling,
      // which is the "mobile, throttled" the LCP budget is defined against.
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '.*',
          assertions: {
            'largest-contentful-paint': budget(2000),
            'cumulative-layout-shift': budget(0.02),
            // INP needs real interactions, so a lab navigation cannot
            // measure it. Total blocking time is its lab proxy: main-thread
            // work long enough to block input is what makes INP slow.
            'total-blocking-time': budget(150),
            'resource-summary:font:size': budget(360 * KB),
            // Not a budget number: every audited page holds a perfect
            // accessibility score, which the Phase 3 audit reached.
            'categories:accessibility': ['error', { minScore: 1, aggregationMethod: 'median' }],
          },
        },
        {
          // The homepage, GSAP and ScrollTrigger included, as transferred.
          matchingUrlPattern: '^https?://[^/]+/$',
          assertions: {
            'resource-summary:script:size': budget(45 * KB),
          },
        },
        {
          matchingUrlPattern: ARTICLE_PATH.replace(/\//g, '\\/') + '$',
          assertions: {
            'total-byte-weight': budget(900 * KB),
          },
        },
      ],
    },
    upload: {
      // Reports stay as a CI artifact rather than going to Lighthouse's
      // public temporary storage.
      target: 'filesystem',
      outputDir: '.lighthouseci/reports',
    },
  },
}
