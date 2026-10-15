# Slightly Lost

The site is an Astro front end, styled with Tailwind against a custom palette, animated with GSAP, and deployed to CloudFlare. This README covers running it locally.

Live at [slightlylost.com](https://slightlylost.com).

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
