export interface SiteAuthor {
  name: string
  location: string
}

export interface SiteConfig {
  name: string
  tagline: string
  description: string
  url: string
  author: SiteAuthor
  socialImage: string
  copyright: string
  footerClosingLine: string
}

export const site = {
  name: 'Slightly Lost',
  tagline: 'Long form writing and photography about places that were left behind.',
  description:
    'Slightly Lost is long form writing and photography about abandoned mines, drowned villages, and the places history left behind in Ontario and beyond.',
  url: 'https://slightlylost.com',
  author: {
    name: 'Dave Beach',
    location: 'Ontario, Canada',
  },
  socialImage: '/social/default.jpg',
  copyright: `© ${new Date().getFullYear()} Dave Beach. All photographs by the author.`,
  footerClosingLine: 'Go carefully. Most of these places are not safe.',
} as const satisfies SiteConfig
