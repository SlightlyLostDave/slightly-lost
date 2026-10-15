// The site theme as client code sees it. Dark is the default and carries no
// attribute; light is opt-in via data-theme="light" on <html>, set by the
// head script in Base.astro and by ThemeToggle.script.ts.
export type SiteTheme = 'dark' | 'light'

// Dispatched on document by ThemeToggle.script.ts after every swap, so an
// island can react without polling or observing the attribute itself.
// Islands import this module for types only and spell the name as a literal
// typed `typeof THEME_CHANGE_EVENT`, which the compiler checks: a value import
// would make it a chunk shared with ThemeToggle.script.ts, and every page
// would then fetch that chunk for one string.
export const THEME_CHANGE_EVENT = 'themechange'

export interface ThemeChangeDetail {
  theme: SiteTheme
}

declare global {
  interface DocumentEventMap {
    [THEME_CHANGE_EVENT]: CustomEvent<ThemeChangeDetail>
  }
}
