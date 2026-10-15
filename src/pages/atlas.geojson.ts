import { getLocatedAtlasEntries, getPublishedAtlasEntries } from '@/lib/atlas'

// Every visitor who opens the atlas downloads this file, so each feature
// carries only what the map needs to draw and label a marker. The panel
// renders from data already on the page and fetches nothing from here.
//
// An entry with no location after the loader's policy has run is left out
// entirely rather than written with null geometry: a null geometry still
// announces that the place exists, and some tools will plot it at 0,0.
// Coordinates arrive here already final, so nothing is rounded or filtered
// by policy in this file. scripts/assert-atlas-policy.mjs checks the output.
export async function GET() {
  const atlasEntries = getLocatedAtlasEntries(await getPublishedAtlasEntries())
  const sorted = [...atlasEntries].sort((a, b) => a.id.localeCompare(b.id))

  const featureCollection = {
    type: 'FeatureCollection',
    features: sorted.map((entry) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [entry.data.location.lng, entry.data.location.lat],
      },
      properties: {
        slug: entry.id,
        name: entry.data.name,
        kind: entry.data.kind,
        status: entry.data.status,
        href: entry.data.href,
      },
    })),
  }

  return new Response(JSON.stringify(featureCollection), {
    headers: { 'Content-Type': 'application/geo+json' },
  })
}
