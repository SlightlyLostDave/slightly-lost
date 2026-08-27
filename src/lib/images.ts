export const MIN_HERO_LONG_EDGE_PX = 2400

interface MinimalLogger {
  warn: (message: string) => void
}

// Only post.hero is rendered full-bleed today (FullBleed.astro). series.hero
// exists in the schema but has no renderer yet - extend this call to
// normalizeSeries if a series hero page ever ships full-bleed treatment.
export function warnIfBelowMinimumHeroDimension(
  image: { src: string; width: number; height: number },
  slug: string,
  logger: MinimalLogger
): void {
  const longEdge = Math.max(image.width, image.height)
  // width/height fall back to 0 in normalizeImage when Strapi returns no
  // dimensions; skip rather than warn, that's a separate data-quality gap.
  if (longEdge > 0 && longEdge < MIN_HERO_LONG_EDGE_PX) {
    logger.warn(
      `strapi (posts): hero image for "${slug}" is ${image.width}x${image.height}, ` +
        `below the ${MIN_HERO_LONG_EDGE_PX}px minimum long edge for full-bleed images (${image.src})`
    )
  }
}
