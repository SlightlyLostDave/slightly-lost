import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { animationRegistry, isAnimationName, type AnimationName } from './registry'
import type { MotionContext } from './types'

gsap.registerPlugin(ScrollTrigger)

export async function register(): Promise<void> {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-anim]'))
  if (elements.length === 0) return

  const groups = new Map<AnimationName, HTMLElement[]>()
  for (const element of elements) {
    const name = element.dataset.anim
    if (!name || !isAnimationName(name)) continue
    const group = groups.get(name)
    if (group) {
      group.push(element)
    } else {
      groups.set(name, [element])
    }
  }
  if (groups.size === 0) return

  const modules = await Promise.all(
    Array.from(groups, async ([name, groupElements]) => {
      const { init } = await animationRegistry[name]()
      return { init, elements: groupElements }
    }),
  )

  // Both conditions are supplied (not just `reduced`) because gsap.matchMedia
  // only invokes its callback for a condition that currently matches; with a
  // single 'reduced' key, the callback would never fire at all for the
  // default (no-preference) case, silently disabling every animation module
  // for the majority of visitors. `prefers-reduced-motion` only ever
  // resolves to one of these two values, so exactly one always matches.
  gsap.matchMedia().add(
    {
      reduced: '(prefers-reduced-motion: reduce)',
      motion: '(prefers-reduced-motion: no-preference)',
    },
    (context) => {
      const motionContext: MotionContext = {
        gsap,
        ScrollTrigger,
        reducedMotion: Boolean(context.conditions?.reduced),
      }
      for (const { init, elements: groupElements } of modules) {
        init(groupElements, motionContext)
      }
    },
  )

  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
}
