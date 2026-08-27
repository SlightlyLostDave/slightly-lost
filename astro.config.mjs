// @ts-check
import { defineConfig, fontProviders } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'

// astro.config.mjs runs directly under Node, before Vite's env pipeline is
// live, so import.meta.env (what the loader and everything else use) isn't
// populated yet. loadEnv reads the same .env files Vite would. STRAPI_URL is
// already required by the loader (src/loaders/strapi.ts throws if unset);
// trusting the same value here means there is exactly one place per
// environment that decides which Strapi host is allowed, instead of a
// second hardcoded dev/prod pair that can drift out of sync.
const { STRAPI_URL } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '')

if (!STRAPI_URL) {
  throw new Error('astro.config.mjs: STRAPI_URL is not set, needed to allow Strapi media in the image pipeline')
}

const strapiHostname = new URL(STRAPI_URL).hostname

// https://astro.build/config
export default defineConfig({
  site: 'https://slightlylost.com',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap()],
  image: {
    domains: [strapiHostname],
  },
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
