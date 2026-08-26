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
      if (animate) gsap.set([fillEl, barEl], { willChange: 'transform' })
      tween(fillEl, {
        opacity: solid ? 1 : 0,
        scaleY: solid ? SOLID_HEIGHT / TALL_HEIGHT : 1,
        duration: animate ? 0.25 : 0,
        ease: 'power1.out',
        clearProps: animate ? 'willChange' : undefined,
      })
      tween(barEl, {
        y: solid ? -BAR_SHIFT : 0,
        duration: animate ? 0.25 : 0,
        ease: 'power1.out',
        clearProps: animate ? 'willChange' : undefined,
      })
      headerEl.dataset.headerState = solid ? 'solid' : 'transparent'
    }

    const heroEl = document.querySelector<HTMLElement>('[data-hero]')
    ScrollTrigger.create({
      trigger: heroEl ?? document.body,
      start: heroEl ? 'bottom top' : `top top-=${TALL_HEIGHT}`,
      onEnter: () => applyState(true, !reducedMotion),
      onLeaveBack: () => applyState(false, !reducedMotion),
    })
  }
}
