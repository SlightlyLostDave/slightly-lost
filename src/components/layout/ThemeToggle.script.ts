export {}

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

  if (meta) meta.content = goingLight ? '#f7f3ea' : '#1e1813'
  syncState(goingLight)

  try {
    if (goingLight) localStorage.setItem('theme', 'light')
    else localStorage.removeItem('theme')
  } catch {
    // Private browsing can throw on localStorage access; the toggle still
    // works for the current session, it just won't persist.
  }

  requestAnimationFrame(() => root.classList.remove('theme-swap-instant'))
})
