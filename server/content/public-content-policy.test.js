// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  assert360PublicContentSafe,
  inspect360PublicContent,
} from './public-content-policy.js'

describe('360 public content policy', () => {
  it('allows ordinary technical learning content', () => {
    const content = [
      'RAG 为什么需要分块、引用与检索评测？',
      'Go 的 context 如何传递取消信号？',
      'README 应记录本地启动命令、依赖版本和故障排查步骤。',
      '服务部署地点如何影响跨区域延迟？',
      '不要把“计划实现”或“简历描述”说成已通过代码和测试验证。',
    ].join('\n')

    expect(inspect360PublicContent(content)).toEqual([])
    expect(() => assert360PublicContentSafe(content)).not.toThrow()
  })

  it.each([
    ['candidate identity', '我叫张三，是某学院学生。', 'candidate-identity'],
    ['private project', '打开 ContextForge 演示完整链路。', 'private-project-name'],
    ['private location script', '只有在真实接受北京时使用。', 'private-location-script'],
    ['unfinished placeholder', '这个月新增了 [列出真实新增模块]。', 'unresolved-personalization'],
  ])('blocks %s before public export', (_label, content, ruleId) => {
    expect(inspect360PublicContent(content)).toEqual([
      expect.objectContaining({ id: ruleId }),
    ])
    expect(() => assert360PublicContentSafe(content)).toThrow('未通过公共内容门禁')
  })

  it.each([
    ['self introduction', '请用 90 秒做自我介绍，为什么你适合这个岗位？'],
    ['role motivation', '为什么选择 AI 应用前端，而不是普通前端？'],
    ['company motivation', '为什么选择 360 和 PC 安全与办公事业部？'],
    ['arrival intention', '你什么时候能到岗，是否愿意长期在北京工作？'],
    ['Go learning intention', '是否接受学习 Go，并逐步转向服务端开发？'],
    ['resume narrative', '简历与 GitHub README 的完成度怎样解释？'],
    ['generic interview template', '先把岗位需要的能力拆成可验证要求，再说明个人贡献。'],
    ['career planning', '未来三年的职业规划是什么？'],
  ])('blocks non-technical career script: %s', (_label, content) => {
    expect(inspect360PublicContent(content)).toEqual([
      expect.objectContaining({ id: 'non-technical-career-script' }),
    ])
    expect(() => assert360PublicContentSafe(content)).toThrow('non-technical-career-script')
  })
})
