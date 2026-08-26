import { site } from '@/config'

interface SharedSeoFields {
  title: string
  description: string
  openGraphImage?: string
  canonicalUrl?: string
  noindex?: boolean
}

export type SeoInput =
  | (SharedSeoFields & { type: 'website' })
  | (SharedSeoFields & {
      type: 'article'
      publishedAt: Date
      updatedAt?: Date
      authorName?: string
    })

interface OpenGraphMeta {
  title: string
  description: string
  image: string
  url: string
  type: 'website' | 'article'
  siteName: string
}

interface TwitterMeta {
  card: 'summary_large_image'
  title: string
  description: string
  image: string
}

interface WebsiteJsonLd {
  '@context': 'https://schema.org'
  '@type': 'WebSite'
  name: string
  description: string
  url: string
}

interface ArticleJsonLd {
  '@context': 'https://schema.org'
  '@type': 'Article'
  headline: string
  description: string
  image: string
  url: string
  datePublished: string
  dateModified: string
  author: { '@type': 'Person'; name: string }
}

export interface SeoResult {
  pageTitle: string
  metaDescription: string
  canonicalUrl: string
  robots: 'index, follow' | 'noindex, nofollow'
  openGraph: OpenGraphMeta
  twitter: TwitterMeta
  jsonLd: WebsiteJsonLd | ArticleJsonLd
}

function toAbsoluteUrl(path: string): string {
  return new URL(path, site.url).toString()
}

export function buildSeo(input: SeoInput, currentUrl: URL): SeoResult {
  const image = toAbsoluteUrl(input.openGraphImage ?? site.socialImage)
  const canonicalUrl = input.canonicalUrl ?? `${currentUrl.origin}${currentUrl.pathname}`

  const openGraph: OpenGraphMeta = {
    title: input.title,
    description: input.description,
    image,
    url: canonicalUrl,
    type: input.type,
    siteName: site.name,
  }

  const twitter: TwitterMeta = {
    card: 'summary_large_image',
    title: input.title,
    description: input.description,
    image,
  }

  const jsonLd: WebsiteJsonLd | ArticleJsonLd =
    input.type === 'website'
      ? {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: site.name,
          description: input.description,
          url: site.url,
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: input.title,
          description: input.description,
          image,
          url: canonicalUrl,
          datePublished: input.publishedAt.toISOString(),
          dateModified: (input.updatedAt ?? input.publishedAt).toISOString(),
          author: { '@type': 'Person', name: input.authorName ?? site.author.name },
        }

  return {
    pageTitle: `${input.title} - ${site.name}`,
    metaDescription: input.description,
    canonicalUrl,
    robots: input.noindex ? 'noindex, nofollow' : 'index, follow',
    openGraph,
    twitter,
    jsonLd,
  }
}
