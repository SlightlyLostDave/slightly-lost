// The only module that imports maplibre-gl at runtime; everything else
// imports from here or takes types only. Pinned to the 5.x line until 6 is
// stable, and when it is, this file is the one that has to change.
import mapLibreStylesUrl from 'maplibre-gl/dist/maplibre-gl.css?url'

export { LngLatBounds, Map, addProtocol } from 'maplibre-gl'

// Imported as a URL rather than as CSS: Astro hoists CSS imported anywhere
// in a page's module graph into a render-blocking <link> in its head, which
// would load MapLibre's stylesheet with the page instead of with the map.
let mapLibreStyles: Promise<void> | undefined

export function loadMapLibreStyles(): Promise<void> {
  mapLibreStyles ??= new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = mapLibreStylesUrl
    link.addEventListener('load', () => resolve(), { once: true })
    link.addEventListener('error', () => reject(new Error('maplibre-gl.css failed to load')), {
      once: true,
    })
    document.head.append(link)
  })
  return mapLibreStyles
}
