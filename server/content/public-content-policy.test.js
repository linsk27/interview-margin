// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  assert360PublicContentSafe,
  inspect360PublicContent,
} from './public-content-policy.js'

describe('360 public content policy', () => {
  it('allows a generic interview learning framework', () => {
    const content = '如何组织 90 秒技术岗位自我介绍？\n只保留能力主线、项目证据和真实边界。'

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
})
