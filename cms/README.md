# Slightly Lost CMS

Strapi 5 project for the Slightly Lost content model: `post`, `author`, `tag`, and `series`, plus the shared and body components the post dynamic zone uses. Schema files live under `src/api` and `src/components` and are committed, not just present in the local SQLite database, so the model is reviewable and reproducible.

There are no single types here. Site metadata, navigation, and pillar definitions live in `src/config/` in the Astro app, not in Strapi. See `docs/slightly-lost-architecture.md` section 4 in the repo root for the full rationale.

## Read-only API token

The Astro build is the only client that ever talks to this CMS, and it only reads. Strapi's public role should have zero permissions on anything, that's the default for new content types, verify it stayed that way under **Settings → Users & Permissions Plugin → Roles → Public**.

To create the token the build uses:

1. **Settings → API Tokens → Create new API Token**.
2. Name it (e.g. `astro-build-readonly`), type **Custom**.
3. Under permissions, grant only `find` and `findOne` for `Post`, `Author`, `Tag`, and `Series`. Nothing else, no create/update/delete, no other content types.
4. Set a token duration appropriate to your rotation policy.
5. Copy the generated value once, it's shown only at creation. Set it as `STRAPI_TOKEN` in the Astro project's build environment, never with a `PUBLIC_` prefix.

To regenerate: delete the old token under **Settings → API Tokens**, repeat the steps above, and update `STRAPI_TOKEN` wherever it's set (local `.env`, CI secrets, host environment variables). Do this immediately if the token is ever exposed.

## Editorial rules Strapi can't enforce structurally

**Alt text.** Every uploaded image needs real `alternativeText` filled in in the media library at upload time. Strapi has no schema-level way to require this field, so it's not enforced automatically, treat it as a hard rule anyway: every image on the site needs real alt text, and the CMS is the only place it can come from.

**Figure grid image count.** `body.figure-grid` should hold 2 to 3 images. Strapi's media fields have no schema-level item-count constraint (only components and dynamic zones support `min`/`max`), so this isn't enforced by the schema either.

**Figure grid captions.** `body.figure-grid.captions` is a separate repeatable list from `images`, kept apart from `alternativeText` because that field holds accessibility alt text, not a visible caption. When entering a figure grid, add captions in the same order as the images, the Astro loader pairs `images[i]` to `captions[i]` by position, not by any structural link Strapi provides. Leave `captions` empty entirely if a grid has no captions.

**Hero image minimum dimension.** `post.hero` should be at least 2400px on its long edge, the site crops it to a 4:5 portrait for mobile and a 3:2 landscape for desktop, and Astro's image pipeline never upscales, so anything smaller renders soft or letterboxed. Strapi has no schema-level way to enforce this. The Astro build's loader logs a build-time warning for any hero under that threshold, but the build still succeeds, treat the warning as a signal to reshoot or re-upload, not a hard failure.

---

## Installing and running locally

```
npm install
cp .env.example .env
```

Fill in `.env` with the secrets described below, then start Strapi:

```
npm run develop
```

`develop` runs with autoReload, which restarts the server whenever a schema file changes. Use `npm run start` instead when you just need the server running without watching for schema edits. Either can also be run from the repository root, without changing directories, via `npm run cms:dev` (this maps to `develop`).

Local dev defaults to SQLite: `DATABASE_CLIENT=sqlite` and `DATABASE_FILENAME=.tmp/data.db` in `.env.example`, no separate database server required. Production points at Postgres 17 (14 is the floor) instead, by setting `DATABASE_CLIENT=postgres` and filling in `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and `DATABASE_SSL`. No config file edits are needed either way.

The admin panel is served at `http://localhost:1337/admin` once the server is up; the first visit prompts you to create an admin user.

## Generating the secrets

`.env.example` documents the recipe. Generate each secret with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Run that once for each of `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, and `ENCRYPTION_KEY`. `APP_KEYS` takes a comma-separated list: run the command four times and join the four values with commas.

## Seeding

```
npm run seed
```

(or `npm run cms:seed` from the repository root). This runs `scripts/seed.ts`, which creates one author, two tags, one series, and four posts, including `centre-hill-headframe`, which exercises every body component and both `fieldData` and `sources`, so it's a useful reference when authoring a new post by hand. Images are uploaded from placeholder photography already in the Astro repo, tagged as placeholders pending real photography.

The seed script checks for an existing seed author first and refuses to run if it finds one, so it never creates duplicates. To reseed from empty, stop the server and delete `.tmp/data.db`, then run `npm run seed` again.

## Adding a new body component

A new post body component always touches three places, and the rule is all three or none:

1. The Strapi component schema, in `cms/src/components/body/`.
2. The variant in the `bodyItemSchema` discriminated union in `src/content.config.ts`, at the repository root.
3. A new case in the switch in `src/components/content/ArticleBody.astro`.

If the Astro-side switch is missed, the build catches it: `ArticleBody.astro` ends its switch with an `assertNever` default case, so an unhandled component variant fails the TypeScript build rather than silently rendering nothing. The loader in `src/loaders/strapi.ts` also throws at build time on any `__component` value it doesn't recognize, as a second check on the Strapi side.
