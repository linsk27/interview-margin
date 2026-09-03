const FENCED_BLOCK_RE = /^~~~([^\r\n]*)\r?\n([\s\S]*?)^~~~[ \t]*$/gm

const LINE_COMMENT_LANGUAGES = new Set([
  'js', 'javascript', 'jsx', 'ts', 'typescript', 'tsx', 'java', 'c', 'cpp', 'c++',
])
const HASH_COMMENT_LANGUAGES = new Set([
  'bash', 'sh', 'shell', 'python', 'py', 'yaml', 'yml', 'nginx', 'conf', 'ini',
])
const SQL_COMMENT_LANGUAGES = new Set(['sql', 'lua'])
const MARKUP_COMMENT_LANGUAGES = new Set(['html', 'vue', 'xml'])
const BLOCK_COMMENT_LANGUAGES = new Set(['css', 'scss', 'less'])

const BACKEND_OUTCOMES = new Map([
  [1, '创建成功能从 `Location` 继续访问订单；取消动作拥有自己的记录，重复请求可以命中同一取消申请，而不是再执行一次。'],
  [2, '版本仍是 `profile-v7` 时更新成功并返回新 ETag；若别人已改成 v8，同一旧请求得到 412，不会覆盖对方的数据。'],
  [3, '第一次请求创建 `pay_901`；网络超时后携带同一 key 重试仍返回 `pay_901`，支付渠道只收到一次扣款意图。'],
  [4, '前端可依据 `/username` 精确定位输入框，运维可用 `traceId` 查日志；用户响应里不会出现堆栈、SQL 或内部路径。'],
  [6, '旧客户端继续读取 `name`，新客户端逐步迁移到拆分字段；确认旧字段调用量归零后，才在 v2 安全移除。'],
  [7, '生成客户端能获得稳定的 `Order` 类型；若实现把 404 偷换成 200 或改坏响应结构，契约检查会在上线前失败。'],
  [8, '超过 10 MiB 的连接会被立即终止；合法文件只进入隔离区并返回 `scanning`，扫描通过前不能被公开下载。'],
  [11, '`scheduled` 一定先打印，a/b 的完成顺序由 I/O 决定；若任一回调执行长计算，其他连接的回调延迟也会同步升高。'],
  [15, '控制台依次证明“一个字符不等于一个字节”，以及 `subarray` 会共享内存：原 Buffer 的首字节最终也变成 9。'],
  [16, 'CPU 计算移出主线程后，HTTP 连接仍能被及时处理；当 4 个 worker 和队列都满时，请求明确失败或降级，而不是无限排队。'],
  [18, '终止开始后 `/ready` 先返回 503，负载均衡不再分配新请求；旧请求与任务在 25 秒内排空，超时才由兜底强制退出。'],
  [19, '已登记的后台失败会留下业务指标并由调用方决定恢复；真正未处理的 rejection 会触发 fatal 日志和有序停机，不让未知状态继续服务。'],
  [20, '若 event-loop 指标正常而 trace 显示大部分时间都在等数据库连接，瓶颈就在 SQL、长事务或池容量，而不在 Node CPU。'],
  [21, '同一套代码可分别创建测试与生产应用，数据库扩展绑定各自实例；单纯导入模块不会意外启动服务或连接生产资源。'],
  [22, '用户模块无需改动即可挂到 `/api/v1/users`，测试也能只注册这一块；路由拆分不会顺带复制初始化逻辑。'],
  [23, '`g.user` 只在当前请求内可见并在结束后释放；后台任务只拿可序列化的 userId，因此不会引用已经失效的 request context。'],
  [26, '订单或审计任一步失败时两者都回滚；全部成功才一次提交，所以不会出现“订单存在但审计缺失”的半完成状态。'],
  [27, '接口很快返回 202 和 `job_901`，相同幂等键再次提交仍拿到这个任务；耗时导出由 worker 完成并通过 `/jobs/job_901` 查询结果。'],
  [29, '空文件或超限请求被拒绝；合规文件使用服务端 UUID 写入隔离目录并返回 202，只有扫描通过后才进入可下载存储。'],
  [30, 'route 只处理输入和 HTTP 状态，service 在一个事务内完成授权、库存与审计；单元测试可独立替换 repository 验证业务分支。'],
  [31, '有合法 Session 只代表“知道你是谁”；访问其他租户订单时查询仍得不到记录，说明授权必须落实到每次资源读取。'],
  [32, '服务端 Session 可在改密后立即批量失效；自包含 JWT 默认会一直有效到 `exp`，除非额外引入版本或撤销检查。'],
  [33, '正确密码验证为 true；当内存或迭代参数落后于新策略时，同一次成功登录会生成新哈希，salt 仍由库自动管理。'],
  [42, '令牌桶可立即放行最初 10 个突发请求，此后约每秒恢复 2 个；漏桶始终按 2 req/s 输出，多余请求只能排队或被拒绝。'],
  [43, '统一重试责任后，单次业务调用最多尝试 3 次且不超过共享 deadline；不再出现三层各重试 3 次导致的 27 倍下游流量。'],
  [51, '客户端按事件类型分别累积正文与引用，收到 `done` 才把消息标为完成；断线时可依据最后 event id 续接并去重。'],
  [52, '只有 `invoices.read` 的会话会在执行前拒绝删除；即使权限足够，高风险调用也先返回待确认动作，不会由模型自行落地。'],
])

