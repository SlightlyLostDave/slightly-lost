import { defineCollection, reference } from 'astro:content'
import { z } from 'astro/zod'
import { strapiLoader } from '@/loaders/strapi'
import { allPillars, type PillarSlug } from '@/config/pillars'

const pillarSlugValues = allPillars.map((pillar) => pillar.slug) as [PillarSlug, ...PillarSlug[]]
const pillarSlugSchema = z.enum(pillarSlugValues)

const imageSchema = z.object({
  src: z.string(),
  width: z.number(),
  height: z.number(),
  alt: z.string(),
})

const fieldDataSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.string().optional(),
  accent: z.boolean().default(false),
})

const sourceSchema = z.object({
  citation: z.string(),
  note: z.string().optional(),
})

const seoSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().max(200).optional(),
  ogImage: imageSchema.optional(),
  canonicalUrl: z.string().optional(),
  noindex: z.boolean().default(false),
})

export interface StrapiBlockNode {
  type: string
  text?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  url?: string
  level?: number
  format?: 'ordered' | 'unordered'
  children?: StrapiBlockNode[]
}

const richTextBlockSchema: z.ZodType<StrapiBlockNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    text: z.string().optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
    code: z.boolean().optional(),
    url: z.string().optional(),
    level: z.number().optional(),
    format: z.enum(['ordered', 'unordered']).optional(),
    children: z.array(richTextBlockSchema).optional(),
  })
)

const bodyRichTextSchema = z.object({
  component: z.literal('body.rich-text'),
  content: z.array(richTextBlockSchema),
})

const bodyFigureSchema = z.object({
  component: z.literal('body.figure'),
  image: imageSchema,
  caption: z.string().optional(),
  width: z.enum(['measure', 'container']).default('measure'),
})

const bodyFigureGridSchema = z.object({
  component: z.literal('body.figure-grid'),
  images: z.array(imageSchema.extend({ caption: z.string().optional() })),
  columns: z.enum(['2', '3']).transform((value): 2 | 3 => (value === '3' ? 3 : 2)),
})

const bodyPullQuoteSchema = z.object({
  component: z.literal('body.pull-quote'),
  quote: z.string(),
  attribution: z.string().optional(),
})

const bodyItemSchema = z.discriminatedUnion('component', [
  bodyRichTextSchema,
  bodyFigureSchema,
  bodyFigureGridSchema,
  bodyPullQuoteSchema,
])

const postSchema = z.object({
  title: z.string(),
  pillar: pillarSlugSchema,
  region: z.string(),
  dek: z.string().max(200),
  body: z.array(bodyItemSchema),
  hero: imageSchema,
  gallery: z.array(imageSchema).default([]),
  featured: z.boolean().default(false),
  series: reference('series').optional(),
  seriesOrder: z.number().optional(),
  tags: z.array(reference('tags')).default([]),
  author: reference('authors').optional(),
  authorName: z.string().optional(),
  fieldData: z.array(fieldDataSchema).default([]),
  sources: z.array(sourceSchema).default([]),
  seo: seoSchema.optional(),
  href: z.string(),
  readingTime: z.number(),
  photoCount: z.number(),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

const authorSchema = z.object({
  name: z.string(),
  bio: z.string().optional(),
  avatar: imageSchema.optional(),
  url: z.string().optional(),
})

const tagSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
})

const seriesSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  hero: imageSchema.optional(),
})

const postPopulate = {
  hero: true,
  gallery: true,
  author: true,
  tags: true,
  series: { fields: ['slug'] },
  fieldData: true,
  sources: true,
  seo: { populate: ['ogImage'] },
  body: {
    on: {
      'body.rich-text': true,
      'body.figure': { populate: ['image'] },
      'body.figure-grid': { populate: ['images', 'captions'] },
      'body.pull-quote': true,
    },
  },
}

const authorPopulate = { avatar: true }

const seriesPopulate = { hero: true, posts: { fields: ['slug'] } }

const posts = defineCollection({
  loader: strapiLoader({ contentType: 'posts', populate: postPopulate }),
  schema: postSchema,
})

const authors = defineCollection({
  loader: strapiLoader({ contentType: 'authors', populate: authorPopulate }),
  schema: authorSchema,
})

const tags = defineCollection({
  loader: strapiLoader({ contentType: 'tags' }),
  schema: tagSchema,
})

const series = defineCollection({
  loader: strapiLoader({ contentType: 'series-entries', populate: seriesPopulate }),
  schema: seriesSchema,
})

export const collections = { posts, authors, tags, series }

export type Post = z.infer<typeof postSchema>
export type PostBody = z.infer<typeof bodyItemSchema>
export type Author = z.infer<typeof authorSchema>
export type Tag = z.infer<typeof tagSchema>
export type Series = z.infer<typeof seriesSchema>
