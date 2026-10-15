import { defineCollection, reference } from 'astro:content'
import { z } from 'astro/zod'
import { strapiLoader } from '@/loaders/strapi'
import { allPillars, type PillarSlug } from '@/config/pillars'
import {
  allAtlasKinds,
  allAtlasLocationPolicies,
  allAtlasStatuses,
  type AtlasKindSlug,
  type AtlasLocationPolicySlug,
  type AtlasStatusSlug,
} from '@/config/atlas'

const pillarSlugValues = allPillars.map((pillar) => pillar.slug) as [PillarSlug, ...PillarSlug[]]
const pillarSlugSchema = z.enum(pillarSlugValues)

const atlasKindValues = allAtlasKinds.map((kind) => kind.slug) as [
  AtlasKindSlug,
  ...AtlasKindSlug[],
]
const atlasKindSchema = z.enum(atlasKindValues)

const atlasStatusValues = allAtlasStatuses.map((status) => status.slug) as [
  AtlasStatusSlug,
  ...AtlasStatusSlug[],
]
const atlasStatusSchema = z.enum(atlasStatusValues)

const atlasLocationPolicyValues = allAtlasLocationPolicies.map((policy) => policy.slug) as [
  AtlasLocationPolicySlug,
  ...AtlasLocationPolicySlug[],
]
const atlasLocationPolicySchema = z.enum(atlasLocationPolicyValues)

// Same import.meta.env access pattern the loader already uses for
// STRAPI_URL/STRAPI_TOKEN. When true, the posts and atlas loaders also fetch
// drafts.
const STRAPI_PREVIEW = import.meta.env.STRAPI_PREVIEW === 'true'

const imageSchema = z.object({
  src: z.string(),
  width: z.number(),
  height: z.number(),
  alt: z.string().min(1, 'alt text is required'),
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
  region: z.string().min(1, 'region is required'),
  dek: z.string().min(1, 'dek is required').max(200),
  body: z.array(bodyItemSchema).min(1, 'a post needs at least one body block'),
  hero: imageSchema,
  gallery: z.array(imageSchema).default([]),
  featured: z.boolean().default(false),
  series: reference('series').optional(),
  seriesOrder: z.number().optional(),
  tags: z.array(reference('tags')).default([]),
  author: reference('authors').optional(),
  authorName: z.string().optional(),
  atlasEntry: reference('atlasEntries').optional(),
  fieldData: z.array(fieldDataSchema).default([]),
  sources: z.array(sourceSchema).default([]),
  seo: seoSchema.optional(),
  href: z.string(),
  readingTime: z.number(),
  photoCount: z.number(),
  status: z.enum(['draft', 'published']),
  publishedAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date(),
})

const safetyNoteSchema = z.object({
  heading: z.string().optional(),
  body: z.string().min(1, 'a safety note needs a body'),
})

// location has already been through applyLocationPolicy in the loader, so
// whatever arrives here is final. Publication is read from publishedAt rather
// than a status field, because `status` here is the atlas status.
const atlasEntrySchema = z
  .object({
    name: z.string(),
    kind: atlasKindSchema,
    status: atlasStatusSchema,
    location: z.object({ lat: z.number(), lng: z.number() }).optional(),
    locationPolicy: atlasLocationPolicySchema,
    locationNote: z.string().optional(),
    summary: z.string().min(1, 'summary is required'),
    body: z.array(bodyItemSchema).default([]),
    hero: imageSchema.optional(),
    gallery: z.array(imageSchema).default([]),
    firstVisited: z.coerce.date().optional(),
    lastVisited: z.coerce.date().optional(),
    safetyNotes: z.array(safetyNoteSchema).default([]),
    fieldData: z.array(fieldDataSchema).default([]),
    sources: z.array(sourceSchema).default([]),
    seo: seoSchema.optional(),
    href: z.string(),
    photoCount: z.number(),
    publishedAt: z.coerce.date().nullable(),
    updatedAt: z.coerce.date(),
  })
  // The loader omits the key for a withheld entry, so the key itself must be
  // absent, not merely undefined. A failure here is a policy leak.
  .refine((entry) => entry.locationPolicy !== 'withheld' || !('location' in entry), {
    message: 'a withheld atlas entry must not carry a location',
    path: ['location'],
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
  atlasEntry: { fields: ['slug'] },
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

const atlasEntryPopulate = {
  location: true,
  hero: true,
  gallery: true,
  safetyNotes: true,
  fieldData: true,
  sources: true,
  seo: { populate: ['ogImage'] },
  body: postPopulate.body,
}

const posts = defineCollection({
  loader: strapiLoader({
    contentType: 'posts',
    populate: postPopulate,
    includeDrafts: STRAPI_PREVIEW,
  }),
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

const atlasEntries = defineCollection({
  loader: strapiLoader({
    contentType: 'atlas-entries',
    populate: atlasEntryPopulate,
    includeDrafts: STRAPI_PREVIEW,
  }),
  schema: atlasEntrySchema,
})

export const collections = { posts, authors, tags, series, atlasEntries }

export type Post = z.infer<typeof postSchema>
export type PostBody = z.infer<typeof bodyItemSchema>
export type Author = z.infer<typeof authorSchema>
export type Tag = z.infer<typeof tagSchema>
export type Series = z.infer<typeof seriesSchema>
export type AtlasEntry = z.infer<typeof atlasEntrySchema>
