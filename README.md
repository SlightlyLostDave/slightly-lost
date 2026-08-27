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
