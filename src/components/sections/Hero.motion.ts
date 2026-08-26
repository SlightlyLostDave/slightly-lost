import type { AnimationInit } from '@lib/motion/types'

const DESKTOP = { back: 0.15, mid: 0.35, type: 0.55, front: 0.85 }
const MOBILE = { mid: 0.175, type: 0.275 }

// Must match Hero.astro's h-[140svh] stage: one pinned 100svh screen (also
// data-hero-screen's own h-svh) plus a 40svh scroll runway. Kept as plain
// numbers, synced by hand with Hero.astro's comment -- same reason
// --header-height-tall/Header.motion.ts stay in sync by hand: a GSAP
// scroll callback needs a plain number, not a computed-style read on every
// trigger evaluation, and a Tailwind arbitrary value can't be imported into
// a .ts module.
const SCREEN_VH = 100
const RUNWAY_VH = 40
const STAGE_VH = SCREEN_VH + RUNWAY_VH

// GSAP scrub maps ScrollTrigger's 0..1 scroll progress across the trigger's
// FULL range -- the whole 140svh stage, not just one screen -- onto the
// timeline's 0..1 duration. SCREEN_VH / STAGE_VH is the fraction of that
// full scroll range equal to exactly one screen height, so this duration
// preserves the original "headline fully faded after one screen of scroll"
// pacing regardless of how RUNWAY_VH is tuned, as long as no tween on this
// timeline exceeds duration 1.
const TYPE_OPACITY_DURATION = SCREEN_VH / STAGE_VH

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
    const screen = heroEl.querySelector<HTMLElement>('[data-hero-screen]')
    const back = heroEl.querySelector<HTMLElement>('[data-hero-layer="back"]')
    const mid = heroEl.querySelector<HTMLElement>('[data-hero-layer="mid"]')
    const type = heroEl.querySelector<HTMLElement>('[data-hero-layer="type"]')
    const front = heroEl.querySelector<HTMLElement>('[data-hero-layer="front"]')
    if (!screen || !mid || !type) continue

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

        // screen.offsetHeight, not heroEl.offsetHeight: heroEl (the stage)
        // is now 140svh tall to provide scroll runway for the pin, but the
        // 0.15/0.35/0.55/0.85 factors are fractions of ONE screen. screen
        // is the sticky h-svh box, so its offsetHeight is a stable
        // one-viewport reference no matter how long the runway is tuned.
        if (!mobile && back)
          timeline.to(back, { y: () => -screen.offsetHeight * factors.back }, 0)
        timeline.to(mid, { y: () => -screen.offsetHeight * factors.mid }, 0)
        timeline.to(type, { y: () => -screen.offsetHeight * factors.type }, 0)
        timeline.to(type, { opacity: 0, duration: TYPE_OPACITY_DURATION }, 0)
        if (!mobile && front)
          timeline.to(front, { y: () => -screen.offsetHeight * factors.front }, 0)
      }
    )
  }
}
