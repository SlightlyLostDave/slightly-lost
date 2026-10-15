// Mints the read-only API token the site build uses to fetch content
// (STRAPI_TOKEN in the root .env). Run with `npm run cms:token` from the repo
// root after seeding. CI runs this against a freshly seeded database on every
// build, so it never depends on a token created by hand in the admin UI.
//
// Rerunning is safe: if a token named "build" already exists it is
// regenerated rather than duplicated, and the previous key stops working.
//
// The token is custom, not Strapi's read-only type. Read-only grants find and
// findOne on every content API route, users and uploads included. Custom
// grants exactly the list below and nothing else, so a new content type is
// unreadable by the build until it is added here.
//
// Strapi logs its own startup lines to stdout, so the key is written to the
// file named by BUILD_TOKEN_FILE when that is set (what CI does), and printed
// on a labelled line otherwise.
import { compileStrapi, createStrapi } from '@strapi/strapi'
import { writeFile } from 'node:fs/promises'

const TOKEN_NAME = 'build'

const READABLE_CONTENT_TYPES = [
  'api::post.post',
  'api::author.author',
  'api::tag.tag',
  'api::series.series',
  'api::atlas-entry.atlas-entry',
]

const TOKEN_PERMISSIONS = READABLE_CONTENT_TYPES.flatMap((uid) => [`${uid}.find`, `${uid}.findOne`])

async function run() {
  const appContext = await compileStrapi()
  const strapi = await createStrapi(appContext).load()

  try {
    const tokenService = strapi.service('admin::api-token-content-api')
    const existing = await tokenService.getByName(TOKEN_NAME)

    if (existing) {
      // Also migrates a token minted as read-only before it became custom.
      await tokenService.update(existing.id, { type: 'custom', permissions: TOKEN_PERMISSIONS })
    }

    const { accessKey } = existing
      ? await tokenService.regenerate(existing.id)
      : await tokenService.create({
          name: TOKEN_NAME,
          description:
            'Read-only token for the Astro site build. Managed by scripts/create-build-token.ts.',
          type: 'custom',
          permissions: TOKEN_PERMISSIONS,
          lifespan: null,
        })

    const outputFile = process.env.BUILD_TOKEN_FILE
    if (outputFile) {
      await writeFile(outputFile, accessKey, { mode: 0o600 })
      console.log(
        `Build token ${existing ? 'regenerated' : 'created'}, written to BUILD_TOKEN_FILE.`
      )
    } else {
      console.log(`Build token ${existing ? 'regenerated' : 'created'}. Set this in the root .env:`)
      console.log(`STRAPI_TOKEN=${accessKey}`)
    }
  } finally {
    await strapi.destroy()
  }
}

run().catch((error) => {
  console.error('Creating the build token failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
