export {}

// Motion is an enhancement: every animated element already renders in its
// final state without it. So the GSAP chunk waits for the load event rather
// than competing with the LCP image and the fonts for first-load bandwidth.
function boot() {
  if (document.querySelector('[data-anim]')) {
    void import('./index').then(({ register }) => register())
  }
}

if (document.readyState === 'complete') boot()
else window.addEventListener('load', boot, { once: true })
