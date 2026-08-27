import type { CollectionEntry } from 'astro:content'
import type { PostBody } from '@/content.config'
import { escapeHtml, serializeBlocks } from '@/lib/blocks'
import { site } from '@/config'

function absolutizeHref(url: string): string {
  return new URL(url, site.url).toString()
}

function serializeFigure(image: { src: string; width: number; height: number; alt: string }, caption?: string): string {
  const figcaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''
  return `<figure><img src="${escapeHtml(image.src)}" width="${image.width}" height="${image.height}" alt="${escapeHtml(image.alt)}" />${figcaption}</figure>`
}

function assertNever(value: never): never {
  throw new Error(`feed serialiser: unhandled body component "${JSON.stringify(value)}"`)
}

export function serializePostBodyToHtml(body: PostBody[]): string {
  return body
    .map((block) => {
      switch (block.component) {
        case 'body.rich-text':
          return serializeBlocks(block.content, { resolveHref: absolutizeHref })
        case 'body.figure':
          return serializeFigure(block.image, block.caption)
        case 'body.figure-grid':
          return block.images.map((image) => serializeFigure(image, image.caption)).join('')
        case 'body.pull-quote': {
          const footer = block.attribution ? `<footer>${escapeHtml(block.attribution)}</footer>` : ''
          return `<blockquote><p>${escapeHtml(block.quote)}</p>${footer}</blockquote>`
        }
        default:
          return assertNever(block)
      }
    })
    .join('')
}

export function toFeedItem(post: CollectionEntry<'posts'>) {
  const authorName = post.data.authorName ?? site.author.name
  return {
    title: post.data.title,
    description: post.data.dek,
    pubDate: post.data.publishedAt,
    link: post.data.href,
    content: serializePostBodyToHtml(post.data.body),
    customData: `<dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">${escapeHtml(authorName)}</dc:creator>`,
  }
}
