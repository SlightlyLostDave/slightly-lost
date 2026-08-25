export type PillarEnum =
  'site-deep-dive' | 'mine-note' | 'food-dispatch' | 'field-kit' | 'underwater' | 'folklore'

export type PillarSlug = 'site-notes' | 'mines' | 'food' | 'field-kit' | 'underwater' | 'folklore'

export interface Pillar {
  enum: PillarEnum
  slug: PillarSlug
  name: string
  description: string
  number: string
}

export const pillars = [
  {
    enum: 'site-deep-dive',
    slug: 'site-notes',
    name: 'Site deep dives',
    description:
      'One place, taken apart properly. History, ground truth, and what is actually left standing.',
    number: '01',
  },
  {
    enum: 'mine-note',
    slug: 'mines',
    name: 'Mine notes',
    description:
      'Source-cited records of abandoned Ontario workings. Every claim carries a reference.',
    number: '02',
  },
  {
    enum: 'food-dispatch',
    slug: 'food',
    name: 'Food dispatches',
    description:
      'What people cook where the road runs out, and what I cooked badly trying to copy it.',
    number: '03',
  },
  {
    enum: 'field-kit',
    slug: 'field-kit',
    name: 'Field kit',
    description:
      'The truck, the cameras, the things that broke. No affiliate links, no gear worship.',
    number: '04',
  },
  {
    enum: 'underwater',
    slug: 'underwater',
    name: 'Underwater',
    description:
      'Wrecks, drowned villages, and the sonar returns that made me go back with a camera.',
    number: '05',
  },
  {
    enum: 'folklore',
    slug: 'folklore',
    name: 'Folklore',
    description:
      'The Haunted Atlas. Stories attached to places, and what the places look like now.',
    number: '06',
  },
] as const satisfies readonly Pillar[]

type PillarList = typeof pillars
type PillarBySlug = { [P in PillarList[number] as P['slug']]: P }
type PillarByEnum = { [P in PillarList[number] as P['enum']]: P }

export const pillarBySlug = Object.fromEntries(
  pillars.map((pillar) => [pillar.slug, pillar] as const)
) as PillarBySlug

export const pillarByEnum = Object.fromEntries(
  pillars.map((pillar) => [pillar.enum, pillar] as const)
) as PillarByEnum

export const allPillars: PillarList = pillars
