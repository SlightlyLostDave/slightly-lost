// Seeds the Strapi content model with real, publishable content so the loader
// (src/loaders/strapi.ts, Phase 2 prompt 05) has something to fetch. Run with
// `npm run cms:seed` from the repo root. Safe to run against a fresh database
// only: it checks for prior seed data and fails loudly rather than duplicating
// anything, since the expected workflow is to drop cms/.tmp/data.db (or the
// configured database) and reseed from scratch.
import { compileStrapi, createStrapi } from '@strapi/strapi'
import { stat } from 'node:fs/promises'
import path from 'node:path'

type Strapi = Awaited<ReturnType<typeof createStrapi>>

// Resolved from the cms/ working directory, since this script always runs via
// `npm run seed` from cms/ (either directly or through the root cms:seed
// script's --prefix cms).
const REPO_ROOT = path.resolve(process.cwd(), '..')

// The only real photography-shaped assets in the repo today. There is no
// article photography yet, so these three homepage hero layers are reused as
// stand-ins across every image slot below. Each upload also carries a caption
// noting that in the CMS itself, not just here.
const PLACEHOLDER_SOURCES = [
  path.join(REPO_ROOT, 'src/assets/home/hero-background.webp'),
  path.join(REPO_ROOT, 'src/assets/home/hero-midground.webp'),
  path.join(REPO_ROOT, 'src/assets/home/hero-foreground.webp'),
]

let placeholderIndex = 0

async function uploadPlaceholderImage(strapi: Strapi, alternativeText: string): Promise<number> {
  const sourcePath = PLACEHOLDER_SOURCES[placeholderIndex % PLACEHOLDER_SOURCES.length]
  placeholderIndex += 1

  const stats = await stat(sourcePath)
  const ext = path.extname(sourcePath)
  const name = `${path.basename(sourcePath, ext)}-${placeholderIndex}${ext}`

  // The upload service reads the file itself via filepath/getStream, so only
  // the local disk provider is configured (cms/config/plugins.ts sets no
  // provider) - this writes straight into cms/public/uploads.
  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: {
      fileInfo: {
        name,
        alternativeText,
        caption: 'Placeholder image, pending photography.',
      },
    },
    files: {
      filepath: sourcePath,
      originalFilename: name,
      mimetype: 'image/webp',
      size: stats.size,
    },
  })

  return uploaded.id
}

function paragraph(text: string) {
  return { type: 'paragraph', children: [{ type: 'text', text }] }
}

function paragraphWithLink(before: string, linkText: string, url: string, after: string) {
  return {
    type: 'paragraph',
    children: [
      { type: 'text', text: before },
      { type: 'link', url, children: [{ type: 'text', text: linkText }] },
      { type: 'text', text: after },
    ],
  }
}

function unorderedList(items: string[]) {
  return {
    type: 'list',
    format: 'unordered',
    children: items.map((text) => ({
      type: 'list-item',
      children: [{ type: 'text', text }],
    })),
  }
}

function richText(...blocks: unknown[]) {
  return { __component: 'body.rich-text', content: blocks }
}

