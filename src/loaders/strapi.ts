import qs from 'qs'
import type { Loader, LoaderContext, MetaStore } from 'astro/loaders'
import { pillarByEnum, type PillarEnum } from '@/config/pillars'
import { warnIfBelowMinimumHeroDimension } from '@/lib/images'

const SCHEMA_VERSION = '1'
const META_LAST_SYNC_KEY = 'lastSyncedAt'
const META_SCHEMA_VERSION_KEY = 'schemaVersion'

interface StrapiMediaRaw {
  url: string
  width: number | null
  height: number | null
  alternativeText: string | null
}

interface NormalizedImage {
  src: string
  width: number
  height: number
  alt: string
}

interface StrapiBlockNode {
  type: string
  text?: string
  children?: StrapiBlockNode[]
}

interface StrapiSourceRaw {
  title: string
  author?: string | null
  url?: string | null
  publication?: string | null
  year?: number | null
  note?: string | null
}

interface StrapiCaptionRaw {
  caption: string
}

interface StrapiBodyItemRaw {
  __component: string
  content?: StrapiBlockNode[]
  image?: StrapiMediaRaw | null
  images?: StrapiMediaRaw[] | null
  captions?: StrapiCaptionRaw[] | null
  caption?: string | null
  width?: string | null
  columns?: string | null
  quote?: string | null
  attribution?: string | null
}

interface StrapiRelationRef {
  slug: string
}

interface StrapiAuthorRaw extends StrapiRelationRef {
  name: string
  bio?: string | null
  avatar?: StrapiMediaRaw | null
  url?: string | null
}

interface StrapiTagRaw extends StrapiRelationRef {
  name: string
  description?: string | null
}

interface StrapiSeriesRaw extends StrapiRelationRef {
  name: string
  description?: string | null
  hero?: StrapiMediaRaw | null
}

interface StrapiPostRaw {
  slug: string
  title: string
  pillar: PillarEnum
  region: string
  dek: string
  body: StrapiBodyItemRaw[]
  hero: StrapiMediaRaw
  gallery?: StrapiMediaRaw[] | null
  featured?: boolean | null
  series?: StrapiSeriesRaw | null
  seriesOrder?: number | null
  tags?: StrapiTagRaw[] | null
  author?: StrapiAuthorRaw | null
  fieldData?: { label: string; value: string; unit?: string | null; accent?: boolean | null }[] | null
  sources?: StrapiSourceRaw[] | null
  seo?: {
    metaTitle?: string | null
    metaDescription?: string | null
    ogImage?: StrapiMediaRaw | null
    canonicalUrl?: string | null
    noindex?: boolean | null
  } | null
  publishedAt: string
  updatedAt: string
}

function normalizeImage(media: StrapiMediaRaw | null | undefined): NormalizedImage | undefined {
  if (!media) return undefined
  const strapiUrl = import.meta.env.STRAPI_URL
  const src = media.url.startsWith('http') ? media.url : `${strapiUrl}${media.url}`
  return {
    src,
    width: media.width ?? 0,
    height: media.height ?? 0,
    alt: media.alternativeText ?? '',
  }
}

function normalizeImages(media: StrapiMediaRaw[] | null | undefined): NormalizedImage[] {
  return (media ?? []).flatMap((item) => {
    const normalized = normalizeImage(item)
    return normalized ? [normalized] : []
  })
}

function pairImagesWithCaptions(
  images: NormalizedImage[],
  captions: StrapiCaptionRaw[] | null | undefined
): Array<NormalizedImage & { caption?: string }> {
  return images.map((image, index) => ({ ...image, caption: captions?.[index]?.caption }))
}

function countWordsInBlocks(blocks: StrapiBlockNode[]): number {
  let words = 0
  const walk = (nodes: StrapiBlockNode[]) => {
    for (const node of nodes) {
      if (typeof node.text === 'string' && node.text.trim().length > 0) {
        words += node.text.trim().split(/\s+/).length
      }
      if (node.children) walk(node.children)
    }
  }
  walk(blocks)
  return words
}

function computeReadingTime(bodyItems: StrapiBodyItemRaw[]): number {
  const totalWords = bodyItems
    .filter((item) => item.__component === 'body.rich-text')
    .reduce((sum, item) => sum + countWordsInBlocks(item.content ?? []), 0)
  return Math.max(1, Math.ceil(totalWords / 200))
}

