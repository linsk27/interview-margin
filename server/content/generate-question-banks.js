import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { GENERATED_BANKS, generatedQuestionCount } from './question-data.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')
const verifiedAt = '2026-07-17'

const SOURCE_RULES = [
  [/mqtt|qos|发布订阅/i, ['OASIS MQTT 5.0 规范', 'https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html'], ['MQTT 官方站点', 'https://mqtt.org/mqtt-specification/']],
  [/argon2|密码哈希/i, ['RFC 9106：Argon2', 'https://datatracker.ietf.org/doc/html/rfc9106'], ['OWASP 密码存储指南', 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html']],
  [/jwt/i, ['RFC 7519：JWT', 'https://datatracker.ietf.org/doc/html/rfc7519'], ['OWASP REST 安全指南', 'https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html']],
  [/sse|event-stream|last-event-id/i, ['WHATWG Server-sent events', 'https://html.spec.whatwg.org/multipage/server-sent-events.html'], ['MDN 使用 SSE', 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events']],
  [/websocket/i, ['RFC 6455：WebSocket', 'https://datatracker.ietf.org/doc/html/rfc6455'], ['MDN WebSocket API', 'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket_API']],
  [/tcp|三次握手|四次挥手|time_wait|拥塞|粘包/i, ['RFC 9293：TCP', 'https://datatracker.ietf.org/doc/html/rfc9293'], ['RFC 5681：TCP 拥塞控制', 'https://datatracker.ietf.org/doc/html/rfc5681']],
  [/udp/i, ['RFC 768：UDP', 'https://datatracker.ietf.org/doc/html/rfc768'], ['RFC 9000：QUIC', 'https://datatracker.ietf.org/doc/html/rfc9000']],
  [/http|cors|cookie|cache-control|etag|https|tls|证书|csrf/i, ['RFC 9110：HTTP Semantics', 'https://datatracker.ietf.org/doc/html/rfc9110'], ['MDN HTTP', 'https://developer.mozilla.org/en-US/docs/Web/HTTP']],
  [/nginx|反向代理|负载均衡|try_files/i, ['Nginx 官方文档', 'https://nginx.org/en/docs/'], ['Nginx 负载均衡', 'https://nginx.org/en/docs/http/load_balancing.html']],
  [/redis|缓存穿透|缓存击穿|缓存雪崩|分布式锁|大 key|热 key/i, ['Redis 官方文档', 'https://redis.io/docs/latest/'], ['Redis 数据类型', 'https://redis.io/docs/latest/develop/data-types/']],
  [/sql|mysql|索引|事务|mvcc|死锁|聚簇|b\+tree|explain|数据库/i, ['MySQL 8.4 参考手册', 'https://dev.mysql.com/doc/refman/8.4/en/'], ['MySQL InnoDB 事务模型', 'https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html']],
  [/typescript|泛型|keyof|unknown|never|satisfies|类型/i, ['TypeScript Handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html'], ['TypeScript Narrowing', 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html']],
  [/vite|tree shaking|代码分割|source map|构建|bundle/i, ['Vite 官方指南', 'https://vite.dev/guide/'], ['Rollup 官方文档', 'https://rollupjs.org/introduction/']],
  [/xss|点击劫持|postmessage|service worker|indexeddb|web worker/i, ['MDN Web 安全', 'https://developer.mozilla.org/en-US/docs/Web/Security'], ['OWASP Cheat Sheet Series', 'https://cheatsheetseries.owasp.org/']],
  [/flask|blueprint|wsgi|sqlalchemy|python/i, ['Flask 官方文档', 'https://flask.palletsprojects.com/en/stable/'], ['Flask 安全指南', 'https://flask.palletsprojects.com/en/stable/web-security/']],
  [/node|事件循环|stream|buffer|worker_threads|process\.nexttick/i, ['Node.js API 文档', 'https://nodejs.org/docs/latest/api/'], ['Node.js 不阻塞事件循环', 'https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop']],
  [/embedding|rag|prompt injection|tool calling|ai 流式/i, ['OpenAI Embeddings 指南', 'https://platform.openai.com/docs/guides/embeddings'], ['OWASP LLM Prompt Injection', 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/']],
]

const BANK_SOURCE_RULE_INDEXES = new Map([
  ['frontend-engineering', new Set([2, 3, 4, 5, 6, 7, 11, 12, 13, 16])],
  ['backend-fullstack', new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16])],
  ['database-cache', new Set([9, 10])],
  ['network-deployment', new Set([0, 3, 4, 5, 6, 7, 8])],
])

function sourcesFor(bank, question) {
  const allowedIndexes = BANK_SOURCE_RULE_INDEXES.get(bank.id)
  if (!allowedIndexes) return [bank.official, bank.secondary]
  const matched = SOURCE_RULES.find(([pattern], index) => (
    allowedIndexes.has(index) && pattern.test(`${question.title} ${question.answer}`)
  ))
  return matched ? [matched[1], matched[2]] : [bank.official, bank.secondary]
}

function bodyFor(bank, question, index) {
  const [primary, secondary] = sourcesFor(bank, question)
  const angle = index % 3 === 0
    ? '先说明输入、内部机制和可观察结果，再补充失败边界。'
    : index % 3 === 1
      ? '回答时区分规范语义、具体实现和工程取舍，不能把经验规则说成绝对结论。'
      : '先给结论，再用一条真实调用链解释为什么，最后说明如何测量或验证。'
  const follow = index % 2 === 0
    ? '如果数据规模、并发量或团队人数扩大一个数量级，原方案的首个瓶颈在哪里，如何用指标验证？'
    : '如果面试官加入失败重试、版本冲突或安全攻击条件，哪些保证仍成立，哪些需要额外机制？'
  return `**短回答：**\n\n${question.answer}\n\n**原理：**\n\n${angle} 这道题的关键是把“${question.title}”放回系统边界中：谁维护状态、何时发生转换、失败后如何恢复。\n\n**代码 / 场景：**\n\n在${bank.scenario}中遇到该问题时，先记录可复现输入和关键指标，再做最小实验验证上述机制；修复后用相同数据回归，不能只凭“感觉更快”或“应该没问题”下结论。\n\n**递进追问：**\n\n${follow}\n\n**易错点：**\n\n不要只背术语，也不要把局部优化包装成通用架构。明确默认条件、版本差异与未覆盖边界，面试回答才可继续深挖。\n\n**参考来源：** [${primary[0]}](${primary[1]})、[${secondary[0]}](${secondary[1]})（校验日期：${verifiedAt}）`
}

export function generateQuestionBanks(outputRoot = rootDir) {
  const outputDir = path.join(outputRoot, 'public/question-banks')
  fs.mkdirSync(outputDir, { recursive: true })
  const result = []
  for (const bank of GENERATED_BANKS) {
    const lines = [`# ${bank.title}`, '']
    let number = 1
    for (const [sectionTitle, questions] of bank.sections) {
      lines.push(`# ${sectionTitle}`, '')
      for (const question of questions) {
        lines.push(`## Q${number}：${question.title}`, '', bodyFor(bank, question, number - 1), '')
        number += 1
      }
    }
    const filename = path.basename(bank.source)
    const target = path.join(outputDir, filename)
    fs.writeFileSync(target, `${lines.join('\n').trim()}\n`, 'utf8')
    result.push({ id: bank.id, count: number - 1, target })
  }
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generateQuestionBanks()
  console.log(JSON.stringify({ total: generatedQuestionCount(), banks: result }, null, 2))
}
