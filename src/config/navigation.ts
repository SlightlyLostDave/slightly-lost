export interface NavLink {
  label: string
  href: string
  external?: boolean
}

export interface FooterLinkGroup {
  heading: string
  links: readonly NavLink[]
}

export interface NavigationConfig {
  primary: readonly NavLink[]
  footer: readonly FooterLinkGroup[]
}

const primary = [
  { label: 'Field Notes', href: '/field-notes' },
  { label: 'Atlas', href: '/atlas' },
  { label: 'Guides', href: '/guides' },
  { label: 'Logbooks', href: '/logbooks' },
  { label: 'About', href: '/about' },
] as const

const [fieldNotesLink, atlasLink, guidesLink, logbooksLink] = primary

export const navigation = {
  primary,
  footer: [
    {
      heading: 'Read',
      links: [fieldNotesLink, atlasLink, guidesLink, logbooksLink],
    },
    {
      heading: 'Elsewhere',
      links: [
        { label: 'Instagram', href: 'https://instagram.com/slightlylostdave', external: true },
        // TODO: replace with the real Substack URL
        { label: 'Substack', href: 'https://slightlylost.substack.com', external: true },
        { label: 'RSS', href: '/rss.xml' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      heading: 'Also Mine',
      links: [
        { label: 'DaveBeach.me', href: 'https://davebeach.me', external: true },
        { label: 'Northern Venture', href: 'https://northernventure.ca', external: true },
      ],
    },
  ],
} as const satisfies NavigationConfig
