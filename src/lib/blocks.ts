import type { StrapiBlockNode } from '@/content.config'

export interface SerializeBlocksOptions {
  lede?: boolean
  firstBlock?: boolean
  resolveHref?: (url: string) => string
}

const headingTags = { 2: 'h2', 3: 'h3', 4: 'h4' } as const

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function serializeInlineNode(node: StrapiBlockNode, resolveHref: (url: string) => string): string {
  if (node.type === 'link') {
    const href = escapeHtml(resolveHref(node.url ?? ''))
    return `<a href="${href}">${serializeInline(node.children ?? [], resolveHref)}</a>`
  }
  if (node.type === 'text') {
    let html = escapeHtml(node.text ?? '')
    if (node.code) html = `<code>${html}</code>`
    if (node.italic) html = `<em>${html}</em>`
    if (node.bold) html = `<strong>${html}</strong>`
    return html
  }
  throw new Error(`blocks serialiser: unsupported inline node type "${node.type}"`)
}

function serializeInline(nodes: StrapiBlockNode[], resolveHref: (url: string) => string): string {
  return nodes.map((node) => serializeInlineNode(node, resolveHref)).join('')
}

function serializeListItem(node: StrapiBlockNode, resolveHref: (url: string) => string): string {
  const children = node.children ?? []
  const nestedList = children.find((child) => child.type === 'list')
  const inline = children.filter((child) => child.type !== 'list')
  const nestedHtml = nestedList ? serializeBlock(nestedList, false, false, resolveHref) : ''
  return `<li>${serializeInline(inline, resolveHref)}${nestedHtml}</li>`
}

function serializeBlock(
  node: StrapiBlockNode,
  markLede: boolean,
  markFirst: boolean,
  resolveHref: (url: string) => string
): string {
  switch (node.type) {
    case 'paragraph': {
      const attrs = `${markLede ? ' data-lede' : ''}${markFirst ? ' data-first' : ''}`
      return `<p${attrs}>${serializeInline(node.children ?? [], resolveHref)}</p>`
    }
    case 'heading': {
      const tag = headingTags[node.level as keyof typeof headingTags]
      if (!tag) throw new Error(`blocks serialiser: unsupported heading level "${node.level}"`)
      const attrs = markFirst ? ' data-first' : ''
      return `<${tag}${attrs}>${serializeInline(node.children ?? [], resolveHref)}</${tag}>`
    }
    case 'list': {
      const tag = node.format === 'ordered' ? 'ol' : 'ul'
      const items = (node.children ?? []).map((item) => serializeListItem(item, resolveHref)).join('')
      return `<${tag}>${items}</${tag}>`
    }
    case 'quote':
      return `<blockquote>${serializeInline(node.children ?? [], resolveHref)}</blockquote>`
    default:
      throw new Error(`blocks serialiser: unsupported block type "${node.type}"`)
  }
}

export function serializeBlocks(
  blocks: StrapiBlockNode[],
  options: SerializeBlocksOptions = {}
): string {
  let ledePending = options.lede ?? false
  let firstPending = options.firstBlock ?? false
  const resolveHref = options.resolveHref ?? ((url: string) => url)
  return blocks
    .map((block) => {
      const markLede = ledePending && block.type === 'paragraph'
      if (markLede) ledePending = false
      const markFirst = firstPending && (block.type === 'paragraph' || block.type === 'heading')
      if (markFirst) firstPending = false
      return serializeBlock(block, markLede, markFirst, resolveHref)
    })
    .join('')
}
