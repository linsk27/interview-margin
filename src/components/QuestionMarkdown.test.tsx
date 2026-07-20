import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSafeDiagramSource, QuestionMarkdown } from './QuestionMarkdown'

afterEach(cleanup)

describe('QuestionMarkdown diagrams', () => {
  it('renders a trusted same-origin SVG with reserved dimensions and an accessible caption', () => {
    const onDiagramSettled = vi.fn()
    render(
      <QuestionMarkdown imageLoading="eager" onDiagramSettled={onDiagramSettled}>
        {'![Vue 依赖追踪流程](/content/diagrams/vue-core/dependency-tracking-v1.svg "读取时 track，写入时 trigger")'}
      </QuestionMarkdown>,
    )

    const image = screen.getByRole('img', { name: 'Vue 依赖追踪流程' })
    expect(image).toHaveAttribute('src', '/content/diagrams/vue-core/dependency-tracking-v1.svg')
    expect(image).toHaveAttribute('width', '1200')
    expect(image).toHaveAttribute('height', '720')
    expect(image).toHaveAttribute('loading', 'eager')
    expect(screen.getByText('读取时 track，写入时 trigger')).toBeTruthy()

    fireEvent.load(image)
    expect(onDiagramSettled).toHaveBeenCalledOnce()
  })

  it.each([
    'https://images.example/diagram.svg',
    '//images.example/diagram.svg',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'blob:https://example.test/id',
    '/content/diagrams/../secret.svg',
    '/content/diagrams/vue-core/not-svg.png',
    '/other/diagrams/vue-core.svg',
  ])('rejects an untrusted image source: %s', (source) => {
    const { unmount } = render(<QuestionMarkdown>{`![不可信图片](${source})`}</QuestionMarkdown>)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('图解地址不受信任，已停止加载。')).toBeTruthy()
    unmount()
  })

  it('does not request a diagram whose alt text is empty', () => {
    render(<QuestionMarkdown>{'![](/content/diagrams/javascript/event-loop-v1.svg)'}</QuestionMarkdown>)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('图解缺少文字说明，已停止加载。')).toBeTruthy()
  })

  it('replaces a failed trusted image with a readable fallback', () => {
    const onDiagramSettled = vi.fn()
    render(
      <QuestionMarkdown onDiagramSettled={onDiagramSettled}>
        {'![事件循环](/content/diagrams/javascript/event-loop-v1.svg)'}
      </QuestionMarkdown>,
    )
    fireEvent.error(screen.getByRole('img', { name: '事件循环' }))
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('图解暂时无法加载。')).toBeTruthy()
    expect(onDiagramSettled).toHaveBeenCalledOnce()
  })

  it('keeps raw HTML inert instead of treating inline SVG as content', () => {
    render(<QuestionMarkdown>{'<svg onload="alert(1)"><script>alert(2)</script></svg>'}</QuestionMarkdown>)
    expect(document.querySelector('.markdown-body svg')).toBeNull()
    expect(screen.getByText(/<svg onload=/)).toBeTruthy()
  })

  it('exposes the same strict path predicate for validation and tests', () => {
    expect(isSafeDiagramSource('/content/diagrams/network-deployment/tcp-tls-handshake-v1.svg')).toBe(true)
    expect(isSafeDiagramSource('/content/diagrams/network-deployment/%2e%2e/secret.svg')).toBe(false)
    expect(isSafeDiagramSource('/content/diagrams/Network/diagram.svg')).toBe(false)
  })
})
