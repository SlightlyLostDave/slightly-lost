import type { AnimationInit } from '@lib/motion/types'

const DESKTOP = { back: 0.15, mid: 0.35, type: 0.55, front: 0.85 }
const MOBILE = { mid: 0.175, type: 0.275 }

// 45vh / 100vh hero height. GSAP scrub maps ScrollTrigger's 0..1 scroll
// progress linearly onto the whole timeline's progress, not onto any single
// tween's local duration -- so a duration-0.45 opacity tween at position 0,
// alongside duration-1 y-tweens, finishes at 45% of total scroll (45vh of a
// 100svh-tall trigger range), as long as no tween on this timeline exceeds
// duration 1.
const TYPE_OPACITY_DURATION = 0.45

// Matches Tailwind's default `md` breakpoint, also mirrored in
// HeroPlaceholder.astro's `hidden md:block`. Hardcoded here for the same
// reason Header.motion.ts hardcodes --header-height-*: a JS media query
// needs a plain number, not a computed-style read on every check.
const MOBILE_BREAKPOINT = 768

export const init: AnimationInit = (elements, { gsap, reducedMotion }) => {
  // Decorative, not functional (unlike Header.motion.ts's transparent to
  // solid state) -- so this follows reveal.ts's pattern: no timeline, no
  // ScrollTrigger, full stop. The DOM's resting state (no transform,
  // opacity: 1 on every layer) is already the correct final visual.
  if (reducedMotion) return

  for (const heroEl of elements) {
    const back = heroEl.querySelector<HTMLElement>('[data-hero-layer="back"]')
    const mid = heroEl.querySelector<HTMLElement>('[data-hero-layer="mid"]')
    const type = heroEl.querySelector<HTMLElement>('[data-hero-layer="type"]')
    const front = heroEl.querySelector<HTMLElement>('[data-hero-layer="front"]')
    if (!mid || !type) continue

    // A separate, nested gsap.matchMedia() local to this module -- not the
    // shared reduced-motion instance in src/lib/motion/index.ts, which only
    // toggles reducedMotion once at boot. This one rebuilds the hero's
    // timeline live whenever the viewport crosses 768px. Each condition's
    // callback runs inside its own gsap.context(); every tween/ScrollTrigger
    // created inside is auto-reverted when the condition stops matching, so
    // no manual cleanup is needed.
    const mm = gsap.matchMedia()

    mm.add(
      {
        isMobile: `(max-width: ${MOBILE_BREAKPOINT - 0.02}px)`,
        isDesktop: `(min-width: ${MOBILE_BREAKPOINT}px)`,
      },
      (context) => {
        const mobile = Boolean(context.conditions?.isMobile)
        const factors = mobile ? MOBILE : DESKTOP
        const layers = (mobile ? [mid, type] : [back, mid, type, front]).filter(
          Boolean
        ) as HTMLElement[]

        const timeline = gsap.timeline({
          defaults: { ease: 'none', duration: 1 },
          scrollTrigger: {
            trigger: heroEl,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
            invalidateOnRefresh: true,
            onToggle: (self) =>
              gsap.set(layers, { willChange: self.isActive ? 'transform' : 'auto' }),
          },
        })

        if (!mobile && back)
          timeline.to(back, { y: () => -heroEl.offsetHeight * factors.back }, 0)
        timeline.to(mid, { y: () => -heroEl.offsetHeight * factors.mid }, 0)
        timeline.to(type, { y: () => -heroEl.offsetHeight * factors.type }, 0)
        timeline.to(type, { opacity: 0, duration: TYPE_OPACITY_DURATION }, 0)
        if (!mobile && front)
          timeline.to(front, { y: () => -heroEl.offsetHeight * factors.front }, 0)
      }
    )
  }
}
