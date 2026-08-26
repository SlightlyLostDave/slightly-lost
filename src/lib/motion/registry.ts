import type { AnimationModule } from './types'

export const animationRegistry = {
  reveal: () => import('./animations/reveal'),
  header: () => import('../../components/layout/Header.motion'),
} satisfies Record<string, () => Promise<AnimationModule>>

export type AnimationName = keyof typeof animationRegistry

export function isAnimationName(value: string): value is AnimationName {
  return value in animationRegistry
}