async function run() {
  const appContext = await compileStrapi()
  const strapi = await createStrapi(appContext).load()

  try {
    const existing = await strapi.documents('api::author.author').findFirst({
      filters: { slug: 'dave-beach' },
    })

    if (existing) {
      throw new Error(
        'Seed data already exists (found author "dave-beach"). Clear cms/.tmp/data.db ' +
          '(or the configured database) before running the seed script again.',
      )
    }

    console.log('Uploading placeholder images...')
    const heroCentreHill = await uploadPlaceholderImage(
      strapi,
      'Centre Hill headframe across the clearing, placeholder pending photography',
    )
    const figureGridA = await uploadPlaceholderImage(
      strapi,
      'First capture session, September 2025, placeholder pending photography',
    )
    const figureGridB = await uploadPlaceholderImage(
      strapi,
      'Second capture session, August 2026, placeholder pending photography',
    )
    const figureNorthLeg = await uploadPlaceholderImage(
      strapi,
      'North leg base, near-ground detail showing the crack at the footing, placeholder pending photography',
    )
    const heroSonar = await uploadPlaceholderImage(
      strapi,
      'Sonar return over the reservoir, placeholder pending photography',
    )
    const heroChipVan = await uploadPlaceholderImage(
      strapi,
      'Chip van at the Sychnant Pass, placeholder pending photography',
    )
    const heroPryce = await uploadPlaceholderImage(
      strapi,
      'The old Pryce place, placeholder pending photography',
    )

    console.log('Creating author...')
    const authorDraft = await strapi.documents('api::author.author').create({
      data: {
        name: 'Dave Beach',
        slug: 'dave-beach',
        bio: 'Dave Beach writes and photographs the places history left behind, from abandoned mine workings in the Sudbury Basin to drowned villages and roadside folklore. Based in Ontario, Canada.',
        url: 'https://slightlylost.com',
      },
    })
    await strapi.documents('api::author.author').publish({ documentId: authorDraft.documentId })

    console.log('Creating tags...')
    const structuralSurveyDraft = await strapi.documents('api::tag.tag').create({
      data: {
        name: 'Structural Survey',
        slug: 'structural-survey',
        description: 'Repeat-measurement fieldwork tracking how a structure is changing over time.',
      },
    })
    await strapi.documents('api::tag.tag').publish({ documentId: structuralSurveyDraft.documentId })

    const underwaterArchaeologyDraft = await strapi.documents('api::tag.tag').create({
      data: {
        name: 'Underwater Archaeology',
        slug: 'underwater-archaeology',
        description: 'Submerged structures and what sonar and diving turn up about them.',
      },
    })
    await strapi
      .documents('api::tag.tag')
      .publish({ documentId: underwaterArchaeologyDraft.documentId })

    console.log('Creating series...')
    const seriesDraft = await strapi.documents('api::series.series').create({
      data: {
        name: 'Sudbury Basin',
        slug: 'sudbury-basin',
        description:
          'Ongoing fieldwork across the abandoned mine workings of the Sudbury Basin, revisited on a schedule rather than once.',
      },
    })
    await strapi.documents('api::series.series').publish({ documentId: seriesDraft.documentId })

    console.log('Creating the Centre Hill post...')
    const centreHillDraft = await strapi.documents('api::post.post').create({
      data: {
        title: 'The headframe at Centre Hill is falling down slowly enough to measure',
        slug: 'centre-hill-headframe',
        pillar: 'mine-note',
        region: 'Sudbury Basin',
        dek: 'Two capture sessions eleven months apart, 1,840 photographs, and a point cloud that says the north leg has moved.',
        featured: true,
        author: authorDraft.documentId,
        series: seriesDraft.documentId,
        seriesOrder: 1,
        tags: [structuralSurveyDraft.documentId, underwaterArchaeologyDraft.documentId],
        hero: heroCentreHill,
        fieldData: [
          { label: 'Coordinates', value: '46.4821 N, 81.0093 W' },
          { label: 'Elevation', value: '318', unit: 'm' },
          { label: 'Walked in', value: '2.4', unit: 'km' },
          { label: 'First visited', value: '2025.09.28' },
          { label: 'Location policy', value: 'Fuzzed', accent: true },
        ],
        sources: [
          {
            author: 'Ontario Ministry of Mines',
            title: 'Abandoned Mines Information System, Centre Hill workings, record [AMIS ID]',
            note: 'Assessment file [AFRI number]',
          },
          {
            author: 'Ontario Geological Survey',
            title:
              'Sudbury district property file, Centre Hill headframe structural notes, [OGS file number]',
          },
          {
            author: 'Natural Resources Canada',
            title: 'National Air Photo Library, Sudbury Basin flight line [NAPL roll/frame ID]',
          },
        ],
        body: [
          richText(
            paragraph(
              'The headframe at Centre Hill is a four-legged riveted steel frame, nineteen metres to the sheave deck, raised in 1938 by a contractor out of Copper Cliff who built three others like it in the basin and left no drawings behind for any of them. The mine closed in 1962, and the surface plant came down in stages through the following decade: hoist house first, then the dry, then the ore bin. The headframe stayed upright because taking it down would have cost more than leaving it, which is the reason most of these things are still standing anywhere in this district. Sixty-odd years of freeze and thaw have not been kind to the footings, and nothing about the structure suggests it was built with sixty years in mind.',
            ),
          ),
          richText(
            paragraph(
              'The approach is 2.4 kilometres from a pull-off on a haul road the county stopped maintaining sometime after the mine closed, through second-growth birch and a stretch of low ground that only holds a boot in a hard frost. There is no sign at the road and nothing at the collar to say that a shaft goes down several hundred metres directly under the leaf litter. I first walked in on 2025.09.28, with no plan beyond looking at the thing standing there. It leans, visibly, if you already know to look for it, and it photographs badly from any single position, because the lean only reads against something else to compare it to. That absence of a fixed reference is the entire reason this site earned a second visit instead of staying a single afternoon in a folder.',
            ),
          ),
          richText(
            paragraph(
              'The second session followed eleven months later, deliberately in comparable light and with the same lens, and this time with a plan: 1,840 frames across two loops, one at ground level circling the footings and one from the till shelf above, shot with enough overlap to build a photogrammetric model that could be measured against the first. A single model of a ruin is a portrait, useful for exactly what a portrait is useful for. Two models of the same ruin, captured months apart and aligned on a fixed point, are a measurement, which is a different kind of object entirely, and the only kind that answers the question this place actually raises: not whether it looks derelict, but whether it is still doing the same thing it was doing a year ago.',
            ),
          ),
          {
            __component: 'body.figure-grid',
            columns: '2',
            images: [figureGridA, figureGridB],
            captions: [],
          },
          richText(
            paragraph(
              'Aligned on the concrete collar, which has not moved and is not going to, the two clouds agree almost everywhere. The south and east legs sit within four millimetres of each other, which is close to the noise floor of this method at this range with this camera. The sheave deck is unchanged, structurally and photographically. The north leg is a different result: thirty-one millimetres out at the second bracing tier and fifty-eight at the deck, all of it in the same direction, downslope and slightly east, and all of it consistent with the visible crack that runs out of frame in both sessions at the base of that footing.',
            ),
          ),
          richText(
            paragraph(
              'None of that is a dramatic number on its own. A millimetre and a half a week, distributed across a structure that has already stood through sixty-odd freeze cycles, is not an emergency by any ordinary reading. It is, however, a number, and a repeatable one, in a place where the only account of movement before this had been a general sense that the thing looked a bit more tilted than people remembered. A point cloud will not tell you whether that matters. It will tell you, precisely and without opinion, what changed and by how much, which turns out to be a smaller service than it sounds and a considerably more useful one than a photograph.',
            ),
          ),
          {
            __component: 'body.pull-quote',
            quote:
              'The model is very good at telling you what a thing looks like and completely silent on whether it is about to fall on you.',
          },
          richText(
            paragraph(
              'What a retired hoistman from Copper Cliff told me on the second visit, standing at the collar and looking up at the same leg, was that the frame was sound when he left it and that steel does not fail quietly. Both of those things can be true and still not settle anything, because sound in 1962 and sound now are different claims separated by sixty-four winters, and quietly is doing a lot of work in a sentence about a structure nobody is monitoring. The wet corner of the pad under that footing has visibly slumped since the first session. That much needed no instrument to see; the instrument only said how much.',
            ),
          ),
          {
            __component: 'body.figure',
            image: figureNorthLeg,
            width: 'measure',
          },
          richText(
            paragraphWithLink(
              'The method has limits worth stating plainly. Photogrammetric comparison assumes a fixed reference, and the collar is the only feature at this site stable enough to serve as one; if the collar itself has settled, everything measured against it is wrong by the same amount, in a direction nothing here would reveal. It also assumes consistent capture conditions, which is why both sessions used the same lens, the same time of day, and as close to the same standing positions as the ground allowed. None of that is exotic; it is the same discipline any ',
              'structure-from-motion',
              'https://en.wikipedia.org/wiki/Structure_from_motion',
              ' survey depends on, described in more careful terms than a field note usually bothers with.',
            ),
          ),
          richText(
            unorderedList([
              "South leg, second bracing tier: 4 mm apparent shift, within the method's noise floor",
              "East leg, second bracing tier: 3 mm apparent shift, within the method's noise floor",
              'Sheave deck: no measurable change',
              'North leg, second bracing tier: 31 mm, downslope and east, repeatable across both loops',
              'North leg, sheave deck: 58 mm, same direction, the largest measured delta at the site',
            ]),
          ),
          richText(
            paragraph(
              'A third session is set for the same week next year, at which point the interval itself becomes the more interesting variable than any single displacement, since one comparison establishes that something moved and only a third establishes whether it is accelerating. The coordinates published here are fuzzed, which is the standing policy for any site with an open collar regardless of how well documented the structure above it already is. The headframe will likely still be standing next spring. Whether it will still be standing the spring after that is exactly the question this method was built to answer, slowly, one session at a time.',
            ),
          ),
        ],
      },
    })
    await strapi.documents('api::post.post').publish({ documentId: centreHillDraft.documentId })

    console.log('Creating the remaining posts from recent-notes.ts...')

    const sonarDraft = await strapi.documents('api::post.post').create({
      data: {
        title: 'The sonar return that turned out to be a bridge',
        slug: 'sonar-return-bridge',
        pillar: 'underwater',
        region: 'Kawartha Lakes, Ontario',
        dek: 'Two passes over the same reservoir, eleven metres down, and a structure the survey sheet does not admit to.',
        author: authorDraft.documentId,
        tags: [underwaterArchaeologyDraft.documentId],
        hero: heroSonar,
        body: [
          richText(
            paragraph(
              "Two passes with a side-scan unit, eleven metres down, on a reservoir that has been surveyed for silt and structure integrity every decade since it filled. Neither of those surveys mentions what showed up on both of these passes: a long, straight return with two evenly spaced piers, sitting where the sheet says there should be nothing but old riverbed.",
            ),
          ),
          richText(
            paragraph(
              "The reservoir dates to 1961. Comparing the return's position against a pre-flood topographic sheet from 1958 puts it almost exactly on a farm access crossing that the flooding was supposed to have erased along with the road it served. Nothing in the reservoir authority's own record admits the crossing survived the fill.",
            ),
          ),
          richText(
            paragraph(
              'A dive to confirm it is booked for next month, water temperature allowing. Until then this is a sonar return and a coincidence of position, not yet a bridge.',
            ),
          ),
        ],
      },
    })
    await strapi.documents('api::post.post').publish({ documentId: sonarDraft.documentId })

    const chipVanDraft = await strapi.documents('api::post.post').create({
      data: {
        title: 'The chip van at the top of the Sychnant Pass',
        slug: 'sychnant-pass-chip-van',
        pillar: 'food-dispatch',
        region: 'Conwy, Wales',
        dek: 'Open when the weather allows it, closed when it does not. Two things on the board and both are correct.',
        author: authorDraft.documentId,
        hero: heroChipVan,
        body: [
          richText(
            paragraph(
              'The van sits at the top of the pass with no sign beyond a chalkboard, open whenever the weather lets a generator and a fryer sit outside all day and closed the rest of the time, which in a Welsh winter is often.',
            ),
          ),
          richText(
            paragraph(
              "Two things are on the board on any given day, always chips and always one thing to put on them, and both are correct in a way that a longer menu usually isn't. The vinegar is the good stuff, poured with intent rather than measured.",
            ),
          ),
          richText(
            paragraph(
              "There is no phone number to check if it's open. You drive up the pass and either the van is there or it isn't, which is either the whole charm of the place or the reason to bring a backup lunch, depending on how the day is going.",
            ),
          ),
        ],
      },
    })
    await strapi.documents('api::post.post').publish({ documentId: chipVanDraft.documentId })

    const pryceDraft = await strapi.documents('api::post.post').create({
      data: {
        title: 'Nobody in the village calls it the haunted farm',
        slug: 'old-pryce-place',
        pillar: 'folklore',
        region: 'Mid Wales',
        dek: 'They call it the old Pryce place, and they will tell you about the dog before they tell you about the light.',
        author: authorDraft.documentId,
        hero: heroPryce,
        body: [
          richText(
            paragraph(
              'Nobody in the village calls it the haunted farm. It is the old Pryce place, a name that outlasted the family by three generations and shows no sign of losing to whatever the estate agents tried to rebrand it as in the nineties.',
            ),
          ),
          richText(
            paragraph(
              'Ask about it and the dog comes up before the light does: a black shape at the treeline that walks the fence line at dusk and is gone by the time a torch reaches it. The light gets a shorter mention, almost an afterthought, seen from the road on nights nobody can agree on.',
            ),
          ),
          richText(
            paragraph(
              'The farmhouse itself is unremarkable, a stone longhouse with a collapsed byre, the kind of building that exists by the hundred in this valley without a story attached. Whatever this one has belongs to the dog and the field, not the walls.',
            ),
          ),
        ],
      },
    })
    await strapi.documents('api::post.post').publish({ documentId: pryceDraft.documentId })

    console.log('Seed complete:')
    console.log('  1 author (Dave Beach)')
    console.log('  2 tags (Structural Survey, Underwater Archaeology)')
    console.log('  1 series (Sudbury Basin)')
    console.log('  4 posts (centre-hill-headframe, sonar-return-bridge, sychnant-pass-chip-van, old-pryce-place)')
    console.log('  7 placeholder images uploaded')
  } finally {
    await strapi.destroy()
  }
}

run().catch((error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
