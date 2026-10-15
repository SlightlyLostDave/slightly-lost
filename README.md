# Slightly Lost

The site is an Astro front end, styled with Tailwind against a custom palette, animated with GSAP, and deployed to Cloudflare Workers. This README covers running it locally, deploying it, and the performance gate every pull request has to pass.

Live at `slightly-lost.<subdomain>.workers.dev` until the slightlylost.com zone moves to Cloudflare (see [Custom domain](#custom-domain)).

## Running it

```sh
npm install
npm run dev
npm run build
```

## Running the CMS

Strapi lives in `cms/` as a separate project with its own dependencies. It is only needed at build time, never at runtime.

```sh
cd cms
npm install
cp .env.example .env
```

Fill in the secrets in `cms/.env` (`APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`). Generate each value with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`APP_KEYS` takes a comma-separated list, run the command above four times and join the values with commas.

Then, from the repo root:

```sh
npm run cms:dev
```

The admin panel is at [http://localhost:1337/admin](http://localhost:1337/admin).

## Running tests

End-to-end checks live in `tests/e2e/`, run with Playwright. One-time setup:

```sh
npx playwright install chromium
```

Then, from the repo root:

```sh
npm run test:e2e
```

This builds the site, boots it with `astro preview`, and runs the suite against that build, so JS
budget checks reflect real production output rather than the dev server's unminified bundles. The
CMS must already be reachable and seeded (the same requirement `npm run build` has on its own).

The suite covers interaction behaviour (theme toggle, mobile menu focus trap, hero parallax),
motion gating (`prefers-reduced-motion` disables the parallax without hiding any content),
no-JavaScript content parity, console/page errors on every route under test, and the JS payload
budgets from `CLAUDE.md` (article under 5kb, homepage under 45kb).

Useful variants:

```sh
npm run test:e2e:ui       # interactive Playwright UI mode for debugging a failing spec
npm run test:e2e:report   # reopen the HTML report from the last run
```

## Deploying

The site is fully static, so it deploys as an assets-only Cloudflare Worker: no Worker script, no server logic, every request served straight from `dist/`. Configuration lives in `wrangler.jsonc`. Workers rather than Pages, because new Cloudflare capabilities (gradual deployments, the Vite plugin, Workers Logs) land on Workers first.

Builds run in GitHub Actions, never on Cloudflare. Every build needs Strapi, and no hosted Strapi exists yet, so CI boots `cms/` on SQLite, runs the seed, mints a read-only token with `npm run cms:token`, and builds against that (`.github/actions/seeded-build`). That seeded content is what production serves for now. Once a hosted Strapi exists, the deploy workflow should build against `STRAPI_URL` and `STRAPI_TOKEN` secrets instead.

| Workflow                       | Runs on                   | Does                                                                                 |
| ------------------------------ | ------------------------- | ------------------------------------------------------------------------------------ |
| `.github/workflows/ci.yml`     | every pull request        | builds, checks the JS budget, uploads a preview, runs Lighthouse against the preview |
| `.github/workflows/deploy.yml` | push to `main`, or manual | builds and runs `wrangler deploy` to production                                      |

### One-time setup

1. In the Cloudflare dashboard, open Workers & Pages once, so the account has a `workers.dev` subdomain.
2. Create an API token from the **Edit Cloudflare Workers** template.
3. Add two repository secrets in GitHub: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. Run the **Deploy** workflow manually (Actions, Deploy, Run workflow). This creates the Worker. PR previews fail until it exists, because a preview is a version of an existing Worker.
5. In branch protection for `main`, mark `bundle-size` and `lighthouse` as required checks. A failing check only blocks a merge if it is required.

### Pull request previews

Each PR gets a preview at a stable alias, `pr-<number>-slightly-lost.<subdomain>.workers.dev`, updated on every push. The link shows on the PR as a deployment ("View deployment") and in the run summary. Previews don't touch production. PRs from forks get no secrets, so their preview and Lighthouse jobs fail.

### Deploying by hand

```sh
npx wrangler login
npm run deploy
```

This builds against whatever Strapi your root `.env` points at, then deploys. Prefer the workflow: it builds from seeded content exactly as CI does.

### Cache headers

Cache headers are set in `public/_headers`, which Astro copies into `dist/` and the Workers assets runtime applies:

- `/_astro/*` is hashed JS, CSS, images, and fonts. It gets `public, max-age=31536000, immutable`.
- Unhashed `public/` files (favicons, manifest, `/assets/`) get one day.
- Everything else, meaning HTML, feeds, and the sitemap, gets `max-age=0, must-revalidate`. Revalidation is a cheap 304. HTML is deliberately not cached for a few minutes: a deploy removes the previous build's hashed files, so stale HTML would point at JS and CSS that no longer exist.

Check with `curl -I` against a preview, or locally with `npx wrangler dev` after a build.

### Custom domain

slightlylost.com is on IONOS nameservers today, and a Workers custom domain needs the zone on Cloudflare. To move it:

1. Add the zone in Cloudflare.
2. Switch the nameservers at IONOS.
3. Uncomment the `routes` entry in `wrangler.jsonc` and deploy.

## When the performance gate fails

The budget in `CLAUDE.md` is enforced on every PR by two jobs. Both fail the run; neither warns.

- **`bundle-size`** runs the Playwright budget specs (`npm run test:budget`) against the built output. Homepage JS must be under 45kb (GSAP and ScrollTrigger included). Article JS beyond the shared GSAP chunk must be under 5kb. Sizes are brotli at quality 11.
- **`lighthouse`** runs Lighthouse CI (`lighthouserc.cjs`) three times against the PR's preview: the homepage, an article, and the 404 page, mobile with simulated throttling, median run. It asserts:
  - LCP under 2.0s;
  - CLS under 0.02;
  - total blocking time under 150ms, standing in for INP, which a lab run cannot measure;
  - fonts under 360kb;
  - homepage JS under 45kb as actually transferred by Cloudflare;
  - article page weight under 900kb.

  Reports are uploaded as the `lighthouse-reports` artifact.

**Fix the regression. Do not raise the threshold.** A budget that moves whenever it is hit is not a budget. Open the report, find what grew or got slower (a new dependency, a bigger image, a new font, a script on a route that had none), and remove or defer it. The thresholds mirror the table in `CLAUDE.md`. Changing one means changing that table first, in its own PR, with a reason, and never in the PR that tripped it.

Reproduce locally:

```sh
npm run build
npx astro preview --port 4400
npm run test:budget
npx astro preview stop

# Lighthouse, against a PR preview or a local wrangler dev:
LHCI_BASE_URL=https://pr-12-slightly-lost.<subdomain>.workers.dev npm run lhci
```

Lighthouse's simulated throttling runs the same on any machine, but local transfer sizes differ from Cloudflare's, so trust the preview's numbers for byte budgets.
