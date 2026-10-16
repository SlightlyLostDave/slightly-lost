import { atlas as atlasConfig, atlasStatusBySlug, atlasLocationPolicyBySlug } from './atlas'

export interface HomepageHero {
  kicker: string
  headline: string
  subhead: string
  coordinates: string
  place: string
}

export interface HomepageInterstitial {
  label: string
  statement: string
}

export interface HomepageSectionHeadings {
  pillars: string
  recent: string
  atlas: string
  guides: string
  newsletter: string
}

// Labels only. The values are counted from the published atlas entries at
// build time, in src/lib/atlas-stats.ts.
export interface HomepageAtlasStats {
  // Below this many published entries the teaser shows no statistics at all.
  minimumEntries: number
  labels: {
    entries: string
    visited: string
    withheld: string
  }
}

export interface HomepageGuideLogbookCard {
  label: string
  title: string
  description: string
  ctaLabel: string
  href: string
  imageAlt: string
}

export interface HomepageAtlas {
  label: string
  intro: string
  ctaLabel: string
  href: string
  // {count} is replaced with the number of places plotted on the plate.
  plateDescription: string
}

export interface HomepageNewsletter {
  intro: string
  finePrint: string
}

// Labels only. The values are read from the post at href, so they are always
// the ones the loader computed for the article itself.
export interface FeaturedDispatchStatLabels {
  published: string
  reading: string
  readingUnit: string
  photographs: string
}

export interface HomepageFeaturedDispatch {
  label: string
  title: string
  standfirst: string
  statLabels: FeaturedDispatchStatLabels
  ctaLabel: string
  href: string
  imageAlt: string
  imageCaption: string
}

export interface HomepageConfig {
  hero: HomepageHero
  interstitial: HomepageInterstitial
  featuredDispatch: HomepageFeaturedDispatch
  sectionHeadings: HomepageSectionHeadings
  atlas: HomepageAtlas
  atlasStats: HomepageAtlasStats
  guidesLogbooks: readonly HomepageGuideLogbookCard[]
  newsletter: HomepageNewsletter
}

export const homepage = {
  hero: {
    kicker: 'Ontario & elsewhere / since 2005',
    headline: 'Go looking for hidden things.',
    subhead:
      'Abandoned locales, drowned villages, and the long way round to dinner. Notes from where my curiosity leads me.',
    coordinates: '38.7231° N, 105.1259° W',
    place: 'Theresa Mine, Colorado',
  },
  interstitial: {
    label: 'What this is',
    statement:
      'Notes, photographs, recipes, and other miscellany from the places I have been, and the things I have seen.',
  },
  featuredDispatch: {
    label: 'Latest / Mine notes',
    title: 'The headframe at Centre Hill is falling down slowly enough to measure',
    standfirst:
      'Two capture sessions eleven months apart, 1,840 photographs, and a point cloud that says the north leg has moved.',
    statLabels: {
      published: 'Published',
      reading: 'Reading',
      readingUnit: 'min',
      photographs: 'Photographs',
    },
    ctaLabel: 'Read the dispatch',
    // Also the lookup key for the stats: FeaturedDispatch.astro finds the
    // published post with this href and reads its values from there.
    href: '/field-notes/mines/centre-hill-headframe',
    imageAlt: 'Centre Hill headframe across the clearing, placeholder pending photography',
    imageCaption: 'Fig. 1 / North leg, second capture session',
  },
  sectionHeadings: {
    pillars: 'Six things I keep going back to',
    recent: 'Recent field notes',
    atlas: 'Every place I have stood, plotted honestly',
    guides: 'Guides and logbooks',
    newsletter: 'One dispatch a month, sent when there is something to say',
  },
  atlas: {
    label: atlasConfig.label,
    intro:
      'Mines, wrecks, drowned settlements, and the stories attached to them. Some coordinates are deliberately fuzzed and some are withheld entirely, because a few of these places will hurt you and a few of them belong to somebody.',
    ctaLabel: 'Open the atlas',
    href: '/atlas',
    plateDescription:
      'A map plate of the {count} atlas places with a published location. Withheld places are not on it.',
  },
  atlasStats: {
    minimumEntries: 20,
    labels: {
      entries: 'Entries',
      visited: atlasStatusBySlug.visited.name,
      withheld: atlasLocationPolicyBySlug.withheld.name,
    },
  },
  guidesLogbooks: [
    {
      label: 'Guides',
      title: 'Reading a mine plan before you go anywhere near one',
      description:
        'Shafts, adits, stopes, and the difference between a plan that is accurate and a plan that is merely old.',
      ctaLabel: 'Start with the basics',
      href: '/guides/reading-a-mine-plan',
      imageAlt: 'A mine plan laid out on a table, placeholder pending photography',
    },
    {
      label: 'Logbooks',
      title: 'The 2026 logbook, county by county',
      description:
        'Every trip in order, including the ones that came to nothing. Distances, dates, and what the weather did.',
      ctaLabel: 'Open the logbook',
      href: '/logbooks/2026',
      imageAlt: 'A page from the 2026 logbook, placeholder pending photography',
    },
  ],
  newsletter: {
    intro:
      'No schedule, no growth strategy, no sponsored anything. If a month is quiet you will not hear from me.',
    finePrint:
      'One email a month at most. Unsubscribe link in every one. Sent via [ESP placeholder].',
  },
} as const satisfies HomepageConfig
