import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSafeDiagramSource, QuestionMarkdown } from './QuestionMarkdown'

afterEach(cleanup)

describe('QuestionMarkdown learning sections', () => {
  it('renders recognized labels as semantic sections with real headings', () => {
    const { container } = render(
      <QuestionMarkdown>{[
        '**先背答案：** Vue3 使用 Proxy 代理对象。',
        '',
        '**关键词翻译：**',
        '',
        '- **Proxy**：对象操作的代理层。',
        '',
        '**原理 / 流程：** 读取时收集依赖，写入时触发更新。',
        '',
        '**代码 / 场景：**',
        '',
        '```js',
        'state.name = "Lin"',
        '```',
        '',
        '**易错点：**',
        '',
        '- Proxy 不代表一定更快。',
      ].join('\n')}</QuestionMarkdown>,
    )

    const answer = container.querySelector('#learning-section-answer')
    expect(answer).toHaveClass('learning-section', 'learning-section--answer')
    expect(answer).toHaveAttribute('data-learning-kind', 'answer')
    expect(answer).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('heading', { level: 3, name: '先背答案' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: '关键词翻译' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: '原理 / 流程' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: '代码 / 场景' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: '易错点' })).toBeTruthy()
    expect(screen.getByText('Vue3 使用 Proxy 代理对象。')).toBeTruthy()
  })

  it('progressively discloses follow-ups and sources with closed details', () => {
    const { container } = render(
      <QuestionMarkdown>{[
        '**递进追问：**',
        '',
        '1. **为什么需要清理旧依赖？**',
        '',
        '   避免无效更新。',
        '',
        '**参考来源：**',
        '',
        '- [官方文档](https://example.com)',
      ].join('\n')}</QuestionMarkdown>,
    )

    const followups = container.querySelector('#learning-section-followups details')
    const sources = container.querySelector('#learning-section-sources details')
    expect(followups).not.toHaveAttribute('open')
    expect(sources).not.toHaveAttribute('open')
    expect(followups?.querySelector('summary')).toHaveTextContent('展开追问与回答')
    expect(sources?.querySelector('summary')).toHaveTextContent('展开参考来源')
    expect(screen.getByRole('heading', { level: 3, name: '递进追问' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: '参考来源' })).toBeTruthy()
    expect(screen.getByText('避免无效更新。')).toBeTruthy()
  })

  it('keeps unknown bold-label formats unchanged', () => {
    const { container } = render(
      <QuestionMarkdown>{'**当前项目事实：** 仍按普通 Markdown 展示。'}</QuestionMarkdown>,
    )

    expect(container.querySelector('.learning-section')).toBeNull()
    expect(screen.getByText('当前项目事实：', { selector: 'strong' })).toBeTruthy()
    expect(screen.getByText(/仍按普通 Markdown 展示/)).toBeTruthy()
  })

  it('keeps annotation marks working inside a transformed section', () => {
    const annotations = [{
      id: 'annotation-1',
      questionId: 'q-1',
      quote: 'Proxy 代理对象',
      note: '重点',
      color: 'yellow' as const,
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z',
    }]
    const { container } = render(
      <QuestionMarkdown annotations={annotations}>
        {'**短回答：** Vue3 使用 Proxy 代理对象。'}
      </QuestionMarkdown>,
    )

    expect(container.querySelector('#learning-section-answer mark')).toHaveTextContent('Proxy 代理对象')
  })

  it('keeps every paragraph in a multi-paragraph quote inside one grid content wrapper', () => {
    const { container } = render(
      <QuestionMarkdown>{[
        '**短回答：**',
        '',
        '> 第一段先给结论。',
        '>',
        '> 第二段补充证据。',
        '>',
        '> 第三段说明边界。',
      ].join('\n')}</QuestionMarkdown>,
    )

    const quote = container.querySelector('#learning-section-answer blockquote')
    const content = quote?.querySelector(':scope > .markdown-blockquote__content')
    expect(quote?.children).toHaveLength(2)
    expect(content?.querySelectorAll(':scope > p')).toHaveLength(3)
    expect(content).toHaveTextContent('第一段先给结论。')
    expect(content).toHaveTextContent('第二段补充证据。')
    expect(content).toHaveTextContent('第三段说明边界。')
  })
})

describe('QuestionMarkdown code blocks', () => {
  it('shows only the normalized language name in the code toolbar', () => {
    render(<QuestionMarkdown>{['```jsx', 'const view = <main />', '```'].join('\n')}</QuestionMarkdown>)

    expect(screen.getByText('jsx', { selector: '.code-block figcaption > span' })).toBeTruthy()
    expect(screen.queryByText('hljs language-jsx')).toBeNull()
    expect(screen.getByRole('button', { name: '复制代码' })).toBeTruthy()
  })
})

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
