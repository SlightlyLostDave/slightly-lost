// Hardcoded sample content, shaped like the eventual Strapi schema (see
// docs/slightly-lost-architecture.md §4.1), standing in for Phase 2's
// content-collection loader. Swapping the loader in later should mean
// changing the import in RecentNotes.astro, not this shape.
import type { PillarSlug } from '@/config/pillars'

export interface RecentNotePost {
  pillar: PillarSlug
  title: string
  dek: string
  publishedAt: Date
  readingTime: number
  href: string
  imageAlt: string
}

export const recentNotes: RecentNotePost[] = [
  {
    pillar: 'underwater',
    title: 'The sonar return that turned out to be a bridge',
    dek: 'Two passes over the same reservoir, eleven metres down, and a structure the survey sheet does not admit to.',
    publishedAt: new Date('2026-08-04'),
    readingTime: 9,
    href: '/field-notes/underwater/sonar-return-bridge',
    imageAlt: 'Sonar return over the reservoir, placeholder pending photography',
  },
  {
    pillar: 'food',
    title: 'The chip van at the top of the Sychnant Pass',
    dek: 'Open when the weather allows it, closed when it does not. Two things on the board and both are correct.',
    publishedAt: new Date('2026-07-18'),
    readingTime: 6,
    href: '/field-notes/food/sychnant-pass-chip-van',
    imageAlt: 'Chip van at the Sychnant Pass, placeholder pending photography',
  },
  {
    pillar: 'folklore',
    title: 'Nobody in the village calls it the haunted farm',
    dek: 'They call it the old Pryce place, and they will tell you about the dog before they tell you about the light.',
    publishedAt: new Date('2026-06-29'),
    readingTime: 12,
    href: '/field-notes/folklore/old-pryce-place',
    imageAlt: 'The old Pryce place, placeholder pending photography',
  },
] satisfies RecentNotePost[]
