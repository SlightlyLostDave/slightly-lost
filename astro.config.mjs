// @ts-check
import { defineConfig, fontProviders } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  site: 'https://slightlylost.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      subsets: ['latin'],
      // A weight range (space-separated) fetches the single variable file
      // covering that whole axis, instead of a separate static file per
      // discrete weight. 300-500 covers every weight the design system uses.
      weights: ['300 500'],
      styles: ['normal', 'italic'],
      fallbacks: ['serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Inter Tight',
      cssVariable: '--font-inter-tight',
      subsets: ['latin'],
      weights: ['400 600'],
      // Default styles include italic; the design system never uses it here.
      styles: ['normal'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-ibm-plex-mono',
      subsets: ['latin'],
      // No variable axis published on Fontsource for this family, so load the
      // two static weights the design system actually uses rather than the
      // full static weight range.
      weights: ['400', '500'],
      // Default styles include italic; the design system never uses it here.
      styles: ['normal'],
      fallbacks: ['monospace'],
    },
  ],
})
