import type { AnimationInit } from '@lib/motion/types'

export const init: AnimationInit = (elements, { gsap, ScrollTrigger, reducedMotion }) => {
  if (reducedMotion) return

  for (const element of elements) {
    const targets = Array.from(element.querySelectorAll<HTMLElement>('[data-count-to]'))
    if (targets.length === 0) continue

    ScrollTrigger.create({
      trigger: element,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        for (const target of targets) {
          const finalValue = Number(target.dataset.countTo)
          const counter = { value: 0 }
          gsap.set(target, { willChange: 'contents' })
          gsap.to(counter, {
            value: finalValue,
            duration: 1.2,
            ease: 'power2.out',
            onUpdate: () => {
              target.textContent = String(Math.round(counter.value))
            },
            onComplete: () => {
              target.textContent = String(finalValue)
              gsap.set(target, { clearProps: 'willChange' })
            },
          })
        }
      },
    })
  }
}
