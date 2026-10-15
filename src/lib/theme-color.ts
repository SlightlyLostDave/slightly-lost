import appCss from '@styles/app.css?raw'

// The browser chrome colour for <meta name="theme-color">, which has to be a
// literal colour rather than a CSS variable. Read from app.css at build time
// so the hex values keep living in exactly one file.
function readRampColor(name: string): string {
  const match = appCss.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))
  if (!match?.[1]) throw new Error(`theme-color: --color-${name} not found in app.css`)
  return match[1]
}

export const themeColor = {
  dark: readRampColor('ink'),
  light: readRampColor('paper'),
} as const
