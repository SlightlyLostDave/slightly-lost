import type { AnimationInit } from '@lib/motion/types'

// Keep these two in sync by hand with --header-height-tall/--header-height-solid
// in src/styles/app.css; a GSAP scroll callback needs plain JS numbers rather
// than a computed-style parse on every trigger evaluation.
const TALL_HEIGHT = 74
const SOLID_HEIGHT = 58
const BAR_SHIFT = (TALL_HEIGHT - SOLID_HEIGHT) / 2

// Unlike reveal.ts, this module still runs under prefers-reduced-motion:
// reduce. The transparent-to-solid state is functional, not decorative -
// readers still need the header to become solid once the hero is behind
// them - so reduced motion only removes the transition, never the state
// change itself. See docs/motion.md for the general (decorative) pattern
// this deliberately departs from.
export const init: AnimationInit = (elements, { gsap, ScrollTrigger, reducedMotion }) => {
  for (const headerEl of elements) {
    const fillEl = headerEl.querySelector<HTMLElement>('.header__fill')
    const barEl = headerEl.querySelector<HTMLElement>('.header__bar')
    if (!fillEl || !barEl) continue

    // A page that starts solid has nothing to transition from; the correct
    // visual is already painted by the SSR-computed inline styles.
    if (headerEl.dataset.headerState !== 'transparent') continue

    function applyState(solid: boolean, animate: boolean) {
      if (!fillEl || !barEl) return
      const tween = animate ? gsap.to : gsap.set
      // Only an animated tween has a will-change to clear. Passing clearProps:
      // undefined to gsap.set throws, which broke the reduced-motion flip.
      const cleanup = animate ? { clearProps: 'willChange' } : {}
      if (animate) gsap.set([fillEl, barEl], { willChange: 'transform' })
      tween(fillEl, {
        opacity: solid ? 1 : 0,
        scaleY: solid ? SOLID_HEIGHT / TALL_HEIGHT : 1,
        duration: animate ? 0.25 : 0,
        ease: 'power1.out',
        ...cleanup,
      })
      tween(barEl, {
        y: solid ? -BAR_SHIFT : 0,
        duration: animate ? 0.25 : 0,
        ease: 'power1.out',
        ...cleanup,
      })
      headerEl.dataset.headerState = solid ? 'solid' : 'transparent'
      // Transparent sits over the always-dark hero photograph; solid takes
      // the page's own theme again. See Header.astro.
      if (solid) delete headerEl.dataset.theme
      else headerEl.dataset.theme = 'dark'
    }

    // The header goes solid when the first section after the hero reaches
    // its bottom edge. On the homepage that section (Interstitial) slides up
    // over the pinned hero screen, so the hero's own bottom edge would arrive
    // a full screen too late and leave a transparent header over content.
    const heroEl = document.querySelector<HTMLElement>('[data-hero]')
    const afterHeroEl = heroEl?.nextElementSibling
    ScrollTrigger.create({
      trigger: afterHeroEl ?? heroEl ?? document.body,
      start: afterHeroEl
        ? `top top+=${TALL_HEIGHT}`
        : heroEl
          ? 'bottom top'
          : `top top-=${TALL_HEIGHT}`,
      onEnter: () => applyState(true, !reducedMotion),
      onLeaveBack: () => applyState(false, !reducedMotion),
    })
  }
}
