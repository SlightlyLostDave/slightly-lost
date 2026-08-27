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

---

## 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
