// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { DIAGRAM_URL_PATTERN, inspectMarkdownDiagrams } from './diagram-policy.js'
import { build360AiBankMarkdown } from './import-360-ai-bank.js'
import { parseQuestionMarkdown } from './markdown.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const source = fs.readFileSync(
  path.join(rootDir, 'docs/source/360-ai-frontend/answers.md'),
  'utf8',
)

const MARKERS = [
  '**短回答：**',
  '**原理：**',
  '**代码 / 场景：**',
  '**递进追问：**',
  '**易错点：**',
  '**参考来源：**',
]

function parseQuestions(markdown) {
  const headings = [...markdown.matchAll(/^## Q(\d+)[：:][^\n]*$/gm)]
  return headings.map((heading, index) => ({
    number: Number(heading[1]),
    body: markdown.slice(
      heading.index,
      headings[index + 1]?.index ?? markdown.length,
    ),
  }))
}

function markerBlock(body, startMarker, endMarker) {
  const start = body.indexOf(startMarker)
  const end = body.indexOf(endMarker, start + startMarker.length)
  expect(start, `${startMarker} 缺失`).toBeGreaterThanOrEqual(0)
  expect(end, `${endMarker} 缺失或顺序错误`).toBeGreaterThan(start)
  return body
    .slice(start + startMarker.length, end)
    .replace(/\r\n/g, '\n')
    .trim()
}

function assertNoOverusedIdenticalBlocks(questions, startMarker, endMarker) {
  const occurrences = new Map()
  for (const question of questions) {
    const block = markerBlock(question.body, startMarker, endMarker)
    const numbers = occurrences.get(block) ?? []
    numbers.push(question.number)
    occurrences.set(block, numbers)
  }

  const overused = [...occurrences.entries()]
    .filter(([, numbers]) => numbers.length > 3)
    .map(([block, numbers]) => ({
      questions: numbers,
      preview: block.replace(/\s+/g, ' ').slice(0, 100),
    }))

  expect(
    overused,
    `${startMarker} 存在被超过 3 题完全复用的模板块：${JSON.stringify(overused)}`,
  ).toEqual([])
}

describe('360 AI frontend bank importer', () => {
  it('deterministically publishes 72 technical questions while retaining stable source numbers', () => {
    const first = build360AiBankMarkdown(source)
    const second = build360AiBankMarkdown(source)
    const questions = parseQuestions(first)
    const topLevelHeadings = first.match(/^# (?!#).+$/gm) ?? []
    const retiredNumbers = new Set([1, 2, 3, 4, 6, 7, 8, 9, 11, 12])

    expect(second).toBe(first)
    expect(questions).toHaveLength(72)
    expect(questions.map(({ number }) => number)).toEqual(
      Array.from({ length: 77 }, (_, index) => index + 1)
        .filter((number) => !retiredNumbers.has(number))
        .concat([78, 79, 80, 81, 82]),
    )
    expect(topLevelHeadings).toHaveLength(11)
    expect(new Set(topLevelHeadings.slice(1)).size).toBe(10)
    expect(topLevelHeadings).toContain('# RAG 方案选型')
    expect(topLevelHeadings).toContain('# AI 编程工具安全')
    expect(topLevelHeadings).toContain('# 计算机与后端基础')
    expect(topLevelHeadings).toContain('# Agent 工程：MCP、Skill 与 Tool')
    expect(topLevelHeadings).toContain('# 实时通信可靠性与攻击防护')
    expect(first).not.toContain('# 操作系统进阶')
    expect(first).not.toContain('# Java 与面向对象')
  })

  it('keeps the published IDs of existing and supplemental questions stable', () => {
    const sections = parseQuestionMarkdown(build360AiBankMarkdown(source), {
      idPrefix: '360-ai-frontend',
      baseTags: [],
      preserveIds: false,
    })
    const questionsByNumber = new Map(
      sections
        .flatMap((section) => section.questions)
        .map((question) => [question.number, question]),
    )

    expect(questionsByNumber.get('5')?.id).toBe('ac6dcacc-415c-5753-823b-b0b595455a19')
    expect(questionsByNumber.get('10')?.id).toBe('dd550277-dd32-58e2-9d7c-616e9872ec88')
    expect(questionsByNumber.get('13')?.id).toBe('7116e811-18ef-502d-8274-162089d41a07')
    expect(questionsByNumber.get('77')?.id).toBe('0414bff8-fe5e-5733-b668-3ba81ce80268')
    expect(questionsByNumber.get('78')?.id).toBe('7e7ac201-c258-5149-8c18-629c0cd96f25')
    expect(questionsByNumber.get('82')?.id).toBe('44dac7a9-7a6f-580e-97d3-0dfef46aca68')
  })

  it('gives every question all six learning markers and at least two sources', () => {
    const questions = parseQuestions(build360AiBankMarkdown(source))

    for (const question of questions) {
      for (const marker of MARKERS) {
        expect(
          question.body.split(marker).length - 1,
          `Q${question.number} 的 ${marker} 数量不正确`,
        ).toBe(1)
      }

      const sourcesMarker = '**参考来源：**'
      const sources = question.body.slice(
        question.body.indexOf(sourcesMarker) + sourcesMarker.length,
      )
      const sourceUrls = new Set(
        [...sources.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((match) => match[1]),
      )
      expect(
        sourceUrls.size,
        `Q${question.number} 至少需要两个不同的 HTTPS 来源`,
      ).toBeGreaterThanOrEqual(2)
    }
  })

  it('backs the Agent and streaming questions with community evidence', () => {
    const sections = parseQuestionMarkdown(build360AiBankMarkdown(source), {
      idPrefix: '360-ai-frontend',
      baseTags: ['360', 'AI 应用前端', '一面'],
      preserveIds: false,
    })
    const questionsByNumber = new Map(
      sections
        .flatMap((section) => section.questions)
        .map((question) => [Number(question.number), question]),
    )

    for (const number of [27, 28, 29, 30, 34, 78, 79, 80, 81, 82]) {
      const question = questionsByNumber.get(number)
      expect(question, `Q${number} 应存在`).toBeDefined()
      expect(
        question?.sources.some((item) => item.kind === 'community-interview'),
        `Q${number} 应保留可核验社区题源`,
      ).toBe(true)
    }

    expect(questionsByNumber.get(78)?.title).toContain('MCP、Tool Calling 与 Skill')
    expect(questionsByNumber.get(81)?.title).toContain('鉴权')
    expect(questionsByNumber.get(82)?.title).toContain('CSWSH')
  })

  it('keeps audited short answers independently understandable', () => {
    const questions = new Map(
      parseQuestions(build360AiBankMarkdown(source))
        .map((question) => [question.number, question.body]),
    )
    const short = (number) => markerBlock(
      questions.get(number),
      '**短回答：**',
      '**原理：**',
    )

    expect(short(14)).toMatch(/状态表示.*事件表示.*守卫条件.*副作用/s)
    expect(short(15)).toMatch(/表单说明书.*依赖.*异步校验.*后端/s)
    expect(short(20)).toMatch(/关键词检索.*向量检索.*融合.*评测/s)
    expect(short(21)).toMatch(/只看名次.*不直接相加.*原始分数/s)
    expect(short(22)).toMatch(/避免重复.*只能整理已经召回/s)
    expect(short(23)).toMatch(/资料有没有被找回.*回答.*延迟/s)
    expect(short(24)).toMatch(/坐标.*长度相同.*不能.*旧文档/s)
    expect(short(25)).toMatch(/数字指纹.*不能证明.*语义.*权限/s)
    expect(short(43)).toMatch(/IndexedDB.*outbox.*lastSeq/s)
    expect(short(57)).toMatch(/没有统一实现.*Python asyncio.*Go goroutine/s)
    expect(short(61)).toMatch(/同步遍历两个链表.*carry.*进位/s)
    expect(short(62)).toMatch(/无序.*Set.*已排序.*快慢指针.*key/s)
    expect(questions.get(63)).toMatch(/每轮指针变化.*循环不变量/s)
    expect(short(70)).toMatch(/Cookie.*sessionStorage.*localStorage.*IndexedDB/s)
    expect(short(70)).not.toContain('注册流程使用')
    expect(short(76)).toMatch(/CSR.*SSR.*SSG.*hydration mismatch/s)
  })

  it('uses direct primary references for audited mechanisms', () => {
    const questions = new Map(
      parseQuestions(build360AiBankMarkdown(source))
        .map((question) => [question.number, question.body]),
    )
    const expectedReference = new Map([
      [14, 'https://stately.ai/docs/machines'],
      [15, 'https://json-schema.org/learn/getting-started-step-by-step'],
      [20, 'https://docs.weaviate.io/weaviate/concepts/search/hybrid-search'],
      [21, 'https://doi.org/10.1145/1571941.1572114'],
      [22, 'https://www.cs.cmu.edu/~jgc/publication/The_Use_MMR_Diversity_Based_LTMIR_1998.pdf'],
      [23, 'https://arxiv.org/abs/2309.15217'],
      [24, 'https://qdrant.tech/documentation/concepts/collections/'],
      [25, 'https://csrc.nist.gov/pubs/fips/180-4/upd1/final'],
      [38, 'https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering'],
      [43, 'https://html.spec.whatwg.org/multipage/server-sent-events.html'],
      [48, 'https://www.rfc-editor.org/info/rfc9111'],
      [50, 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'],
      [52, 'https://www.rfc-editor.org/info/rfc7519'],
      [54, 'https://www.rfc-editor.org/info/rfc1034'],
      [57, 'https://docs.python.org/3/library/asyncio-task.html'],
      [58, 'https://docs.kernel.org/mm/page_tables.html'],
      [59, 'https://opendatastructures.org/ods-python/2_Array_Based_Lists.html'],
      [60, 'https://leetcode.com/problems/linked-list-cycle-ii/'],
      [61, 'https://leetcode.com/problems/add-two-numbers/'],
      [62, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set'],
      [63, 'https://leetcode.com/problems/reverse-linked-list/'],
      [66, 'https://leetcode.com/problems/lru-cache/'],
      [70, 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API'],
      [75, 'https://go.dev/ref/spec#Go_statements'],
      [76, 'https://react.dev/reference/react-dom/client/hydrateRoot'],
      [77, 'https://opentelemetry.io/docs/specs/semconv/gen-ai/'],
    ])

    for (const [number, url] of expectedReference) {
      expect(questions.get(number), `Q${number} 应存在`).toContain(`](${url})`)
    }

    for (const number of expectedReference.keys()) {
      const references = questions.get(number).slice(
        questions.get(number).indexOf('**参考来源：**'),
      )
      expect(references, `Q${number} 不应再继承无关 MCP 来源`).not.toContain(
        'https://modelcontextprotocol.io/docs/learn/architecture',
      )
    }
  })

  it('publishes only generic, resolved learning content', () => {
    const markdown = build360AiBankMarkdown(source)
    const questions = parseQuestions(markdown)

    expect(markdown).not.toMatch(/\[(?:请[^\]]*填写[^\]]*|真实|如果真实)[^\]]*\]/)
    expect(markdown).not.toMatch(/我叫[\p{Script=Han}]{2,4}|(?:大学|学院).{0,20}2026\s*届/u)
    expect(markdown).not.toMatch(/ContextForge|广州深圳|只有在真实|校验日期/u)
    expect(markdown).not.toMatch(/自我介绍|为什么选择 360|异地求职|地点与到岗意愿/u)
    expect(markdown).not.toContain('不能只停留在定义')
    expect(questions[0].number).toBe(5)
    expect(questions[0].body).toContain('为什么使用 RAG')
    expect(questions[1].number).toBe(10)
    expect(questions[1].body).toContain('AI 编程工具')

    for (const question of questions) {
      const shortAnswer = markerBlock(question.body, '**短回答：**', '**原理：**')
      expect(
        shortAnswer,
        `Q${question.number} 的短回答不应再嵌套口述 blockquote`,
      ).not.toMatch(/^\s*>/m)
    }
  })

  it('keeps audited short answers beginner-first and maps them to direct technical sources', () => {
    const questions = new Map(
      parseQuestions(build360AiBankMarkdown(source))
        .map((question) => [question.number, question.body]),
    )
    const short = (number) => markerBlock(questions.get(number), '**短回答：**', '**原理：**')
    const mechanism = (number) => markerBlock(questions.get(number), '**原理：**', '**代码 / 场景：**')

    expect(short(13)).toContain('默认 ATT MTU 为 23 byte')
    expect(short(17)).toContain('标准化设备坐标（NDC）')
    expect(short(36)).toContain('完整链路分四层')
    expect(short(37)).not.toContain('```')
    expect(short(39)).toContain('只让页面不再显示文字')
    expect(short(44)).toContain('主要差别在更新模型')
    expect(short(51)).toContain('CORS 主要限制跨源脚本能否读取响应')
    expect(short(56)).toContain('2xx 表示成功')
    expect(short(65)).not.toContain('```')
    expect(short(71)).not.toMatch(/RAG|tenant|chunk|embedding/i)
    expect(mechanism(71)).not.toMatch(/RAG|tenant|chunk|embedding/i)

    const expectedSources = new Map([
      [5, 'https://platform.openai.com/docs/guides/retrieval'],
      [10, 'https://docs.github.com/en/copilot/responsible-use/copilot-code-review'],
      [13, 'https://www.bluetooth.com/specifications/specs/core-specification/'],
      [17, 'https://threejs.org/manual/en/cameras.html'],
      [19, 'https://platform.openai.com/docs/guides/retrieval'],
      [27, 'https://docs.langchain.com/oss/javascript/langgraph/workflows-agents'],
      [28, 'https://platform.openai.com/docs/guides/function-calling'],
      [30, 'https://openai.github.io/openai-agents-js/guides/guardrails/'],
      [33, 'https://arxiv.org/abs/2005.14165'],
      [36, 'https://flask.palletsprojects.com/en/stable/patterns/streaming/'],
      [37, 'https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/decode'],
      [39, 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController'],
      [40, 'https://html.spec.whatwg.org/multipage/server-sent-events.html'],
      [41, 'https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame'],
      [42, 'https://spec.commonmark.org/'],
      [44, 'https://vuejs.org/guide/extras/reactivity-in-depth.html'],
      [51, 'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html'],
      [53, 'https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work'],
      [56, 'https://www.rfc-editor.org/rfc/rfc8446'],
      [65, 'https://developer.mozilla.org/en-US/docs/Glossary/Debounce'],
      [68, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain'],
      [71, 'https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html'],
      [73, 'https://www.rfc-editor.org/rfc/rfc9457'],
      [74, 'https://flask.palletsprojects.com/en/stable/reqcontext/'],
    ])

    for (const [number, url] of expectedSources) {
      expect(questions.get(number), `Q${number} 应引用直接技术来源`).toContain(`](${url})`)
    }
  })

  it('references exactly seven existing diagrams through safe local paths', () => {
    const markdown = build360AiBankMarkdown(source)
    const inspection = inspectMarkdownDiagrams(markdown)
    const uniqueUrls = [...new Set(inspection.diagrams.map(({ url }) => url))]
    const diagramRoot = path.resolve(rootDir, 'public/content/diagrams')

    expect(inspection.errors).toEqual([])
    expect(inspection.diagrams).toHaveLength(7)
    expect(uniqueUrls).toHaveLength(7)

    for (const diagram of inspection.diagrams) {
      expect(DIAGRAM_URL_PATTERN.test(diagram.url)).toBe(true)
      expect(diagram.url).not.toContain('..')
      expect(diagram.alt.trim().length).toBeGreaterThan(8)

      const filename = path.resolve(rootDir, 'public', `.${diagram.url}`)
      expect(
        filename.startsWith(`${diagramRoot}${path.sep}`),
        `${diagram.url} 必须位于 public/content/diagrams 内`,
      ).toBe(true)
      expect(fs.existsSync(filename), `${diagram.url} 不存在`).toBe(true)
    }
  })

  it('does not mass-reuse identical follow-up or pitfall templates', () => {
    const questions = parseQuestions(build360AiBankMarkdown(source))

    assertNoOverusedIdenticalBlocks(
      questions,
      '**递进追问：**',
      '**易错点：**',
    )
    assertNoOverusedIdenticalBlocks(
      questions,
      '**易错点：**',
      '**参考来源：**',
    )
  })
})
