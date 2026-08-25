export type GsapInstance = typeof import('gsap').gsap
export type ScrollTriggerPlugin = typeof import('gsap/ScrollTrigger').ScrollTrigger

export interface MotionContext {
  gsap: GsapInstance
  ScrollTrigger: ScrollTriggerPlugin
  reducedMotion: boolean
}

export type AnimationInit = (elements: HTMLElement[], context: MotionContext) => void

export interface AnimationModule {
  init: AnimationInit
}
