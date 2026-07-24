const FORBIDDEN_360_PUBLIC_PATTERNS = [
  {
    id: 'candidate-identity',
    pattern: /(?:我叫|候选人[：:]\s*)[\p{Script=Han}]{2,4}(?:[，,\s]|$)/u,
    message: '包含可识别的候选人姓名',
  },
  {
    id: 'candidate-education',
    pattern: /[\p{Script=Han}]{2,16}(?:大学|学院).{0,24}(?:专业|20\d{2}\s*届|毕业生)/u,
    message: '包含候选人学校或毕业信息',
  },
  {
    id: 'candidate-employment',
    pattern: /我有.{0,12}(?:段|次).{0,12}实习|最近在.{0,32}(?:公司|集团|小程序).{0,48}(?:负责|实习)/u,
    message: '包含候选人私人履历或雇主信息',
  },
  {
    id: 'private-project-name',
    pattern: /\bContextForge\b/iu,
    message: '包含可关联到候选人的私人项目名称',
  },
  {
    id: 'private-location-script',
    pattern: /简历.{0,20}(?:广州|深圳|北京)|(?:广州|深圳|北京).{0,24}(?:到岗|搬迁|长期工作)|只有在真实.+?时使用|如果真实接受|按真实安排给出的时间/iu,
    message: '包含私人求职地点或条件式口径',
  },
  {
    id: 'unresolved-personalization',
    pattern: /\[(?:请|待|列出|补充|替换|真实|如果真实)[^\]\n]{0,120}\]/iu,
    message: '包含未完成的个性化占位符',
  },
]

export function inspect360PublicContent(content) {
  return FORBIDDEN_360_PUBLIC_PATTERNS.flatMap((rule) => {
    const match = rule.pattern.exec(content)
    if (!match) return []
    const start = Math.max(0, match.index - 36)
    const end = Math.min(content.length, match.index + match[0].length + 36)
    return [{
      id: rule.id,
      message: rule.message,
      match: match[0],
      snippet: content.slice(start, end).replace(/\s+/g, ' ').trim(),
    }]
  })
}

export function assert360PublicContentSafe(content, label = '360 AI 公共题库') {
  const violations = inspect360PublicContent(content)
  if (!violations.length) return
  const details = violations
    .map((item) => `${item.id}: ${item.message}（${item.snippet}）`)
    .join('\n')
  throw new Error(`${label}未通过公共内容门禁：\n${details}`)
}
