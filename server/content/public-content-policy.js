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
    id: 'non-technical-career-script',
    pattern: /(?:自我介绍|(?:为什么|为何)(?:要|会|想)?(?:选择|应聘|投递|加入).{0,24}(?:360|公司|事业部|岗位|AI\s*应用前端)|(?:为什么|凭什么).{0,12}(?:适合|胜任|匹配).{0,8}(?:这个|该|当前)?岗位|(?:何时|什么时候|多久|是否|能否).{0,8}(?:到岗|入职)|(?:地点|城市|北京|上海|深圳|广州).{0,16}(?:意愿|到岗|搬迁|长期工作)|(?:是否|能否|可否|愿不愿意|愿意|接受).{0,12}(?:学习|转向|补齐)?\s*Go(?:\s*(?:开发|后端|服务端))?|简历.{0,12}(?:口径|怎么讲|如何讲|怎样解释|措辞)|简历(?:、|与|和).{0,20}(?:README|演示|代码).{0,20}(?:口径|完成度|一致|对齐|怎样解释)|(?:README|演示|代码).{0,20}(?:与|和).{0,12}简历|先把岗位需要的能力拆成可验证要求|表达顺序是结论、证据、个人贡献|职业规划)/iu,
    message: '包含不属于公共技术题库的求职话术',
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
