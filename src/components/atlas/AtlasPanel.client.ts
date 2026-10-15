import { atlas } from '@/config/atlas'

// The selection panel. From lg up it is a static column beside the map and
// this only swaps its contents. Below lg it is a bottom sheet over the map
// with three rest positions, moved with the translate property only:
//
//   peek   the card header: name, kind, and status
//   third  the lower third of the map, where a selection opens
//   full   the whole height of the map
//
// Loaded only by AtlasMap.client.ts, so it arrives with the island.

// Tailwind's lg breakpoint, where AtlasMap.astro puts the panel beside the map.
const DESKTOP_QUERY = '(min-width: 64rem)'

// A pointer that moves less than this is a tap on the handle, not a drag.
const DRAG_THRESHOLD_PX = 4

type SheetState = 'closed' | 'peek' | 'third' | 'full'
const restStates = ['peek', 'third', 'full'] as const

export interface AtlasPanel {
  // Fills the panel with the entry's card and returns its heading, or
  // undefined if the page has no card for that slug.
  show: (slug: string) => HTMLElement | undefined
  close: () => void
  isOpen: () => boolean
}

interface AtlasPanelOptions {
  // Escape inside the panel. The map decides what closing means for it.
  onEscape: () => void
}

export function createAtlasPanel(root: HTMLElement, { onEscape }: AtlasPanelOptions): AtlasPanel {
  const panel = root.querySelector<HTMLElement>('[data-atlas-panel]')
  const handle = root.querySelector<HTMLButtonElement>('[data-atlas-sheet-handle]')
  const handleLabel = root.querySelector<HTMLElement>('[data-atlas-sheet-handle-label]')
  const body = root.querySelector<HTMLElement>('[data-atlas-panel-body]')
  const emptyMessage = root.querySelector<HTMLElement>('[data-atlas-panel-empty]')
  if (!panel || !handle || !handleLabel || !body || !emptyMessage) {
    throw new Error('AtlasPanel: AtlasMap.astro markup is missing a panel element')
  }

  const desktop = window.matchMedia(DESKTOP_QUERY)
  let state: SheetState = 'closed'
  let suppressNextClick = false

  function peekHeight(): number {
    const cardHeader = body?.querySelector<HTMLElement>('[data-atlas-card-peek]')
    return (handle?.offsetHeight ?? 0) + (cardHeader?.offsetHeight ?? 0)
  }

  // How far below the top of the map the sheet sits in each state.
  function offsetFor(target: SheetState): number {
    const height = panel?.clientHeight ?? 0
    switch (target) {
      case 'closed':
        return height
      case 'peek':
        return Math.max(0, height - peekHeight())
      case 'third':
        return (height * 2) / 3
      case 'full':
        return 0
    }
  }

  function apply() {
    if (!panel || !handle || !handleLabel) return
    if (desktop.matches) {
      panel.style.translate = ''
      panel.inert = false
      return
    }
    panel.style.translate = `0 ${offsetFor(state)}px`
    panel.inert = state === 'closed'
    handle.setAttribute('aria-expanded', String(state === 'full'))
    handleLabel.textContent = state === 'full' ? atlas.map.collapsePanel : atlas.map.expandPanel
  }

  function nearestRestState(offset: number): SheetState {
    let nearest: SheetState = 'third'
    let nearestDistance = Infinity
    for (const candidate of restStates) {
      const distance = Math.abs(offsetFor(candidate) - offset)
      if (distance < nearestDistance) {
        nearest = candidate
        nearestDistance = distance
      }
    }
    return nearest
  }

  handle.addEventListener('click', () => {
    if (suppressNextClick) {
      suppressNextClick = false
      return
    }
    if (state === 'closed') return
    state = state === 'peek' ? 'third' : state === 'third' ? 'full' : 'peek'
    apply()
  })

  handle.addEventListener('pointerdown', (downEvent) => {
    if (desktop.matches || state === 'closed') return
    const startY = downEvent.clientY
    const startOffset = offsetFor(state)
    const lowestOffset = offsetFor('peek')
    let currentOffset = startOffset
    let dragged = false

    handle.setPointerCapture(downEvent.pointerId)
    panel.style.transition = 'none'
    panel.style.willChange = 'translate'

    function onMove(moveEvent: PointerEvent) {
      const delta = moveEvent.clientY - startY
      if (Math.abs(delta) > DRAG_THRESHOLD_PX) dragged = true
      currentOffset = Math.min(lowestOffset, Math.max(0, startOffset + delta))
      if (panel) panel.style.translate = `0 ${currentOffset}px`
    }

    function onEnd() {
      handle?.removeEventListener('pointermove', onMove)
      handle?.removeEventListener('pointerup', onEnd)
      handle?.removeEventListener('pointercancel', onEnd)
      if (!panel) return
      panel.style.transition = ''
      panel.style.willChange = ''
      if (dragged) {
        state = nearestRestState(currentOffset)
        suppressNextClick = true
      }
      apply()
    }

    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onEnd)
    handle.addEventListener('pointercancel', onEnd)
  })

  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    onEscape()
  })

  desktop.addEventListener('change', apply)
  window.addEventListener('resize', apply)
  apply()

  return {
    show(slug) {
      const template = root.querySelector<HTMLTemplateElement>(
        `template[data-atlas-panel-entry="${CSS.escape(slug)}"]`
      )
      if (!template) return undefined
      body.replaceChildren(template.content.cloneNode(true))
      body.scrollTop = 0
      // A new selection opens at the lower third, but a reader who has
      // dragged the sheet open further keeps it there.
      if (state === 'closed' || state === 'peek') state = 'third'
      apply()
      return body.querySelector<HTMLElement>('h2') ?? undefined
    },
    close() {
      state = 'closed'
      body.replaceChildren(emptyMessage)
      apply()
    },
    isOpen() {
      return state !== 'closed'
    },
  }
}
