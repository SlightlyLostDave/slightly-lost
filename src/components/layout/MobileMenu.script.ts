export {}

// The fade/translate/stagger animation is pure CSS (see the
// data-[state=open] classes and per-link transition-delay in
// MobileMenu.astro), so this script only owns the dialog mechanics: focus
// trap, Escape, focus return, and scroll lock. Kept out of the GSAP motion
// registry deliberately - MobileMenu is mounted globally on every page, and
// routing a simple fade/stagger through the registry would force every page
// to load GSAP just to support a hamburger menu most visitors never open.

const panel = document.querySelector<HTMLElement>('#mobile-menu')
const trigger = document.querySelector<HTMLButtonElement>('[data-mobile-menu-trigger]')
const closeBtn = panel?.querySelector<HTMLButtonElement>('[data-mobile-menu-close]')

if (panel && trigger && closeBtn) {
  let previouslyFocused: HTMLElement | null = null
  let savedScrollY = 0

  function lockScroll() {
    savedScrollY = window.scrollY
    document.body.classList.add('scroll-locked')
    document.body.style.top = `-${savedScrollY}px`
  }

  function unlockScroll() {
    document.body.classList.remove('scroll-locked')
    document.body.style.top = ''
    window.scrollTo(0, savedScrollY)
  }

  function getFocusable(): HTMLElement[] {
    if (!panel) return []
    return Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null)
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = getFocusable()
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function open() {
    if (!panel) return
    previouslyFocused = document.activeElement as HTMLElement | null
    panel.inert = false
    panel.dataset.state = 'open'
    lockScroll()
    document.addEventListener('keydown', onKeydown)
    trigger?.setAttribute('aria-expanded', 'true')
    closeBtn?.focus()
  }

  function close() {
    if (!panel) return
    panel.inert = true
    delete panel.dataset.state
    unlockScroll()
    document.removeEventListener('keydown', onKeydown)
    trigger?.setAttribute('aria-expanded', 'false')
    previouslyFocused?.focus()
  }

  trigger.addEventListener('click', open)
  closeBtn.addEventListener('click', close)
}
