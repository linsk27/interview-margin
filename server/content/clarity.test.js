import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { BUILTIN_BANKS } from './banks.js'
import { enhanceQuestionClarity } from './clarity.js'
import { inferTags, parseQuestionMarkdown } from './markdown.js'
import { normalizeReadableQuestionBody } from './readability.js'

const BASE_BODY = `**短回答：**

BM25 适合精确词，向量检索适合意思相近的表达。两路分数不是同一把尺子，不能直接相加。

**原理：**

因为两套检索器的分数量纲和分布不同，直接相加会让数值范围更大的一路主导排序。可以先按各自名次用 RRF 融合，再进行重排。

**代码 / 场景：**

例如搜索错误码时同时保留精确词和语义召回，用标注问题验证前五名是否包含正确文档。

**递进追问：**

1. **为什么？**

   因为原始分数不可直接比较。

**易错点：**

- 拍脑袋设置权重。

**参考来源：**

- [规范](https://example.com/spec)`

function firstScreen(markdown) {
  const match = markdown.match(
    /- \*\*结论：\*\* ([^\n]+)\n- \*\*为什么：\*\* ([^\n]+)\n- \*\*怎么用：\*\* ([^\n]+)/,
  )
  if (!match) return undefined
  return { conclusion: match[1], reason: match[2], application: match[3] }
}

