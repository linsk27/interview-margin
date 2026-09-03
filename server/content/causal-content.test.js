import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

function question(relativePath, number) {
  const source = read(relativePath)
  const heading = new RegExp(`^## Q${String(number).replace('.', '\\.')}(?=：)`, 'm')
  const start = source.search(heading)
  expect(start, `${relativePath} 缺少 Q${number}`).toBeGreaterThanOrEqual(0)
  const nextHeading = source.slice(start + 3).search(/^## Q\d/m)
  return nextHeading < 0 ? source.slice(start) : source.slice(start, start + 3 + nextHeading)
}

function firstPrincipleSentence(body) {
  const marker = '**原理：**'
  expect(body).toContain(marker)
  return body
    .slice(body.indexOf(marker) + marker.length)
    .trimStart()
    .replace(/^!\[[^\n]+\]\([^\n]+\)\s*/, '')
    .replace(/^[-*]\s+/, '')
}

function shortAnswer(body) {
  const marker = '**短回答：**'
  expect(body).toContain(marker)
  return body
    .slice(body.indexOf(marker) + marker.length)
    .split(/\n\s*\n\*\*(?:原理|代码|递进追问|易错点|参考来源)/, 1)[0]
    .trim()
}

describe('抽样题的因果开头与图示匹配', () => {
  const causalQuestions = [
    ['public/question-banks/git-engineering.md', 13],
    ['public/question-banks/react-core.md', 1],
    ['public/question-banks/network-deployment.md', 10],
    ['public/question-banks/java-foundations.md', 1],
    ['public/question-banks/java-backend-interviews.md', 1],
    ['public/question-banks/java-ai-applications.md', 1],
    ['public/question-banks/360-ai-frontend.md', 21],
    ['public/question-banks/360-ai-frontend.md', 78],
    ['public/interview.md', 78],
    ['public/question-banks/frontend-ai-interviews.md', 35],
    ['public/question-banks/360-ai-frontend.md', 58],
    ['public/question-banks/backend-fullstack.md', 6],
    ['public/question-banks/frontend-ai-interviews.md', 9],
    ['public/question-banks/git-engineering.md', 15],
    ['public/question-banks/git-engineering.md', 39],
    ['public/question-banks/java-ai-applications.md', 8],
    ['public/question-banks/java-ai-applications.md', 19],
    ['public/question-banks/java-backend-interviews.md', 47],
    ['public/question-banks/react-core.md', 21],
    ['public/question-banks/vue-core.md', 6],
  ]

  it.each(causalQuestions)('%s Q%s 的原理首句直接解释因果', (relativePath, number) => {
    expect(firstPrincipleSentence(question(relativePath, number))).toMatch(/^因为/)
  })

  it('网络排障示例让路由与 curl 使用同一目标 IP', () => {
    const body = question('public/question-banks/network-deployment.md', 1)
    expect(body).toContain('ip route get "$target_ip"')
    expect(body).toContain('--resolve "$target_host:443:$target_ip"')
    expect(body).not.toContain('ip route get 203.0.113.10')
  })

  it('ContextForge SSE 题使用分帧图，不再误用 Node Writable 背压图', () => {
    const body = question('public/interview.md', 78)
    expect(body).toContain('/content/diagrams/frontend-ai/sse-framing-buffer-v1.svg')
    expect(body).not.toContain('/content/diagrams/backend-fullstack/stream-backpressure-v1.svg')
    expect(body).toContain('UTF-8')
    expect(body).toContain('文本 `buffer`')
  })

  it('前端 AI Q35 使用任务稳定性专图，并避免命中长连接安全图规则', () => {
    const body = question('public/question-banks/frontend-ai-interviews.md', 35)
    expect(body).toContain('/content/diagrams/frontend-ai/idempotent-stream-control-v1.svg')
    expect(body).toContain('Idempotency')
    expect(body).toContain('sequence')
    expect(body).not.toMatch(/^## Q35：流式请求.*背压.*并发控制/m)
  })

  it('MCP Q78 的原理不再把题源说明误当成概念原因', () => {
    const generated = question('public/question-banks/360-ai-frontend.md', 78)
    const canonical = read('server/content/360-ai-supplementals.js')
    expect(generated).not.toContain('这道题来自小红书与牛客')
    expect(canonical).not.toContain('这道题来自小红书与牛客')
    expect(firstPrincipleSentence(generated)).toMatch(/^因为.*必须分层/s)
  })

  it.each([
    ['public/question-banks/database-cache.md', 2, /叶子页.*链接.*区间起点/s],
    ['public/question-banks/360-ai-frontend.md', 16, /单个任务失败.*不会.*提前中断/s],
    ['public/question-banks/360-ai-frontend.md', 20, /会漏掉不同类型的问题/s],
    ['public/question-banks/360-ai-frontend.md', 33, /同一个.*预测下一个 Token.*训练和推理/s],
    ['public/question-banks/git-engineering.md', 36, /不会随普通 clone.*--no-verify/s],
    ['public/question-banks/java-foundations.md', 53, /序列化.*ORM.*框架绑定/s],
    ['public/question-banks/react-core.md', 35, /新建对象.*state.*Context/s],
    ['public/question-banks/vue-core.md', 26, /循环引用.*SSR 水合.*生命周期/s],
    ['public/question-banks/vue-core.md', 36, /客户端第一次.*服务端.*不一样/s],
    ['public/question-banks/vue-core.md', 41, /getter.*this.*响应式代理/s],
  ])('%s Q%s 把白话原因放在原理开头', (relativePath, number, expected) => {
    expect(firstPrincipleSentence(question(relativePath, number))).toMatch(expected)
  })

  it('CopyOnWriteArrayList 首答直接说明写时复制、无锁读取和适用边界', () => {
    const answer = shortAnswer(question('public/question-banks/java-foundations.md', 57))
    expect(answer).toMatch(/写入.*复制底层数组/)
    expect(answer).toMatch(/读取不用争写锁/)
    expect(answer).toMatch(/读取远多于修改/)
    expect(answer).not.toMatch(/这是.*进阶题/)
  })
})

describe('新增 SVG 是可访问且无脚本的站内图', () => {
  const assets = [
    'public/content/diagrams/frontend-ai/sse-framing-buffer-v1.svg',
    'public/content/diagrams/frontend-ai/idempotent-stream-control-v1.svg',
  ]

  it.each(assets)('%s 包含可访问描述且不含可执行内容', (relativePath) => {
    const svg = read(relativePath)
    expect(svg).toMatch(/<svg[^>]+width="1200"[^>]+height="720"/)
    expect(svg).toMatch(/role="img" aria-labelledby="title desc"/)
    expect(svg).toMatch(/<title id="title">[^<]+<\/title>/)
    expect(svg).toMatch(/<desc id="desc">[^<]+<\/desc>/)
    expect(svg).not.toMatch(/<script|<foreignObject|\son\w+=|\shref=/i)
  })
})
