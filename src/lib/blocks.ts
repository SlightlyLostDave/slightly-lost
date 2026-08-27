import type { StrapiBlockNode } from '@/content.config'

export interface SerializeBlocksOptions {
  lede?: boolean
  firstBlock?: boolean
}

const headingTags = { 2: 'h2', 3: 'h3', 4: 'h4' } as const

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function serializeInlineNode(node: StrapiBlockNode): string {
  if (node.type === 'link') {
    const href = escapeHtml(node.url ?? '')
    return `<a href="${href}">${serializeInline(node.children ?? [])}</a>`
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

function serializeInline(nodes: StrapiBlockNode[]): string {
  return nodes.map(serializeInlineNode).join('')
}

function serializeListItem(node: StrapiBlockNode): string {
  const children = node.children ?? []
  const nestedList = children.find((child) => child.type === 'list')
  const inline = children.filter((child) => child.type !== 'list')
  const nestedHtml = nestedList ? serializeBlock(nestedList, false, false) : ''
  return `<li>${serializeInline(inline)}${nestedHtml}</li>`
}

function serializeBlock(node: StrapiBlockNode, markLede: boolean, markFirst: boolean): string {
  switch (node.type) {
    case 'paragraph': {
      const attrs = `${markLede ? ' data-lede' : ''}${markFirst ? ' data-first' : ''}`
      return `<p${attrs}>${serializeInline(node.children ?? [])}</p>`
    }
    case 'heading': {
      const tag = headingTags[node.level as keyof typeof headingTags]
      if (!tag) throw new Error(`blocks serialiser: unsupported heading level "${node.level}"`)
      const attrs = markFirst ? ' data-first' : ''
      return `<${tag}${attrs}>${serializeInline(node.children ?? [])}</${tag}>`
    }
    case 'list': {
      const tag = node.format === 'ordered' ? 'ol' : 'ul'
      const items = (node.children ?? []).map(serializeListItem).join('')
      return `<${tag}>${items}</${tag}>`
    }
    case 'quote':
      return `<blockquote>${serializeInline(node.children ?? [])}</blockquote>`
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
  return blocks
    .map((block) => {
      const markLede = ledePending && block.type === 'paragraph'
      if (markLede) ledePending = false
      const markFirst = firstPending && (block.type === 'paragraph' || block.type === 'heading')
      if (markFirst) firstPending = false
      return serializeBlock(block, markLede, markFirst)
    })
    .join('')
}
