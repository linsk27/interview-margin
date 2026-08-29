import { Children, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Highlighter, ImageOff, Link as LinkIcon, Maximize2 } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import type { Annotation } from '../types'
import { rehypeAnnotationMarks } from '../lib/annotationPlugin'
import { remarkLearningSections } from '../lib/learningSections'
import { appPath } from '../lib/api'
import styles from './QuestionMarkdown.module.css'

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

function classNames(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ')
}

function readingDensity(node: React.ReactNode): 'short' | 'regular' | 'long' {
  const length = textFromNode(node).replace(/\s+/g, '').length
  if (length >= 180) return 'long'
  if (length >= 72) return 'regular'
  return 'short'
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const code = textFromNode(children).replace(/\n$/, '')
  const languageElement = Children.toArray(children).find(isValidElement) as React.ReactElement<{ className?: string }> | undefined
  const languageClass = languageElement?.props.className
    ?.split(/\s+/)
    .find((className) => className.startsWith('language-'))
  const language = languageClass?.slice('language-'.length) || 'text'

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  return (
    <figure className={classNames('code-block', styles.codeBlock)}>
      <figcaption className={styles.codeCaption}>
        <span className={styles.codeLanguage}>{language}</span>
        <button className={styles.copyButton} type="button" onClick={copy} aria-label="复制代码" title="复制代码">
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          <span>{copied ? '已复制' : '复制'}</span>
        </button>
      </figcaption>
      <pre className={styles.codePre}>{children}</pre>
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
    <span className={classNames('markdown-diagram', 'markdown-diagram--unavailable', styles.diagramUnavailable)} role="note">
      <ImageOff aria-hidden="true" />
      <span>{message}</span>
    </span>
  )
}

function DiagramLoadPlaceholder() {
  return (
    <span className={styles.diagramLoadPlaceholder} role="note">
      <ImageOff aria-hidden="true" />
      <span>图解暂时无法加载。</span>
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
  const settledSourceRef = useRef<string | undefined>(undefined)
  const description = alt?.trim() ?? ''

  useEffect(() => setFailed(false), [src])

  const reportSettled = useCallback(() => {
    if (settledSourceRef.current === src) return
    settledSourceRef.current = src
    onSettled?.()
  }, [onSettled, src])

  if (!description) return <DiagramPlaceholder reason="alt" />
  if (!isSafeDiagramSource(src)) return <DiagramPlaceholder reason="source" />
  return (
    <span className={classNames('markdown-diagram', styles.diagram)} role="group" aria-label="技术图解">
      <span className={styles.diagramViewport} tabIndex={0} aria-label="技术图解画布；窄屏可左右滑动">
        {failed
          ? <DiagramLoadPlaceholder />
          : (
              <img
                src={appPath(src)}
                alt={description}
                title={title}
                width={1200}
                height={720}
                loading={loading}
                decoding="async"
                onLoad={reportSettled}
                onError={() => { setFailed(true); reportSettled() }}
              />
            )}
      </span>
      <span className={styles.diagramFooter}>
        {title?.trim() && <span className={classNames('markdown-diagram__caption', styles.diagramCaption)}>{title.trim()}</span>}
        <a
          className={styles.diagramOpen}
          href={appPath(src)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`在新窗口查看高清图：${description}`}
        >
          <Maximize2 aria-hidden="true" />
          <span>查看高清图</span>
        </a>
      </span>
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
  const components = useMemo<Components>(() => ({
    pre: ({ children: content }) => <CodeBlock>{content}</CodeBlock>,
    p: ({ children: content }) => (
      <p className={styles.paragraph} data-reading-density={readingDensity(content)}>
        {content}
      </p>
    ),
    h1: ({ children: content }) => <h1 className={classNames(styles.heading, styles.heading1)}>{content}</h1>,
    h2: ({ children: content }) => <h2 className={classNames(styles.heading, styles.heading2)}>{content}</h2>,
    h3: ({ className, children: content, id }) => {
      const isLearningHeading = className?.split(/\s+/).includes('learning-section__heading')
      return (
        <h3
          className={classNames(className, isLearningHeading ? styles.learningHeading : styles.heading, !isLearningHeading && styles.heading3)}
          id={id}
        >
          {content}
        </h3>
      )
    },
    h4: ({ children: content }) => <h4 className={classNames(styles.heading, styles.heading4)}>{content}</h4>,
    ul: ({ children: content }) => <ul className={classNames(styles.list, styles.unorderedList)}>{content}</ul>,
    ol: ({ children: content }) => <ol className={classNames(styles.list, styles.orderedList)}>{content}</ol>,
    li: ({ children: content }) => <li className={styles.listItem}>{content}</li>,
    table: ({ children: content }) => (
      <div className={classNames('table-wrap', styles.tableWrap)} role="region" aria-label="数据表格" tabIndex={0}>
        <table className={styles.table}>{content}</table>
      </div>
    ),
    a: ({ href, children: content }) => (
      <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
        {content}<LinkIcon aria-hidden="true" />
      </a>
    ),
    blockquote: ({ children: content }) => (
      <blockquote className={styles.blockquote}>
        <Highlighter className={styles.blockquoteIcon} aria-hidden="true" />
        <div className={classNames('markdown-blockquote__content', styles.blockquoteContent)}>{content}</div>
      </blockquote>
    ),
    hr: () => <span className={styles.sectionBreath} data-markdown-break="true" aria-hidden="true" />,
    code: ({ className, children: content, ...props }) => (
      <code className={classNames(className, styles.inlineCode)} {...props}>{content}</code>
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
  }), [imageLoading, onDiagramSettled])

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkLearningSections]}
      rehypePlugins={[
        rehypeHighlight,
        [rehypeAnnotationMarks, { annotations }],
      ]}
      components={components}
    >
      {children}
    </ReactMarkdown>
  )
}
