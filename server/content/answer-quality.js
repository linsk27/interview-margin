const DECISION_QUESTION = /(?:是否|能否|可否|该不该|要不要|需不需要|有没有必要|值不值得|可不可以|可以不|可以不用|能不能|怎么选|如何选择)/

const VERDICT_PREFIX = /^(?:答[：:]\s*)?(?:不一定|不可以|不需要|不应该|不建议|看情况|视情况|通常|一般|未必|不是|不能|可以|需要|应该|建议|是|否|能)[。！!；;：:]?\s*/

const EXPLICIT_RATIONALE = /(?:因为|由于|原因(?:是|在于)|关键(?:是|在于)|本质(?:是|在于)|取决于|依赖(?:于)?|从而|因此|所以|否则|之所以|使得|造成|导致|源于|意味着|前提(?:是|在于)|目的(?:是|在于)|通过.{1,36}(?:实现|完成|保证|避免|校验|验证|过滤|检索|授权)|(?:会|能够|无法|不能|不再|不会).{0,24}(?:让|使|造成|导致|增加|降低|减少|避免|保证|阻止|限制|帮助|校验|检查|验证|失效|丢失|泄露|暴露|命中|读取|写入|执行|调用|生成|返回|复制|创建|回收|释放|消耗|占用|影响|改变|破坏|失败|成功)|(?:让|使|造成|导致|增加|降低|减少|避免|保证|阻止|限制|帮助|校验|检查|验证|失效|丢失|泄露|暴露|命中|读取|写入|执行|调用|生成|返回|复制|创建|回收|释放|消耗|占用|影响|改变|破坏))/

const SELECTION_ONLY_LANGUAGE = /(?:适合|建议|优先|选择|考虑|取舍|权衡|更好|更优)/
const FOLLOW_UP_SECTION = /^(?:\*\*)?(?:继续追问|递进追问)(?:[：:])?.*?(?:\*\*)?\s*$/
const FOLLOW_UP_SECTION_END = /^(?:\*\*)?(?:易错点|参考来源)(?:[：:])?(?:\*\*)?\s*$/

function plainText(value) {
  return String(value ?? '')
    .replace(/```[\s\S]*?```/g, ' code ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Detects one deliberately narrow failure mode: a binary/selection question
 * whose answer gives a verdict and only repeats suitability/recommendation
 * claims, without explaining a cause, mechanism, or observable consequence.
 *
 * This is intentionally not a generic "why" keyword check. Concise technical
 * explanations often answer why directly without using 因为/所以, and should
 * not be rejected merely for their writing style.
 */
export function isConclusionOnlyDecisionAnswer(question, answer) {
  const normalizedQuestion = plainText(question)
  const normalizedAnswer = plainText(answer)
  if (!DECISION_QUESTION.test(normalizedQuestion)) return false

  const verdict = normalizedAnswer.match(VERDICT_PREFIX)
  if (!verdict) return false

  const explanation = normalizedAnswer.slice(verdict[0].length).trim()
  if (!explanation || EXPLICIT_RATIONALE.test(explanation)) return false

  const clauses = explanation
    .split(/[。！？!?；;]/)
    .map((clause) => clause.trim())
    .filter(Boolean)

  return clauses.length > 0
    && clauses.every((clause) => SELECTION_ONLY_LANGUAGE.test(clause))
}

/** Extracts rendered numbered follow-ups without leaking later sections into
 * the final answer. It accepts the full question Markdown so release audits do
 * not have to duplicate section-boundary parsing. */
export function extractFollowUpAnswers(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n')
  const section = []
  let active = false

  for (const line of lines) {
    const value = line.trim()
    if (!active && FOLLOW_UP_SECTION.test(value)) {
      active = true
      continue
    }
    if (active && FOLLOW_UP_SECTION_END.test(value)) break
    if (active) section.push(line)
  }

  const followUps = []
  const pattern = /^\s*\d+[.)]\s+\*\*(.+?)\*\*\s*\n+([\s\S]*?)(?=^\s*\d+[.)]\s+\*\*|(?![\s\S]))/gm
  let match
  while ((match = pattern.exec(section.join('\n')))) {
    followUps.push({ question: match[1].trim(), answer: match[2].trim() })
  }
  return followUps
}