function summaryComparable(value) {
  return value.toLowerCase().replace(/[*`\s，,。；;：:！？!?、“”‘’()[\]{}<>/\\_-]/g, '')
}

function summarySimilarity(left, right) {
  const normalizedLeft = summaryComparable(left)
  const normalizedRight = summaryComparable(right)
  if (normalizedLeft === normalizedRight) return 1
  const shorter = normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight
  const longer = shorter === normalizedLeft ? normalizedRight : normalizedLeft
  if (shorter.length >= 12 && longer.includes(shorter)) return shorter.length / longer.length >= 0.55 ? 1 : 0
  const pairs = (value) => new Set(Array.from(
    { length: Math.max(0, value.length - 1) },
    (_, index) => value.slice(index, index + 2),
  ))
  const leftPairs = pairs(normalizedLeft)
  const rightPairs = pairs(normalizedRight)
  const overlap = [...leftPairs].filter((pair) => rightPairs.has(pair)).length
  return (2 * overlap) / (leftPairs.size + rightPairs.size || 1)
}

function enhancedBuiltIn(bankId, titlePattern) {
  const bank = BUILTIN_BANKS.find((entry) => entry.id === bankId)
  expect(bank, `缺少题库 ${bankId}`).toBeDefined()
  const projectRoot = path.resolve(import.meta.dirname, '..', '..')
  const source = fs.readFileSync(path.resolve(projectRoot, bank.source), 'utf8')
  const questions = parseQuestionMarkdown(source, {
    bankId: bank.id,
    idPrefix: bank.idPrefix,
    baseTags: bank.baseTags,
    preserveIds: bank.preserveIds,
    normalizeReadability: false,
  }).flatMap((section) => section.questions)
  const question = questions.find((entry) => titlePattern.test(entry.title))
  expect(question, `${bankId} 缺少 ${titlePattern}`).toBeDefined()
  return enhanceQuestionClarity(normalizeReadableQuestionBody(question.body), {
    bankId,
    title: question.title,
  })
}

describe('question clarity enhancement', () => {
  it('turns the first screen into conclusion, reason and application with plain glossary', () => {
    const result = enhanceQuestionClarity(BASE_BODY, {
      bankId: 'frontend-ai-interviews',
      title: 'BM25 与向量召回怎样融合？',
    })

    expect(result).toContain('- **结论：**')
    expect(result).toContain('- **为什么：**')
    expect(result).toContain('- **怎么用：**')
    expect(result).toContain('**关键词翻译：**')
    expect(result).toContain('**BM25：**')
    expect(result).toContain('**RRF：**')
  })

  it('preserves authored long answers and fenced code instead of replacing details', () => {
    const source = BASE_BODY.replace(
      'BM25 适合精确词，向量检索适合意思相近的表达。两路分数不是同一把尺子，不能直接相加。',
      `先说明完整边界，这段解释需要保留。\n\n\`\`\`ts\nconst score = rankA + rankB\n\`\`\``,
    )
    const result = enhanceQuestionClarity(source, { title: '混合检索', bankId: 'frontend-ai-interviews' })

    expect(result).toContain('下面把这件事拆开说')
    expect(result).toContain('const score = rankA + rankB')
    expect(result.indexOf('const score = rankA + rankB')).toBeGreaterThan(result.indexOf('**原理：**'))
  })

  it('adds a reviewed minimal code example and local diagram only for a matching topic', () => {
    const result = enhanceQuestionClarity(BASE_BODY, {
      bankId: 'java-foundations',
      title: 'Stream 的执行模型是什么？',
    })

    expect(result).toContain('```java')
    expect(result).toContain('.filter(name -> !name.isBlank())')
    expect(result).toContain('/content/diagrams/java-foundations/stream-pipeline-v1.svg')
  })

  it('is idempotent', () => {
    const once = enhanceQuestionClarity(BASE_BODY, {
      bankId: 'frontend-ai-interviews',
      title: 'BM25 与向量召回怎样融合？',
    })
    expect(enhanceQuestionClarity(once, {
      bankId: 'frontend-ai-interviews',
      title: 'BM25 与向量召回怎样融合？',
    })).toBe(once)
  })

  it('preserves technical identifiers and generic placeholders in first-screen text', () => {
    const source = `**短回答：**\n\n查询必须带 deleted_at、created_at 和 user_id，并发送 Authorization: Bearer <token>；Java 侧返回 List<T>。\n\n**原理：**\n\n因为这些标识符有精确语义，不能在排版转换时改名。\n\n**代码 / 场景：**\n\n用一条请求和一条 SQL 验证原始字段名。`
    const result = enhanceQuestionClarity(source, { title: '技术标识符怎样保真？', bankId: 'interview' })

    expect(result).toContain('deleted_at')
    expect(result).toContain('created_at')
    expect(result).toContain('user_id')
    expect(result).toContain('Bearer <token>')
    expect(result).toContain('List<T>')
  })

  it('takes the causal explanation from the mechanism instead of repeating a definition', () => {
    const source = `**短回答：**\n\nCSR 在浏览器渲染，SSR 在请求时渲染，SSG 在构建时渲染。\n\n**原理：**\n\n因为三种方案生成 HTML 的时机不同，所以首屏速度、缓存方式和浏览器工作量也不同。\n\n**代码 / 场景：**\n\n内容长期不变时优先验证 SSG。`
    const result = enhanceQuestionClarity(source, { title: 'CSR、SSR、SSG 怎么区分？', bankId: 'frontend-engineering' })

    expect(result).toContain('**为什么：** 因为三种方案生成 HTML 的时机不同')
  })

  it('skips a bare multiple-choice result and surfaces the authored explanation', () => {
    const source = `**短回答：**\n\nNaN 不等于自己，表达式返回 false。\n\n**原理：**\n\n结果是 false。严格相等采用 Number 的比较规则，只要一侧是 NaN 就返回 false。应使用 Number.isNaN 检测。\n\n**代码 / 场景：**\n\n在控制台比较 NaN === NaN 与 Number.isNaN(NaN)。`
    const result = enhanceQuestionClarity(source, {
      title: 'NaN === NaN 的结果是什么？', bankId: 'javascript',
    })
    const summary = firstScreen(result)

    expect(summary?.reason).toContain('严格相等采用 Number 的比较规则')
    expect(summary?.reason).not.toBe('结果是 false。')
  })

  it('keeps semicolon clauses together and closes every first-screen field as a full sentence', () => {
    const source = `**短回答：**\n\n入口先校验资格；Redis 用 Lua 原子扣减；数据库再用条件更新兜底。\n\n**原理：**\n\n因为读库存和扣库存若分成两步，并发请求可能同时读到还有库存，所以必须让校验与扣减不可分割。\n\n**代码 / 场景：**\n\n压测时同时发起一百个请求；最后核对成功订单数、Redis 库存和数据库库存。`
    const result = enhanceQuestionClarity(source, { title: '秒杀怎样防超卖？', bankId: 'interview' })
    const summary = firstScreen(result)

    expect(summary?.conclusion).toBe('入口先校验资格；Redis 用 Lua 原子扣减；数据库再用条件更新兜底。')
    expect(summary?.reason).toMatch(/不可分割。$/)
    expect(summary?.application).toMatch(/数据库库存。$/)
  })

  it('clips long technical text at a complete clause without dangling colons or ellipses', () => {
    const source = `**短回答：**\n\n这条查询先按 userId 和 status 等值过滤，再按 createdAt 范围过滤，因此优先建立联合索引：\n\n**原理：**\n\n因为联合索引先缩小等值范围，再沿 createdAt 的有序区间扫描，所以能减少扫描与排序。\n\n**代码 / 场景：**\n\n在 Vite 8 项目中显式生成 manifest 和隐藏 source map，再执行 vite build，检查 dist/.vite/manifest.json 中的入口、动态 imports 和 CSS 映射；再用预览服务器测首屏请求数与压缩后体积，并记录不同构建配置下的完整结果。`
    const result = enhanceQuestionClarity(source, { title: '怎样验证索引与构建结果？', bankId: 'frontend-engineering' })
    const summary = firstScreen(result)

    expect(summary?.conclusion).toBe('这条查询先按 userId 和 status 等值过滤，再按 createdAt 范围过滤，因此优先建立联合索引。')
    expect(summary?.application).toContain('动态 imports 和 CSS 映射。')
    expect(summary?.application).not.toMatch(/imports…|执行…|[：:；;…]$/)
  })

  it('uses a distinct causal sentence instead of restating the Q64 event-loop conclusion', () => {
    const source = `**短回答：**\n\n先执行当前调用栈的同步代码，再清空微任务，最后进入后续宏任务。\n\n**原理：**\n\n典型浏览器脚本中，先执行当前任务里的全部同步代码；调用 then 只登记 Promise 反应微任务，setTimeout(0) 则登记后续定时器任务。之后才可能进行渲染并选择下一个任务，所以常见顺序是同步日志、then 回调、定时器回调。\n\n**代码 / 场景：**\n\n运行示例并记录 1、4、3、2 的输出顺序。`
    const result = enhanceQuestionClarity(source, {
      title: 'Q64：同步日志、Promise.then、setTimeout(0) 的典型执行顺序是什么？',
      bankId: 'javascript',
    })
    const summary = firstScreen(result)

    expect(summary?.reason).toContain('登记 Promise 反应微任务')
    expect(summarySimilarity(summary?.conclusion ?? '', summary?.reason ?? '')).toBeLessThan(0.72)
  })

  it('uses the correct Spring AI annotation and line-ending-aware SSE framing', () => {
    const tool = enhanceQuestionClarity(BASE_BODY, {
      title: '工具调用是怎样工作的？', bankId: 'java-ai-applications',
    })
    const stream = enhanceQuestionClarity(BASE_BODY, {
      title: 'Fetch 流式响应怎样正确分帧？', bankId: 'frontend-ai-interviews',
    })

    expect(tool).toContain('@ToolParam')
    expect(tool).not.toContain('@P(')
    expect(stream).toContain('/\\r\\n\\r\\n|\\n\\n|\\r\\r/')
  })

  it('teaches Fetch stream framing with a plain analogy, explicit terms, complete cancellation code and its dedicated diagram', () => {
    const stream = enhancedBuiltIn('frontend-ai-interviews', /Fetch 流式响应/)
    const summary = firstScreen(stream)

    expect(summary?.conclusion).toContain('一卷被随手剪开的纸带')
    expect(summary?.conclusion).toContain('半个汉字或半条 JSON')
    expect(summary?.reason).toContain('不保证每次 read() 刚好拿到')

    for (const term of [
      '**网络 chunk：**',
      '**增量解码 / TextDecoderStream：**',
      '**Buffer / 半包：**',
      '**分帧：**',
    ]) {
      expect(stream).toContain(term)
    }

    expect(stream).toContain('```ts')
    expect(stream).toContain("if (field === 'data') data.push(value)")
    expect(stream).toContain("data.join('\\n')")
    expect(stream).toContain("buffer = frames.pop() ?? ''")
    expect(stream).toContain("if (buffer.trim()) throw new Error('响应结束时仍有不完整事件')")
    expect(stream).toContain('const controller = new AbortController()')
    expect(stream).toContain("controller.abort()")
    expect(stream).toContain('reader.releaseLock()')
    expect(stream).toContain('/content/diagrams/frontend-ai/sse-framing-buffer-v1.svg')
  })

  it('keeps rendered Markdown links and images on an explicit HTTPS or same-origin allowlist', () => {
    const result = enhanceQuestionClarity(BASE_BODY, {
      title: 'Markdown、HTML 与链接怎样安全渲染？', bankId: 'frontend-ai-interviews',
    })

    expect(result).toContain('TRUSTED_LINK_HOSTS')
    expect(result).toContain("key === 'src'")
    expect(result).toContain("parsed.protocol === 'https:'")
    expect(result).not.toContain("['https:', 'http:']")
  })

  it('keeps legacy supplement practice even when the original already has a short scenario', () => {
    const source = `**先背答案：**\n\ncomputed 有缓存，watch 用于副作用。\n\n**代码 / 场景：**\n\n先观察更新次数。`
    const result = enhanceQuestionClarity(source, {
      bankId: 'interview', title: 'Q5：computed、watch、watchEffect 怎么选？',
    })

    expect(result).toContain('先观察更新次数')
    expect(result).toContain('const total = computed')
  })

  it('is idempotent for every built-in question', () => {
    const projectRoot = path.resolve(import.meta.dirname, '..', '..')
    const questions = BUILTIN_BANKS.flatMap((bank) => {
      const source = fs.readFileSync(path.resolve(projectRoot, bank.source), 'utf8')
      return parseQuestionMarkdown(source, {
        bankId: bank.id,
        idPrefix: bank.idPrefix,
        baseTags: bank.baseTags,
        preserveIds: bank.preserveIds,
        normalizeReadability: false,
      }).flatMap((section) => section.questions.map((question) => ({ ...question, bankId: bank.id })))
    })

    expect(questions).toHaveLength(762)
    for (const question of questions) {
      const normalized = normalizeReadableQuestionBody(question.body)
      const once = enhanceQuestionClarity(normalized, {
        bankId: question.bankId,
        title: question.title,
      })
      expect(once).toContain('[clarity-v2]: #')
      expect(enhanceQuestionClarity(once, {
        bankId: question.bankId,
        title: question.title,
      })).toBe(once)

      const summary = firstScreen(once)
      expect(summary, `${question.bankId}: ${question.title}`).toBeDefined()
      const fields = [summary.conclusion, summary.reason, summary.application]
      for (const field of fields) {
        expect(field, `${question.bankId}: ${question.title}`).not.toMatch(/[：:；;…]$/)
      }
      expect(summarySimilarity(summary.conclusion, summary.reason), `${question.bankId}: ${question.title}`)
        .toBeLessThan(0.72)
      expect(summarySimilarity(summary.conclusion, summary.application), `${question.bankId}: ${question.title}`)
        .toBeLessThan(0.72)
      expect(summarySimilarity(summary.reason, summary.application), `${question.bankId}: ${question.title}`)
        .toBeLessThan(0.72)
    }
  })

  it('never promotes interview provenance or source labels into the first screen', () => {
    for (const title of [/MCP 工具接口如何设计/, /多 Agent 并行/, /长连接怎样鉴权/, /WebSocket 如何防御/]) {
      const summary = firstScreen(enhancedBuiltIn('360-ai-frontend', title))
      expect(summary?.conclusion).not.toMatch(/题源|面经|来自|不冒充/)
    }

    for (const title of [/MQTT Topic 和 ACL/, /Nginx 部署和 SSE 缓冲/]) {
      const summary = firstScreen(enhancedBuiltIn('interview', title))
      expect(summary?.reason).not.toMatch(/参考来源|资料来源|OASIS|MDN|Nginx：/)
    }
  })

  it('keeps the key cause ahead of nested labels in the audited 360 questions', () => {
    expect(firstScreen(enhancedBuiltIn('360-ai-frontend', /配置流程为什么适合状态机/))?.reason)
      .toMatch(/合法状态|非法组合/)
    expect(firstScreen(enhancedBuiltIn('360-ai-frontend', /Promise\.allSettled.*批量上传/))?.reason)
      .toMatch(/单个任务失败.*不会.*提前中断/)
    expect(firstScreen(enhancedBuiltIn('360-ai-frontend', /Embedding 为什么必须做版本管理/))?.reason)
      .toMatch(/换了一套坐标系|不能和旧文档向量可靠比较/)
  })

  it('keeps editorial first screens direct and causal for audited legacy questions', () => {
    const cases = [
      ['interview', /CRUD/, /业务约束、失败后果/, /业务不变量和个人贡献/],
      ['interview', /RAG 回答不准.*定位/, /先分清是“没检索到正确资料”/, /同时取决于证据能否进入候选集/],
      ['interview', /token 预算.*上下文窗口/i, /预算要同时容纳系统提示/, /字符数只能粗估/],
      ['interview', /Agent 的工具调用闭环/, /最小 Agent 闭环/, /受控、可审计、可取消/],
      ['frontend-ai-interviews', /问题说得很省略|补成完整问题/, /保留原句并行检索/, /把检索带向错误资料/],
      ['java-backend-interviews', /Spring、Spring MVC 和 Spring Boot/, /Spring MVC 负责 Web 请求/, /通常会同时使用三者/],
      ['java-ai-applications', /Spring AI 与 LangChain4j/, /优先验证 Spring AI/, /成本来自现有技术栈/],
      ['360-ai-frontend', /SSE、WebSocket 和轮询怎么选/, /低频且允许延迟用轮询/, /不必只为流式效果引入 WebSocket/],
      ['360-ai-frontend', /Vite 和 Webpack/, /Vite 开发期用原生 ESM/, /并不是 Vite“完全不打包”/],
      ['360-ai-frontend', /AI 输出场景.*XSS/, /一律按不可信数据处理/, /一次输入过滤挡不住 XSS/],
      ['360-ai-frontend', /MCP 工具接口如何设计/, /能力发现、模型选择、受控执行/, /模型给出的工具意图带有不确定性/],
      ['360-ai-frontend', /WebSocket 如何防御 CSWSH/, /握手校验 WSS、身份与 Origin/, /慢消费者会耗尽 CPU 或内存/],
    ]

    for (const [bankId, title, conclusion, reason] of cases) {
      const summary = firstScreen(enhancedBuiltIn(bankId, title))
      expect(summary?.conclusion, `${bankId}: ${title}`).toMatch(conclusion)
      expect(summary?.reason, `${bankId}: ${title}`).toMatch(reason)
    }
  })

  it('uses the realtime security diagram where it fits and removes two partial mismatches', () => {
    expect(enhancedBuiltIn('360-ai-frontend', /长连接怎样鉴权/))
      .toContain('/content/diagrams/network-deployment/realtime-channel-guardrails-v1.svg')
    expect(enhancedBuiltIn('360-ai-frontend', /WebSocket 如何防御/))
      .toContain('/content/diagrams/network-deployment/realtime-channel-guardrails-v1.svg')
    expect(enhancedBuiltIn('360-ai-frontend', /SSE、WebSocket 和轮询怎么选/))
      .not.toContain('/content/diagrams/backend-fullstack/stream-backpressure-v1.svg')
    expect(enhancedBuiltIn('360-ai-frontend', /TCP 为什么需要三次握手/))
      .not.toContain('/content/diagrams/network-deployment/tcp-tls-handshake-v1.svg')
  })

  it('ignores marker-like headings inside code fences and preserves fenced blank lines', () => {
    const source = `**短回答：**\n\n真实答案先保留。\n\n**原理：**\n\n围栏外的原理才是章节。\n\n~~~text\n[clarity-v2]: #\n\n\n**代码 / 场景：**\n~~~\n\n**代码 / 场景：**\n\n运行代码后检查输出。`
    const result = enhanceQuestionClarity(source, { title: '围栏怎样保真？', bankId: 'interview' })

    expect(result).toContain('- **结论：**')
    expect(result).toContain('~~~text\n[clarity-v2]: #\n\n\n**代码 / 场景：**\n~~~')
    expect(result.endsWith('[clarity-v2]: #')).toBe(true)
  })

  it('does not close a four-backtick fence with a shorter three-backtick line', () => {
    const source = `**短回答：**\n\n真实答案。\n\n**原理：**\n\n真实原因。\n\n\`\`\`\`md\n\`\`\`\n[clarity-v2]: #\n**代码 / 场景：**\n\`\`\`\n\`\`\`\`\n\n**代码 / 场景：**\n\n真实场景。`
    const result = enhanceQuestionClarity(source, { title: '长围栏怎样保真？', bankId: 'interview' })

    expect(result).toContain('- **结论：**')
    expect(result).toContain('```\n[clarity-v2]: #\n**代码 / 场景：**\n```')
    expect(result.endsWith('[clarity-v2]: #')).toBe(true)
  })

  it('fills the known thin legacy questions with topic-specific mechanism, practice and sources', () => {
    const source = `**先背答案：**\n\nCSR 在浏览器渲染，SSR 在请求时渲染，SSG 在构建时渲染。`
    const once = enhanceQuestionClarity(source, {
      bankId: 'interview',
      title: 'Q14：CSR、SSR、SSG 怎么区分？',
    })

    expect(once).toContain('[clarity-supplement-14]: #')
    expect(once).toContain('**原理 / 流程：**')
    expect(once).toContain('**代码 / 场景：**')
    expect(once).toContain('**参考来源：**')
    expect(once).toContain('hydration mismatch')
    expect(enhanceQuestionClarity(once, {
      bankId: 'interview',
      title: 'Q14：CSR、SSR、SSG 怎么区分？',
    })).toBe(once)
  })

  it('does not infer unrelated tags from answer-body accidents', () => {
    expect(inferTags('怎样评估召回率？', '示例使用 TypeScript 与 WebSocket 实现。', ['前端']))
      .toEqual(['前端'])
    expect(inferTags('BM25 与向量检索怎样配合？', '', ['前端']))
      .toEqual(['前端', 'AI / RAG'])
  })

  it('does not explain ambiguous ecosystem terms with the wrong glossary meaning', () => {
    const body = (answer, mechanism = answer) => `**短回答：**\n\n${answer}\n\n**原理：**\n\n${mechanism}\n\n**代码 / 场景：**\n\n用最小示例验证边界。`

    const nodeBuffer = enhanceQuestionClarity(body(
      'Node.js Buffer 保存二进制字节，转字符串时必须指定编码。',
    ), { title: 'Buffer 与字符串有什么区别？', bankId: 'backend-fullstack' })
    expect(nodeBuffer).not.toContain('**NIO Buffer：**')

    const springScope = enhanceQuestionClarity(body(
      'Spring prototype Bean 每次获取创建实例，scoped proxy 用代理衔接不同生命周期。',
    ), { title: 'Spring Bean 作用域怎样处理？', bankId: 'java-backend-interviews' })
    expect(springScope).not.toContain('**原型链：**')
    expect(springScope).not.toContain('**Proxy：**')

    const csrf = enhanceQuestionClarity(body(
      'CSRF 会借用浏览器自动携带的 Cookie，JWT access token 也要按存储方式评估。',
    ), { title: 'CSRF 与 JWT 怎样防护？', bankId: 'frontend-engineering' })
    expect(csrf).not.toContain('**Token：**')

    const bundler = enhanceQuestionClarity(body(
      'Vite 会把动态 import 拆成独立 chunk，再由浏览器按需加载。',
    ), { title: '生产构建为什么需要 bundler？', bankId: 'frontend-engineering' })
    expect(bundler).not.toContain('**Chunk：**')

    const browserAgent = enhanceQuestionClarity(body(
      'CORS 约束浏览器 User Agent 读取跨源响应，不能代替服务端鉴权。',
    ), { title: 'CORS 与认证有什么关系？', bankId: '360-ai-frontend' })
    expect(browserAgent).not.toContain('**Agent：**')

    const react = enhanceQuestionClarity(body(
      'React 会把组件更新交给协调器，再把必要变更提交到 DOM。',
    ), { title: 'React 为什么需要协调过程？', bankId: 'react-core' })
    expect(react).not.toContain('**ReAct：**')

    const gitBase = enhanceQuestionClarity(body(
      'merge base 是两个提交的共同祖先，git rebase 会把提交重放到新的基点。',
    ), { title: 'merge base 与 rebase 有什么关系？', bankId: 'git-engineering' })
    expect(gitBase).not.toContain('**CAP / BASE：**')

    const upperGitBase = enhanceQuestionClarity(body(
      '先找 MERGE BASE，再比较两条分支各自引入的提交。',
    ), { title: '怎样用 MERGE BASE 检查分支差异？', bankId: 'git-engineering' })
    expect(upperGitBase).not.toContain('**CAP / BASE：**')

    const byteStream = enhanceQuestionClarity(body(
      'TCP 提供可靠、有序的字节流，上层协议负责识别消息边界。',
    ), { title: 'TCP 为什么会出现粘包？', bankId: 'network-deployment' })
    expect(byteStream).not.toContain('**节流：**')

    const nio = enhanceQuestionClarity(body(
      'Java NIO 的 ByteBuffer 用 position、limit 和 capacity 描述读写区间。',
    ), { title: 'NIO Buffer 怎样切换读写模式？', bankId: 'java-backend-interviews' })
    expect(nio).toContain('**NIO Buffer：**')

    const modelToken = enhanceQuestionClarity(body(
      '大模型会把输入拆成 Token，上下文窗口限制一次调用的输入输出总量。',
    ), { title: 'Token 是什么？', bankId: 'java-ai-applications' })
    expect(modelToken).toContain('**Token：**')

    const aiAgent = enhanceQuestionClarity(body(
      'AI Agent 会规划步骤、调用工具并根据观察结果决定继续还是停止。',
    ), { title: '什么是 AI Agent？', bankId: 'java-ai-applications' })
    expect(aiAgent).toContain('**Agent：**')

    const reactAgent = enhanceQuestionClarity(body(
      'ReAct 让 Agent 交替执行推理、工具调用和结果观察。',
    ), { title: 'ReAct 循环怎样停止？', bankId: 'frontend-ai-interviews' })
    expect(reactAgent).toContain('**ReAct：**')

    const distributedBase = enhanceQuestionClarity(body(
      'BASE 强调基本可用、软状态和最终一致，是分布式系统面对网络分区时的工程取舍。',
    ), { title: 'CAP 与 BASE 有什么关系？', bankId: 'database-cache' })
    expect(distributedBase).toContain('**CAP / BASE：**')

    const throttle = enhanceQuestionClarity(body(
      '节流会在事件持续触发时限制回调执行频率。',
    ), { title: '节流和防抖怎样选择？', bankId: 'frontend-engineering' })
    expect(throttle).toContain('**节流：**')

    const browserGc = enhanceQuestionClarity(body(
      'JavaScript GC 只能回收已经无法从根对象访问到的对象。',
    ), { title: '浏览器 GC 为什么没有回收闭包？', bankId: 'frontend-engineering' })
    expect(browserGc).toContain('**GC：** 运行时从仍然可访问的变量和对象出发')
    expect(browserGc).not.toContain('**GC：** JVM')

    const javaGc = enhanceQuestionClarity(body(
      'JVM GC 会从 GC Roots 出发做可达性分析。',
    ), { title: 'JVM GC 怎样判断对象可回收？', bankId: 'java-foundations' })
    expect(javaGc).toContain('**GC：** JVM 找出不再可达的对象并回收内存')
  })

  it('does not apply an integer legacy supplement to a decimal follow-up number', () => {
    const source = `**先背答案：**\n\nSSE 是长期保持的 HTTP 响应。\n\n**原理 / 流程：**\n\n代理缓冲会让增量响应最后一次性出现。`
    const result = enhanceQuestionClarity(source, {
      bankId: 'interview', title: 'Q71.1：Nginx 部署和 SSE 缓冲怎么讲？',
    })
    expect(result).not.toContain('[clarity-supplement-71]')
  })
})
