import type { AnimationInit } from '@lib/motion/types'

// Reduced motion is already guaranteed zero-render via the track's own
// motion-reduce:hidden class (pure CSS, no JS dependency). This early return
// just avoids the wasted ScrollTrigger creation, matching reveal.ts.
// ScrollTrigger is registered globally by src/lib/motion/index.ts before this
// module's init runs; the scrub trigger below is created via gsap.to's
// scrollTrigger config, not a direct ScrollTrigger.create call, so it isn't
// destructured from the context here.
export const init: AnimationInit = (elements, { gsap, reducedMotion }) => {
  if (reducedMotion) return

  for (const trackEl of elements) {
    const fillEl = trackEl.querySelector<HTMLElement>('.progress__fill')
    const bodyEl = document.querySelector<HTMLElement>('[data-article-body]')
    if (!fillEl || !bodyEl) continue

    gsap.to(fillEl, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: bodyEl,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onToggle: (self) => gsap.set(fillEl, { willChange: self.isActive ? 'transform' : 'auto' }),
      },
    })
  }
}
