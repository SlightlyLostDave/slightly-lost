export {}

// The island's client:visible. This site has no UI framework, and Astro's
// client directives only hydrate framework components, so this does the same
// job by hand: nothing beyond this file loads until the map is about to
// scroll into view, and then MapLibre, pmtiles, and the island arrive as one
// dynamically imported chunk. Only routes that render AtlasMap.astro include
// this script, so no other route can reach that chunk.

// Starts the download a little before the map is on screen, so it is usually
// drawn by the time the reader gets there.
const PRELOAD_MARGIN = '200px'

for (const root of document.querySelectorAll<HTMLElement>('[data-atlas-map]')) {
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      void import('./AtlasMap.client').then(({ mount }) => mount(root))
    },
    { rootMargin: PRELOAD_MARGIN }
  )
  observer.observe(root)
}
