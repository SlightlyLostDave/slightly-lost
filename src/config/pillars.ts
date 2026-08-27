export type PillarEnum =
  'site-deep-dive' | 'mine-note' | 'food-dispatch' | 'field-kit' | 'underwater' | 'folklore'

export type PillarSlug = 'site-notes' | 'mines' | 'food' | 'field-kit' | 'underwater' | 'folklore'

export interface PillarImage {
  src: string
  width: number
  height: number
  alt: string
}

export interface Pillar {
  enum: PillarEnum
  slug: PillarSlug
  name: string
  description: string
  intro: string
  number: string
  image?: PillarImage
}

export const pillars = [
  {
    enum: 'site-deep-dive',
    slug: 'site-notes',
    name: 'Site deep dives',
    description:
      'One place, taken apart properly. History, ground truth, and what is actually left standing.',
    intro:
      'I go back to the same places more than once. A first pass gets the shape of a site and the obvious hazards; a second or third gets the details that only show up once you already know where to look, and the parts of the history that only make sense once you have stood in the room they happened in. These are the long writeups: what the place actually is, what the records say happened there, and what is still standing to check the records against.',
    number: '01',
  },
  {
    enum: 'mine-note',
    slug: 'mines',
    name: 'Mine notes',
    description:
      'Source-cited records of abandoned Ontario workings. Every claim carries a reference.',
    intro:
      'Every mine here was worked, abandoned, and mostly forgotten by everyone except whoever files the hazard reports. I go in with a headlamp, a gas monitor, and whatever documentation I could find beforehand, and I come out with corrections to at least one of those documents. Each entry cites what it can: mining company records, geological surveys, local memory. Where a claim cannot be sourced, it is marked as unconfirmed rather than left to sound like fact.',
    number: '02',
  },
  {
    enum: 'food-dispatch',
    slug: 'food',
    name: 'Food dispatches',
    description:
      'What people cook where the road runs out, and what I cooked badly trying to copy it.',
    intro:
      'I am not a food writer and these are not restaurant reviews. This is what gets cooked in the places I end up: gas station counters, church basements, the back of somebody\'s truck at a mine site. Sometimes I try to make it myself afterward, with mixed results that get reported honestly. The point is the food as evidence of a place, not the food as content.',
    number: '03',
  },
  {
    enum: 'field-kit',
    slug: 'field-kit',
    name: 'Field kit',
    description:
      'The truck, the cameras, the things that broke. No affiliate links, no gear worship.',
    intro:
      'Gear posts exist because gear breaks, and because most gear writing online is paid for by the gear. This is the actual kit: the truck, the cameras, the boots, the things that failed in the field and what I replaced them with. No affiliate links, and nothing here because a brand sent it for free. If something is recommended, it is because it survived.',
    number: '04',
  },
  {
    enum: 'underwater',
    slug: 'underwater',
    name: 'Underwater',
    description:
      'Wrecks, drowned villages, and the sonar returns that made me go back with a camera.',
    intro:
      'The sonar finds more than the maps admit to. Wrecks, drowned townsites, foundations that only show up at low water in a dry year. Getting a camera down to confirm what the sonar return actually is takes planning, decent visibility, and usually more than one trip. These are the dispatches from the ones that were worth the trip: what the return turned out to be, and what is left of it.',
    number: '05',
  },
  {
    enum: 'folklore',
    slug: 'folklore',
    name: 'Folklore',
    description:
      'The Haunted Atlas. Stories attached to places, and what the places look like now.',
    intro:
      'The Haunted Atlas started as a joke and turned into the largest pillar on the site. Every entry is attached to a real, visitable place, and tries to separate what is actually told locally from what has been added since by the internet. The place is real either way. What happened there is a separate question, and these dispatches try to keep the two apart.',
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
