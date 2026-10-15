import { THEME_CHANGE_EVENT } from '@/lib/theme'

const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle')
const label = toggle?.querySelector<HTMLElement>('.theme-toggle__label')
const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

function syncState(isLight: boolean) {
  toggle?.setAttribute('aria-pressed', String(isLight))
  if (label) label.textContent = isLight ? 'Switch to dark theme' : 'Switch to light theme'
}

syncState(document.documentElement.dataset.theme === 'light')

toggle?.addEventListener('click', () => {
  const root = document.documentElement
  const goingLight = root.dataset.theme !== 'light'

  // Suppress the browser's automatic color transition on every element
  // during the swap, so the theme change is a cut rather than a fade
  // through intermediate colors.
  root.classList.add('theme-swap-instant')

  if (goingLight) root.dataset.theme = 'light'
  else delete root.dataset.theme

  // Base.astro renders both values onto the meta from app.css at build time.
  const nextColor = goingLight ? meta?.dataset.light : meta?.dataset.dark
  if (meta && nextColor) meta.content = nextColor
  syncState(goingLight)

  try {
    if (goingLight) localStorage.setItem('theme', 'light')
    else localStorage.removeItem('theme')
  } catch {
    // Private browsing can throw on localStorage access; the toggle still
    // works for the current session, it just won't persist.
  }

  document.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: goingLight ? 'light' : 'dark' } })
  )

  requestAnimationFrame(() => root.classList.remove('theme-swap-instant'))
})
