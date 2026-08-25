import type { AnimationInit } from '../types'

export const init: AnimationInit = (elements, { gsap, ScrollTrigger, reducedMotion }) => {
  if (reducedMotion) return

  for (const element of elements) {
    const isStagger = element.dataset.animStagger !== undefined
    const targets: Element[] = isStagger ? Array.from(element.children) : [element]
    if (targets.length === 0) continue

    gsap.set(targets, { y: 24, opacity: 0.9 })

    ScrollTrigger.create({
      trigger: element,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.set(targets, { willChange: 'transform' })
        gsap.to(targets, {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
          stagger: isStagger ? 0.06 : 0,
          clearProps: 'willChange',
        })
      },
    })
  }
}