function plainText(value) {
  return String(value ?? '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function shorten(value, maxLength = 76) {
  const text = plainText(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).replace(/[，、；：,。.!?？\s]+$/u, '')}…`
}

function firstSentence(value, maxLength = 118) {
  const text = plainText(value)
  const end = text.search(/[。！？!?]/u)
  const sentence = end >= 0 ? text.slice(0, end + 1) : text
  return shorten(sentence, maxLength)
}

function commentFor(language, focus) {
  const lang = String(language).trim().toLowerCase()
  if (LINE_COMMENT_LANGUAGES.has(lang)) return `// 示例重点：${focus}`
  if (HASH_COMMENT_LANGUAGES.has(lang)) return `# 示例重点：${focus}`
  if (SQL_COMMENT_LANGUAGES.has(lang)) return `-- 示例重点：${focus}`
  if (MARKUP_COMMENT_LANGUAGES.has(lang)) return `<!-- 示例重点：${focus} -->`
  if (BLOCK_COMMENT_LANGUAGES.has(lang)) return `/* 示例重点：${focus} */`
  return undefined
}

function scanFences(value) {
  return [...String(value).matchAll(new RegExp(FENCED_BLOCK_RE.source, FENCED_BLOCK_RE.flags))]
}

function annotateFences(value, focus) {
  let blockNumber = 0
  return String(value).replace(FENCED_BLOCK_RE, (whole, language, body) => {
    blockNumber += 1
    const numberedFocus = blockNumber > 1 ? `第 ${blockNumber} 段：${focus}` : focus
    const comment = commentFor(language, numberedFocus)
    const cleanBody = String(body).replace(/^\s*\n/u, '').replace(/\s+$/u, '')
    if (comment) return `~~~${language}\n${comment}\n${cleanBody}\n~~~`
    return `> **示例注解：** ${numberedFocus}\n\n~~~${language}\n${cleanBody}\n~~~`
  })
}

function outcomeFor(bankId, entry, trailing) {
  if (trailing) return trailing
  if (bankId === 'backend-fullstack') return BACKEND_OUTCOMES.get(entry.number)
  return undefined
}

function strengthenEntry(entry, bankId) {
  const raw = String(entry.example ?? '').trim()
  const fences = scanFences(raw)
  if (fences.length === 0) {
    throw new Error(`${bankId} Q${entry.number}: 示例缺少可观察的代码、命令或协议片段`)
  }

  const firstFence = fences[0]
  const lastFence = fences.at(-1)
  const firstFenceStart = firstFence.index
  const lastFenceEnd = lastFence.index + lastFence[0].length
  const scenario = raw.slice(0, firstFenceStart).trim()
  const exampleBody = raw.slice(firstFenceStart, lastFenceEnd).trim()
  const trailing = raw.slice(lastFenceEnd).trim()
  const result = outcomeFor(bankId, entry, trailing)

  if (plainText(scenario).length < 24) {
    throw new Error(`${bankId} Q${entry.number}: 示例场景缺少具体前提或观察目标`)
  }
  if (!result || plainText(result).length < 18) {
    throw new Error(`${bankId} Q${entry.number}: 示例缺少具体对照结果`)
  }

  // 场景本身已经是围栏中要观察的目标；直接复用比重复一遍长标题更像代码旁注。
  const focus = shorten(scenario)
  return {
    ...entry,
    example: [
      `**示例场景：** ${scenario}`,
      `**观察目标：** 围绕“${entry.title}”，重点验证：${firstSentence(entry.mechanism)}`,
      annotateFences(exampleBody, focus),
      `**对照结果：** ${result}`,
    ].join('\n\n'),
  }
}

function assertPlatformExamples(entries, bankId) {
  for (const entry of entries) {
    const example = String(entry.example ?? '')
    if (!example.includes('**示例场景：**') || !example.includes('**对照结果：**')) {
      throw new Error(`${bankId} Q${entry.number}: 示例阅读顺序不完整`)
    }
    for (const [, language, body] of scanFences(example)) {
      if (commentFor(language, '检查')) {
        if (!/(?:\/\/|#|<!--|\/\*|--)[^\n]*示例重点/u.test(body)) {
          throw new Error(`${bankId} Q${entry.number}: ${language || 'plain'} 围栏缺少中文示例重点注释`)
        }
      }
    }
  }
}

/**
 * 只增强后端、数据库和网络题库的已有具体案例，不改变题目知识内容。
 * 每题固定为“场景 → 带注释的可观察片段 → 对照结果”，方便读者先复现再理解。
 */
export function strengthenPlatformExamples(entries, { bankId }) {
  const enhanced = entries.map((entry) => strengthenEntry(entry, bankId))
  assertPlatformExamples(enhanced, bankId)
  return enhanced
}