function computePhotoCount(gallery: StrapiMediaRaw[] | null | undefined, bodyItems: StrapiBodyItemRaw[]): number {
  const galleryCount = gallery?.length ?? 0
  const bodyCount = bodyItems.reduce((sum, item) => {
    if (item.__component === 'body.figure') return sum + (item.image ? 1 : 0)
    if (item.__component === 'body.figure-grid') return sum + (item.images?.length ?? 0)
    return sum
  }, 0)
  return galleryCount + bodyCount
}

function formatCitation(source: StrapiSourceRaw): string {
  const parts: string[] = []
  if (source.author) parts.push(`${source.author},`)
  parts.push(`"${source.title},"`)
  if (source.publication) parts.push(source.publication)
  if (source.year) parts.push(`(${source.year})`)
  let citation = parts.join(' ').trim()
  if (source.url) citation += ` ${source.url}`
  return citation
}

function buildHref(pillar: PillarEnum, slug: string): string {
  return `/field-notes/${pillarByEnum[pillar].slug}/${slug}`
}

function normalizeBodyItem(item: StrapiBodyItemRaw): Record<string, unknown> {
  switch (item.__component) {
    case 'body.rich-text':
      return { component: item.__component, content: item.content ?? [] }
    case 'body.figure':
      return {
        component: item.__component,
        image: normalizeImage(item.image),
        caption: item.caption ?? undefined,
        width: item.width ?? 'measure',
      }
    case 'body.figure-grid':
      return {
        component: item.__component,
        images: pairImagesWithCaptions(normalizeImages(item.images), item.captions),
        columns: item.columns ?? '2',
      }
    case 'body.pull-quote':
      return {
        component: item.__component,
        quote: item.quote ?? '',
        attribution: item.attribution ?? undefined,
      }
    default:
      throw new Error(`strapi loader (posts): unrecognized body component "${item.__component}"`)
  }
}

function normalizePost(raw: StrapiPostRaw, logger: LoaderContext['logger']): Record<string, unknown> {
  const hero = normalizeImage(raw.hero)
  if (hero) warnIfBelowMinimumHeroDimension(hero, raw.slug, logger)

  return {
    title: raw.title,
    pillar: pillarByEnum[raw.pillar].slug,
    region: raw.region,
    dek: raw.dek,
    body: raw.body.map(normalizeBodyItem),
    hero,
    gallery: normalizeImages(raw.gallery),
    featured: raw.featured ?? false,
    series: raw.series?.slug,
    seriesOrder: raw.seriesOrder ?? undefined,
    tags: (raw.tags ?? []).map((tag) => tag.slug),
    author: raw.author?.slug,
    authorName: raw.author?.name,
    fieldData: (raw.fieldData ?? []).map((item) => ({
      label: item.label,
      value: item.value,
      unit: item.unit ?? undefined,
      accent: item.accent ?? false,
    })),
    sources: (raw.sources ?? []).map((source) => ({
      citation: formatCitation(source),
      note: source.note ?? undefined,
    })),
    seo: raw.seo
      ? {
          metaTitle: raw.seo.metaTitle ?? undefined,
          metaDescription: raw.seo.metaDescription ?? undefined,
          ogImage: normalizeImage(raw.seo.ogImage),
          canonicalUrl: raw.seo.canonicalUrl ?? undefined,
          noindex: raw.seo.noindex ?? false,
        }
      : undefined,
    href: buildHref(raw.pillar, raw.slug),
    readingTime: computeReadingTime(raw.body),
    photoCount: computePhotoCount(raw.gallery, raw.body),
    publishedAt: raw.publishedAt,
    updatedAt: raw.updatedAt,
  }
}

function normalizeAuthor(raw: StrapiAuthorRaw): Record<string, unknown> {
  return {
    name: raw.name,
    bio: raw.bio ?? undefined,
    avatar: normalizeImage(raw.avatar),
    url: raw.url ?? undefined,
  }
}

function normalizeTag(raw: StrapiTagRaw): Record<string, unknown> {
  return {
    name: raw.name,
    description: raw.description ?? undefined,
  }
}

