// Hardcoded sample content, shaped like the eventual Strapi schema (see
// docs/slightly-lost-architecture.md §4.1-4.2), standing in for Phase 2's
// content-collection loader. Swapping the loader in later should mean
// changing the import in the page that consumes this, not this shape.
import type { PillarSlug } from '@/config/pillars'

export interface FieldDataItem {
  label: string
  value: string
  unit?: string
  accent?: boolean
}

export interface SourceItem {
  // The future Strapi `source` component is discrete (title, author, url,
  // publication, year, note). SourceList.astro's live contract only ever
  // renders a formatted citation string, so this pre-formats it the way
  // that loader eventually will.
  citation: string
  note?: string
}

export interface SampleImage {
  src: string
  width: number
  height: number
  alt: string
}

// Points at the local Strapi dev instance's seeded uploads (npm run
// cms:dev, already seeded by cms/scripts/seed.ts) so the image pipeline has
// something real to optimize. This only builds while that server is
// running; there is no CI in this repo today, so nothing currently depends
// on it building without Strapi up. Revisit if a CI/deploy build is added.
const STRAPI_DEV_URL = 'http://localhost:1337'

export const centreHillHeadframe = {
  pillar: 'mines' as PillarSlug,
  region: 'Sudbury Basin',
  title: 'The headframe at Centre Hill is falling down slowly enough to measure',
  dek: 'Two capture sessions eleven months apart, 1,840 photographs, and a point cloud that says the north leg has moved.',
  authorName: 'Dave Beach',
  publishedAt: new Date('2026-08-14'),
  readingTime: 18,
  photoCount: 32,
  hero: {
    src: `${STRAPI_DEV_URL}/uploads/hero_background_1_d4f3404555.webp`,
    width: 2400,
    height: 1600,
    alt: 'Centre Hill headframe across the clearing, placeholder pending photography',
  } satisfies SampleImage,
  figureGridImages: [
    {
      src: `${STRAPI_DEV_URL}/uploads/hero_midground_2_98076f103c.webp`,
      width: 2400,
      height: 1600,
      alt: 'First capture session, September 2025, placeholder pending photography',
    },
    {
      src: `${STRAPI_DEV_URL}/uploads/hero_foreground_3_08dd804340.webp`,
      width: 2400,
      height: 1600,
      alt: 'Second capture session, August 2026, placeholder pending photography',
    },
  ] satisfies [SampleImage, SampleImage],
  fieldData: [
    { label: 'Coordinates', value: '46.4821 N, 81.0093 W' },
    { label: 'Elevation', value: '318', unit: 'm' },
    { label: 'Walked in', value: '2.4', unit: 'km' },
    { label: 'First visited', value: '2025.09.28' },
    { label: 'Location policy', value: 'Fuzzed', accent: true },
  ] satisfies FieldDataItem[],
  sources: [
    {
      citation:
        'Ontario Ministry of Mines, Abandoned Mines Information System, Centre Hill workings, record [AMIS ID].',
      note: 'Assessment file [AFRI number]',
    },
    {
      citation:
        'Ontario Geological Survey, Sudbury district property file, Centre Hill headframe structural notes, [OGS file number].',
    },
    {
      citation: 'Natural Resources Canada, National Air Photo Library, Sudbury Basin flight line [NAPL roll/frame ID].',
    },
  ] satisfies SourceItem[],
} as const
