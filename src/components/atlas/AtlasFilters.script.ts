import {
  fillTemplate,
  type ATLAS_FILTER_CHANGE_EVENT,
  type AtlasFilter,
} from '@/lib/atlas-filter'

// The atlas kind filter. Every entry is already in the catalogue; this only
// marks the rows the current filter leaves out with data-filtered-out, which
// a utility on each row turns into display: none, and tells the map island.
// Its copy arrives in data attributes rather than from src/config, so the
// atlas config never ships in this script.

// Spelled as a typed literal like the map island does, so the event name
// has one source of truth without either script importing the other's code.
const filterChangeEvent: typeof ATLAS_FILTER_CHANGE_EVENT = 'atlasfilterchange'

// The query parameter that carries a filter in a link, /atlas?kind=wreck.
const KIND_PARAM = 'kind'

const root = document.querySelector<HTMLElement>('[data-atlas-index]')
if (root) setUp(root)

function setUp(root: HTMLElement) {
  const pills = [...root.querySelectorAll<HTMLButtonElement>('[data-atlas-filter-option]')]
  const count = root.querySelector<HTMLElement>('[data-atlas-count]')
  const empty = root.querySelector<HTMLElement>('[data-atlas-empty]')
  const emptyMessage = root.querySelector<HTMLElement>('[data-atlas-empty-message]')
  const showAll = empty?.querySelector<HTMLButtonElement>('button')

  function pillFor(filter: string): HTMLButtonElement | undefined {
    return pills.find((pill) => pill.dataset.atlasFilterOption === filter)
  }

  function apply(filter: AtlasFilter) {
    root.dataset.atlasFilter = filter
    for (const pill of pills) {
      pill.setAttribute('aria-pressed', String(pill.dataset.atlasFilterOption === filter))
    }

    // Read on every change rather than once, so the rows are whatever the
    // catalogue holds at the time.
    const rows = root.querySelectorAll<HTMLElement>('[data-atlas-kind]')
    let shown = 0
    for (const row of rows) {
      const filteredOut = filter !== 'all' && row.dataset.atlasKind !== filter
      row.toggleAttribute('data-filtered-out', filteredOut)
      if (!filteredOut) shown += 1
    }

    if (count?.dataset.atlasCountTemplate) {
      count.textContent = fillTemplate(count.dataset.atlasCountTemplate, {
        shown: String(shown),
        total: String(rows.length),
      })
    }

    // The empty state is filter state, not content: with JavaScript off no
    // filter can be applied, so there is never anything for it to say.
    if (empty && emptyMessage?.dataset.atlasEmptyTemplate) {
      empty.hidden = shown > 0
      emptyMessage.textContent = fillTemplate(emptyMessage.dataset.atlasEmptyTemplate, {
        kind: pillFor(filter)?.dataset.atlasFilterLabel ?? '',
      })
    }

    const url = new URL(window.location.href)
    if (filter === 'all') url.searchParams.delete(KIND_PARAM)
    else url.searchParams.set(KIND_PARAM, filter)
    history.replaceState(history.state, '', url)

    document.dispatchEvent(new CustomEvent(filterChangeEvent, { detail: { filter } }))
  }

  for (const pill of pills) {
    pill.addEventListener('click', () => {
      const filter = pill.dataset.atlasFilterOption
      if (filter) apply(filter as AtlasFilter)
    })
  }

  showAll?.addEventListener('click', () => {
    apply('all')
    pillFor('all')?.focus()
  })

  // A link can arrive filtered. Only a value with a pill is honoured, so an
  // unknown or mistyped kind falls back to everything.
  const requested = new URLSearchParams(window.location.search).get(KIND_PARAM)
  if (requested && requested !== 'all' && pillFor(requested)) apply(requested as AtlasFilter)
}
