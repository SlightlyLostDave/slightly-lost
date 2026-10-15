export type AtlasKindSlug = 'mine' | 'wreck' | 'settlement' | 'structure' | 'folklore' | 'natural'

export type AtlasStatusSlug = 'visited' | 'documented' | 'researched' | 'unconfirmed'

export type AtlasLocationPolicySlug = 'exact' | 'fuzzed' | 'withheld'

export interface AtlasKind {
  slug: AtlasKindSlug
  name: string
  pluralName: string
  description: string
}

export interface AtlasStatus {
  slug: AtlasStatusSlug
  name: string
  description: string
}

export interface AtlasLocationPolicy {
  slug: AtlasLocationPolicySlug
  name: string
  description: string
}

// What a place is. Order is the display order for filters and grouped lists.
export const atlasKinds = [
  {
    slug: 'mine',
    name: 'Mine',
    pluralName: 'Mines',
    description:
      'Shafts, adits, and the surface works left behind when the ore or the money ran out.',
  },
  {
    slug: 'wreck',
    name: 'Wreck',
    pluralName: 'Wrecks',
    description:
      'Boats, aircraft, and vehicles, most of them underwater and most of them found by sonar first.',
  },
  {
    slug: 'settlement',
    name: 'Settlement',
    pluralName: 'Settlements',
    description: 'Townsites, drowned villages, and places that had a post office once.',
  },
  {
    slug: 'structure',
    name: 'Structure',
    pluralName: 'Structures',
    description:
      'Mills, bridges, dams, and institutions standing on their own, apart from any mine.',
  },
  {
    slug: 'folklore',
    name: 'Folklore',
    pluralName: 'Folklore',
    description:
      'A real place with a story attached, whether it is told locally or was added later.',
  },
  {
    slug: 'natural',
    name: 'Natural',
    pluralName: 'Natural',
    description: 'Caves, falls, sinkholes, and ground that nobody built.',
  },
] as const satisfies readonly AtlasKind[]

// How well I know a place. A dispatch being attached is what separates
// documented from visited.
export const atlasStatuses = [
  {
    slug: 'visited',
    name: 'Visited',
    description: 'I have stood there.',
  },
  {
    slug: 'documented',
    name: 'Documented',
    description: 'Visited and written up.',
  },
  {
    slug: 'researched',
    name: 'Researched',
    description: 'Read about, not yet visited.',
  },
  {
    slug: 'unconfirmed',
    name: 'Unconfirmed',
    description: 'A claim I have not been able to verify.',
  },
] as const satisfies readonly AtlasStatus[]

// How precisely a place may be published. Enforcement is not here; it lives
// in src/lib/location-policy.ts and runs in the loader.
export const atlasLocationPolicies = [
  {
    slug: 'exact',
    name: 'Exact',
    description: 'Published as recorded. Reserved for places where precision cannot hurt anyone.',
  },
  {
    slug: 'fuzzed',
    name: 'Fuzzed',
    description: 'Rounded to two decimal places, roughly a kilometre of uncertainty.',
  },
  {
    slug: 'withheld',
    name: 'Withheld',
    description: 'No coordinates published and no marker plotted. Still listed.',
  },
] as const satisfies readonly AtlasLocationPolicy[]

type AtlasKindList = typeof atlasKinds
type AtlasStatusList = typeof atlasStatuses
type AtlasLocationPolicyList = typeof atlasLocationPolicies
type AtlasKindBySlug = { [K in AtlasKindList[number] as K['slug']]: K }
type AtlasStatusBySlug = { [S in AtlasStatusList[number] as S['slug']]: S }
type AtlasLocationPolicyBySlug = { [P in AtlasLocationPolicyList[number] as P['slug']]: P }

export const atlasKindBySlug = Object.fromEntries(
  atlasKinds.map((kind) => [kind.slug, kind] as const)
) as AtlasKindBySlug

export const atlasStatusBySlug = Object.fromEntries(
  atlasStatuses.map((status) => [status.slug, status] as const)
) as AtlasStatusBySlug

export const atlasLocationPolicyBySlug = Object.fromEntries(
  atlasLocationPolicies.map((policy) => [policy.slug, policy] as const)
) as AtlasLocationPolicyBySlug

export const allAtlasKinds: AtlasKindList = atlasKinds
export const allAtlasStatuses: AtlasStatusList = atlasStatuses
export const allAtlasLocationPolicies: AtlasLocationPolicyList = atlasLocationPolicies

// Marker emphasis, not colour. The component that draws a swatch maps this to
// utilities, so no component ever has to name a status to style it.
export type AtlasMarker = 'primary' | 'secondary'

export interface AtlasLegendItem {
  status: AtlasStatusSlug
  marker: AtlasMarker
}

export interface AtlasConfig {
  label: string
  title: string
  intro: string
  legend: readonly AtlasLegendItem[]
}

export const atlas = {
  label: 'The Atlas',
  title: 'Every place I have stood, and some I have only read about.',
  intro:
    'Mines, wrecks, drowned settlements, and the stories attached to them. Where a coordinate is exact, it is exact. Where it has been rounded, the entry says so. Some places have no coordinates published at all, because a few of them will hurt you and a few of them belong to somebody. Those are still listed here; they are just not on the map.',
  // The one legend for every map plate, homepage teaser and atlas page alike.
  legend: [
    { status: 'documented', marker: 'primary' },
    { status: 'visited', marker: 'secondary' },
  ],
} as const satisfies AtlasConfig