function normalizeSeries(raw: StrapiSeriesRaw): Record<string, unknown> {
  return {
    name: raw.name,
    description: raw.description ?? undefined,
    hero: normalizeImage(raw.hero),
  }
}

function normalizeEntry(
  contentType: string,
  raw: Record<string, unknown>,
  logger: LoaderContext['logger']
): Record<string, unknown> {
  switch (contentType) {
    case 'posts':
      return normalizePost(raw as unknown as StrapiPostRaw, logger)
    case 'authors':
      return normalizeAuthor(raw as unknown as StrapiAuthorRaw)
    case 'tags':
      return normalizeTag(raw as unknown as StrapiTagRaw)
    case 'series-entries':
      return normalizeSeries(raw as unknown as StrapiSeriesRaw)
    default:
      throw new Error(`strapi loader: no normalizer registered for content type "${contentType}"`)
  }
}

async function fetchAllPages(opts: {
  contentType: string
  populate?: string | string[] | Record<string, unknown>
  updatedAtGte?: string
}): Promise<Record<string, unknown>[]> {
  const strapiUrl = import.meta.env.STRAPI_URL
  const strapiToken = import.meta.env.STRAPI_TOKEN

  if (!strapiUrl) {
    throw new Error(`strapi loader (${opts.contentType}): STRAPI_URL is not set`)
  }

  const results: Record<string, unknown>[] = []
  let page = 1
  let pageCount = 1

  do {
    const query = qs.stringify(
      {
        pagination: { page, pageSize: 100 },
        populate: opts.populate,
        ...(opts.updatedAtGte ? { filters: { updatedAt: { $gte: opts.updatedAtGte } } } : {}),
      },
      { encodeValuesOnly: true }
    )
    const url = `${strapiUrl}/api/${opts.contentType}?${query}`

    let response: Response
    try {
      response = await fetch(url, {
        headers: strapiToken ? { Authorization: `Bearer ${strapiToken}` } : {},
      })
    } catch (cause) {
      throw new Error(`strapi loader (${opts.contentType}): could not reach Strapi at ${strapiUrl}`, { cause })
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(`strapi loader (${opts.contentType}): Strapi rejected the API token (${response.status})`)
    }
    if (!response.ok) {
      throw new Error(
        `strapi loader (${opts.contentType}): Strapi returned ${response.status} ${response.statusText}`
      )
    }

    const body = (await response.json()) as {
      data: Record<string, unknown>[]
      meta: { pagination: { pageCount: number } }
    }
    results.push(...body.data)
    pageCount = body.meta.pagination.pageCount
    page += 1
  } while (page <= pageCount)

  return results
}

function shouldDoFullSync(meta: MetaStore): boolean {
  return (
    import.meta.env.STRAPI_FORCE_FULL_SYNC === 'true' ||
    !meta.get(META_LAST_SYNC_KEY) ||
    meta.get(META_SCHEMA_VERSION_KEY) !== SCHEMA_VERSION
  )
}

export function strapiLoader(opts: {
  contentType: string
  populate?: string | string[] | Record<string, unknown>
}): Loader {
  return {
    name: `strapi-${opts.contentType}`,
    async load({ store, meta, parseData, generateDigest, logger, collection }: LoaderContext) {
      const fullSync = shouldDoFullSync(meta)
      const lastSyncedAt = fullSync ? undefined : meta.get(META_LAST_SYNC_KEY)

      const rawItems = await fetchAllPages({
        contentType: opts.contentType,
        populate: opts.populate,
        updatedAtGte: lastSyncedAt,
      })

      if (fullSync) {
        store.clear()
        logger.info(`strapi (${collection}): full sync, fetched ${rawItems.length} entries`)
      } else {
        logger.info(
          `strapi (${collection}): incremental sync, fetched ${rawItems.length} changed entries since ${lastSyncedAt}`
        )
      }

      for (const raw of rawItems) {
        const slug = raw.slug as string
        const normalized = normalizeEntry(opts.contentType, raw, logger)
        const parsedData = await parseData({ id: slug, data: normalized })
        store.set({
          id: slug,
          data: parsedData,
          digest: generateDigest(raw.updatedAt as string),
        })
      }

      meta.set(META_LAST_SYNC_KEY, new Date().toISOString())
      meta.set(META_SCHEMA_VERSION_KEY, SCHEMA_VERSION)
    },
  }
}
