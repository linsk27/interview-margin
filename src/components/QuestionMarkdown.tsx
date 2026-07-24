import { Children, isValidElement, useEffect, useState } from 'react'
import { Check, Copy, Highlighter, ImageOff, Link as LinkIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import type { Annotation } from '../types'
import { rehypeAnnotationMarks } from '../lib/annotationPlugin'
import { remarkLearningSections } from '../lib/learningSections'

const DIAGRAM_SOURCE = /^\/content\/diagrams\/(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9._-]*\.svg$/

export function isSafeDiagramSource(value: string | undefined): value is string {
  return typeof value === 'string' && DIAGRAM_SOURCE.test(value)
}

function textFromNode(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textFromNode).join('')
  if (isValidElement<{ children?: React.ReactNode }>(node)) return textFromNode(node.props.children)
  return ''
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const code = textFromNode(children).replace(/\n$/, '')
  const languageElement = Children.toArray(children).find(isValidElement) as React.ReactElement<{ className?: string }> | undefined
  const language = languageElement?.props.className?.replace(/^language-/, '') || 'code'

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  return (
    <figure className="code-block">
      <figcaption>
        <span>{language}</span>
        <button type="button" onClick={copy} aria-label="复制代码" title="复制代码">
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          <span>{copied ? '已复制' : '复制'}</span>
        </button>
      </figcaption>
      <pre>{children}</pre>
    </figure>
  )
}

function DiagramPlaceholder({ reason }: { reason: 'alt' | 'source' | 'load' }) {
  const message = reason === 'alt'
    ? '图解缺少文字说明，已停止加载。'
    : reason === 'source'
      ? '图解地址不受信任，已停止加载。'
      : '图解暂时无法加载。'
  return (
    <span className="markdown-diagram markdown-diagram--unavailable" role="note">
      <ImageOff aria-hidden="true" />
      <span>{message}</span>
    </span>
  )
}

function MarkdownDiagram({
  src,
  alt,
  title,
  loading,
  onSettled,
}: {
  src?: string
  alt?: string
  title?: string
  loading: 'eager' | 'lazy'
  onSettled?: () => void
}) {
  const [failed, setFailed] = useState(false)
  const description = alt?.trim() ?? ''

  useEffect(() => setFailed(false), [src])

  if (!description) return <DiagramPlaceholder reason="alt" />
  if (!isSafeDiagramSource(src)) return <DiagramPlaceholder reason="source" />
  if (failed) return <DiagramPlaceholder reason="load" />

  return (
    <span className="markdown-diagram" role="group" aria-label="技术图解">
      <img
        src={src}
        alt={description}
        title={title}
        width={1200}
        height={720}
        loading={loading}
        decoding="async"
        onLoad={onSettled}
        onError={() => { setFailed(true); onSettled?.() }}
      />
      {title?.trim() && <span className="markdown-diagram__caption">{title.trim()}</span>}
    </span>
  )
}

export function QuestionMarkdown({
  children,
  annotations = [],
  imageLoading = 'lazy',
  onDiagramSettled,
}: {
  children: string
  annotations?: Annotation[]
  imageLoading?: 'eager' | 'lazy'
  onDiagramSettled?: () => void
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkLearningSections]}
      rehypePlugins={[
        rehypeHighlight,
        [rehypeAnnotationMarks, { annotations }],
      ]}
      components={{
        pre: ({ children: content }) => <CodeBlock>{content}</CodeBlock>,
        table: ({ children: content }) => <div className="table-wrap"><table>{content}</table></div>,
        a: ({ href, children: content }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {content}<LinkIcon aria-hidden="true" />
          </a>
        ),
        blockquote: ({ children: content }) => (
          <blockquote>
            <Highlighter aria-hidden="true" />
            <div className="markdown-blockquote__content">{content}</div>
          </blockquote>
        ),
        code: ({ className, children: content, ...props }) => (
          <code className={className} {...props}>{content}</code>
        ),
        mark: ({ children: content, ...props }) => <mark {...props}>{content}</mark>,
        img: ({ src, alt, title }) => (
          <MarkdownDiagram
            src={src}
            alt={alt}
            title={title}
            loading={imageLoading}
            onSettled={onDiagramSettled}
          />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
