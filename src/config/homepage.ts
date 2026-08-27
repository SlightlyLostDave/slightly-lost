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

export interface AtlasStat {
  label: string
  value: number
}

export interface HomepageGuideLogbookCard {
  label: string
  title: string
  description: string
  ctaLabel: string
  href: string
  imageAlt: string
}

export interface HomepageNewsletter {
  finePrint: string
}

export interface FeaturedDispatchStat {
  label: string
  value: string
  unit?: string
}

export interface HomepageFeaturedDispatch {
  label: string
  title: string
  standfirst: string
  stats: readonly FeaturedDispatchStat[]
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
  atlasStats: readonly AtlasStat[]
  guidesLogbooks: readonly HomepageGuideLogbookCard[]
  newsletter: HomepageNewsletter
}

export const homepage = {
  hero: {
    kicker: 'Ontario & elsewhere / since 2005',
    headline: 'Go looking for wondrous things.',
    subhead:
      'Abandoned locales, drowned villages, and the long way round to dinner. Notes from where my curiosity leads me.',
    coordinates: '38.7231° N, 105.1259° W',
    place: 'Theresa Mine, Colorado',
  },
  interstitial: {
    label: 'Why this exists',
    statement:
      'Most of what I find was never hidden. It was just left, and nobody went back to look at it.',
  },
  featuredDispatch: {
    label: 'Latest / Mine notes',
    title: 'The headframe at Centre Hill is falling down slowly enough to measure',
    standfirst:
      'Two capture sessions eleven months apart, 1,840 photographs, and a point cloud that says the north leg has moved.',
    // Mirrors src/content/sample/centre-hill-headframe.ts by hand, not by
    // import: this is Phase-1 homepage copy, that file stands in for a
    // Phase-2 Strapi collection, and the two are not meant to cross. If
    // publishedAt / readingTime / photoCount change on the article, update
    // these three values to match.
    stats: [
      { label: 'Published', value: '14.08.2026' },
      { label: 'Reading', value: '18', unit: 'min' },
      { label: 'Photographs', value: '32' },
    ],
    ctaLabel: 'Read the dispatch',
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
  atlasStats: [
    { label: 'Entries', value: 214 },
    { label: 'Visited', value: 96 },
    { label: 'Withheld', value: 31 },
  ],
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
    finePrint:
      'One email a month at most. Unsubscribe link in every one. Sent via [ESP placeholder].',
  },
} as const satisfies HomepageConfig
