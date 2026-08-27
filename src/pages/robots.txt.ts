import type { APIContext } from 'astro'

export function GET(context: APIContext) {
  if (!context.site) throw new Error('robots.txt: astro.config.mjs must set `site`')

  const body = `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', context.site).toString()}
`

  return new Response(body, { headers: { 'Content-Type': 'text/plain' } })
}
