import { unified } from 'unified'
import remarkParse from 'remark-parse'

export const DIAGRAM_URL_PATTERN = /^\/content\/diagrams\/(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9._-]*\.svg$/

function visit(node, callback) {
  callback(node)
  if (Array.isArray(node.children)) node.children.forEach((child) => visit(child, callback))
}

export function inspectMarkdownDiagrams(markdown) {
  const diagrams = []
  const errors = []
  let tree
  try {
    tree = unified().use(remarkParse).parse(String(markdown ?? ''))
  } catch {
    return { diagrams, errors: ['Markdown 无法解析。'] }
  }

  visit(tree, (node) => {
    if (node.type === 'html' && /<(?:img|svg)\b/i.test(node.value ?? '')) {
      errors.push('图解必须使用标准 Markdown 图片语法，不能嵌入原始 HTML/SVG。')
    }
    if (node.type !== 'image') return
    const url = String(node.url ?? '')
    const alt = String(node.alt ?? '').trim()
    const title = String(node.title ?? '').trim()
    diagrams.push({ url, alt, title })
    if (!alt) errors.push('每张图解都必须提供可读的替代文本。')
    if (!DIAGRAM_URL_PATTERN.test(url) || url.includes('..')) {
      errors.push(`不允许的图片地址：${url || '空地址'}。只允许站内 /content/diagrams/*.svg。`)
    }
  })

  return { diagrams, errors: [...new Set(errors)] }
}

export function isSafeQuestionMarkdown(markdown) {
  return inspectMarkdownDiagrams(markdown).errors.length === 0
}
