export interface HomepageHero {
  kicker: string
  headline: string
  subhead: string
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

export interface HomepageConfig {
  hero: HomepageHero
  interstitial: HomepageInterstitial
  sectionHeadings: HomepageSectionHeadings
  atlasStats: readonly AtlasStat[]
}

export const homepage = {
  hero: {
    kicker: 'Ontario and elsewhere / since 2019',
    headline: 'Go looking for the wrong things.',
    subhead:
      'Abandoned headframes, drowned villages, and the long way round to dinner. Written on site, not from the archive.',
  },
  interstitial: {
    // No visible kicker exists yet in the design mockup. Placeholder, easy to revise.
    label: 'Field notes',
    statement:
      'Most of what I find was never hidden. It was just left, and nobody went back to look at it.',
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
} as const satisfies HomepageConfig
