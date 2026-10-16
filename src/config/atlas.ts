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

// Copy for the map island: AtlasMap.astro renders the static strings, and
// the island imports the announcements it fills in at runtime from here.
export interface AtlasMapCopy {
  label: string
  description: string
  skipLabel: string
  zoomIn: string
  zoomOut: string
  panelLabel: string
  emptyPanel: string
  expandPanel: string
  collapsePanel: string
  // {name} is replaced with the place nearest the map centre.
  nearestPlace: string
  // {count} is replaced with the number of places in the cluster.
  nearestCluster: string
  noNearbyPlace: string
  unavailable: string
}

// Copy for the kind filter row, AtlasFilters.astro.
export interface AtlasFilterCopy {
  label: string
  allLabel: string
}

// Copy for the catalogue, AtlasCatalogue.astro and the compact AtlasCard.
// Templates are filled in at build time and, for the ones the filter script
// updates, carried to the client in data attributes rather than imported.
export interface AtlasCatalogueCopy {
  heading: string
  columns: {
    kind: string
    entry: string
    place: string
    coordinates: string
    status: string
  }
  // {count} is replaced with the number of listed entries with no coordinates.
  withoutCoordinatesNote: string
  // {shown} and {total} are replaced with entry counts.
  showing: string
  // {kind} is replaced with the plural name of the selected kind.
  emptyFilter: string
  showAllLabel: string
  emptyAtlas: string
}

// Copy for an individual entry page, src/pages/atlas/[slug].astro.
export interface AtlasEntryCopy {
  breadcrumbLabel: string
  specification: {
    heading: string
    kind: string
    status: string
    coordinates: string
    locationPolicy: string
    firstVisited: string
    lastVisited: string
    dispatches: string
  }
  heroPlaceholderAlt: string
  // Rendered once per safety note. Deliberately the same words every time.
  safetyLabel: string
  location: {
    heading: string
    // {name} is replaced with the entry name, {count} with nearby places shown.
    plateDescription: string
    plateCaption: string
    // The plate is this many kilometres across, one grid square per kilometre.
    plateWidthKm: number
    // Shown for a withheld entry with no locationNote of its own.
    withheldFallback: string
  }
  dispatches: {
    heading: string
  }
  nearby: {
    heading: string
    // {distance} is replaced with the furthest distance shown, in km.
    summary: string
    count: number
    // Nothing further than this is "nearby"; the section is omitted when
    // no other entry falls inside it.
    maxDistanceKm: number
    distanceUnit: string
  }
}

// Copy for the atlas as it appears inside the writing: the entry block under
// an article body, the inline reference chip, and the coordinate row the
// field data strip takes from the linked entry.
export interface AtlasPostCopy {
  heading: string
  coordinatesLabel: string
  // Read before the chip's kind and name by assistive technology.
  referenceLabel: string
}

export interface AtlasConfig {
  label: string
  title: string
  description: string
  intro: string
  legend: readonly AtlasLegendItem[]
  filters: AtlasFilterCopy
  catalogue: AtlasCatalogueCopy
  // Served by src/pages/atlas.geojson.ts.
  geojsonPath: string
  // Above this many plotted entries the map clusters its markers. The layers
  // are written for both cases, so crossing it changes no layer.
  mapClusterThreshold: number
  map: AtlasMapCopy
  entry: AtlasEntryCopy
  post: AtlasPostCopy
}

export const atlas = {
  label: 'The Atlas',
  title: 'Places, plotted honestly',
  description:
    'Every place I have stood, and some I have only read about: mines, wrecks, and drowned settlements, each published only as precisely as is safe.',
  intro:
    'Mines, wrecks, drowned settlements, and the stories attached to them. Where a coordinate is exact, it is exact. Where it has been rounded to about a kilometre, the entry says so. Some places have no coordinates published at all, because a few of them will hurt you and a few of them belong to somebody. Those are still in the list below; they are just not on the map.',
  // The one legend for every map plate, homepage teaser and atlas page alike.
  legend: [
    { status: 'documented', marker: 'primary' },
    { status: 'visited', marker: 'secondary' },
  ],
  filters: {
    label: 'Filter by kind',
    allLabel: 'All',
  },
  catalogue: {
    heading: 'Every entry',
    columns: {
      kind: 'Kind',
      entry: 'Entry',
      place: 'Place',
      coordinates: 'Coordinates',
      status: 'Status',
    },
    withoutCoordinatesNote: 'Including the {count} without coordinates',
    showing: 'Showing {shown} of {total}',
    emptyFilter: 'Nothing is filed under {kind} yet.',
    showAllLabel: 'Show every entry',
    emptyAtlas: 'Nothing has been published to the atlas yet.',
  },
  geojsonPath: '/atlas.geojson',
  mapClusterThreshold: 200,
  map: {
    label: 'Map of the atlas',
    description:
      'An interactive map of the places in the list below. Arrow keys pan the map, plus and minus zoom, and Enter opens the place nearest the centre. Every place is in the list, including the ones with no published location.',
    skipLabel: 'Skip the map to the full list',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    panelLabel: 'Selected place',
    emptyPanel: 'Select a place on the map to read about it here.',
    expandPanel: 'Show more of this place',
    collapsePanel: 'Show less of this place',
    nearestPlace: 'Nearest place: {name}. Press Enter to open it.',
    nearestCluster: '{count} places near the centre. Press Enter to zoom in.',
    noNearbyPlace: 'No place near the centre of the map.',
    unavailable: 'The map could not load here. Every place is in the list below.',
  },
  entry: {
    breadcrumbLabel: 'Breadcrumb',
    specification: {
      heading: 'Specification',
      kind: 'Kind',
      status: 'Status',
      coordinates: 'Coordinates',
      locationPolicy: 'Location policy',
      firstVisited: 'First visited',
      lastVisited: 'Last visited',
      dispatches: 'Dispatches',
    },
    heroPlaceholderAlt: 'No photograph of this place has been published yet.',
    safetyLabel: 'Before you go',
    location: {
      heading: 'Location',
      plateDescription:
        'A map plate centred on {name}, ten kilometres across, with {count} other atlas places marked.',
      plateCaption: 'Map plate / 1 grid square = 1 km',
      plateWidthKm: 10,
      withheldFallback:
        'No location is published for this place. It is withheld on purpose, and it will stay that way.',
    },
    dispatches: {
      heading: 'Related dispatches',
    },
    nearby: {
      heading: 'Nearby entries',
      summary: 'Within {distance} km',
      count: 4,
      maxDistanceKm: 25,
      distanceUnit: 'km',
    },
  },
  post: {
    heading: 'In the atlas',
    coordinatesLabel: 'Coordinates',
    referenceLabel: 'Atlas entry:',
  },
} as const satisfies AtlasConfig
