// The one place the reduced-motion media query is spelled. The GSAP runtime
// reads it through gsap.matchMedia() in index.ts, and the atlas map, which
// is not part of that runtime, reads it through window.matchMedia. Kept in
// its own module so importing it never pulls GSAP into a bundle.
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
export const NO_MOTION_PREFERENCE_QUERY = '(prefers-reduced-motion: no-preference)'
