# Slightly Lost

Astro 7 static site. Tailwind v4 for styling, GSAP for scroll motion, Strapi 5 as the CMS from Phase 2 onward, MapLibre for the atlas from Phase 3 onward.

Node 26 LTS. TypeScript strict. Zod 4.

## Non-negotiables

- Performance first. Check the budget below before adding any dependency.
- No client JavaScript on a route unless that route earns it. The default is zero.
- Strapi is never in the runtime path. All content is fetched at build time.
- All motion is gated behind prefers-reduced-motion. Content renders in its final state without JavaScript, always. Never hide something in CSS and reveal it with JS.
- Never use an em dash, in code, comments, copy, or commit messages.

## Version rules, because training data is older than this stack

- Content collections live in `src/content.config.ts`, never `src/content/config.ts`. Entries have `id`, not `slug`. Use the standalone `render(entry)`, never `entry.render()`.
- Content loaders return an object with `name`, `load()`, and either `schema` or an async `createSchema()`. The schema-as-a-function form was removed in Astro 6.
- Tailwind v4 is CSS-first. There is no `tailwind.config.js`. Theme values live in an `@theme` block in `src/styles/app.css`. The `@astrojs/tailwind` integration is dead; we use `@tailwindcss/vite`.
- Zod 4, not Zod 3.
- The Astro compiler is Rust and strict. Close every tag. Nest validly. It will not repair your markup.
- `src/fetch.ts` is a reserved filename. `@astrojs/db` no longer exists.
- The Astro Fonts API is stable. Use `fontProviders` in `astro.config.mjs` and the `<Font />` component from `astro:assets`. Do not hand-write `@font-face` rules or fallback metrics.

## Styling rules

- Every colour, size, and spacing value comes from the `@theme` block in `src/styles/app.css`. That file is the only place a hex value may appear.
- Utilities go in the markup. Do not use `@apply` to build component classes. The one permitted exception is the prose base in `src/styles/prose.css`, which styles CMS-authored HTML we do not control.
- Arbitrary values in square brackets require a comment explaining why no token fits. If it happens twice, the token is missing; add it to `@theme` instead.
- Repetition is extracted into an Astro component, never into a CSS class.
- Inline SVG inherits `currentColor` and takes its colour from a text utility. This is the most common place hex values leak back into components.
- No decorative shadows. Elevation is expressed by surface colour change and a 1px hairline border.
- Rust appears once per viewport: the active state, the one link that matters, or the rule under a section label. Never for body text, never as a large fill.
- Sage is reserved for water, wreck, map, and underwater content. It is not a general secondary colour.
- Accents are surface-specific. `rust-deep` and `sage-deep` on light, `rust-glow` and `sage-glow` on dark. Using the wrong one is an accessibility bug, not a style choice.
- Hairlines are linen on light and slate on dark, chosen explicitly. There is no generic hairline token.

## Motion rules

- Every animated element carries a `data-anim` attribute naming its animation. The motion runtime maps that name to a dynamically imported module. A page with no `data-anim` attribute loads no GSAP at all.
- Animation code lives beside its component as `ComponentName.motion.ts` and is registered in `src/lib/motion/registry.ts`. Build it when you build the component, not later.
- Animate `transform` and `opacity` only. Never `top`, `left`, `width`, `height`, `background-position`, or `filter` in a scrubbed timeline.
- One ScrollTrigger per component instance driving one timeline. Never one trigger per tween.
- Set `will-change: transform` only while a trigger is active, and remove it on completion.

## Code style

- TypeScript strict, no `any`.
- Readable variable names. `atlasEntriesByKind`, not `aebk`. No single-letter names outside a tight loop index.
- Prefer composition over configuration. A component with more than five props is probably two components.
- Site configuration lives in typed modules under `src/config/`. Never hardcode navigation, pillar names, or site metadata in a component.
- Pillar slug and enum mapping lives in `src/config/pillars.ts`. Never hardcode either form anywhere else.

## Performance budget

| Metric                           | Budget                                                |
| -------------------------------- | ----------------------------------------------------- |
| LCP, mobile, throttled           | under 2.0s                                            |
| CLS                              | under 0.02                                            |
| INP                              | under 150ms                                           |
| JS, article route                | under 5kb                                             |
| JS, homepage                     | under 45kb including GSAP and ScrollTrigger           |
| Page weight, article, first load | under 900kb                                           |
| Fonts                            | 3 families, variable, subset Latin, under 360kb total |

Newsreader's variable file carries both a `wght` and an `opsz` axis; Fontsource serves those together (~132-147kb per style) with no way to request `wght` alone, which is most of that budget.

## Before finishing a task

- Run `npm run build` and confirm it passes.
- Confirm no new client JavaScript landed on a route that previously had none.
- Confirm the page still reads correctly with JavaScript disabled and with reduced motion enabled.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
