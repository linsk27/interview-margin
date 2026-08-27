// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { extractFollowUpAnswers, isConclusionOnlyDecisionAnswer } from './answer-quality.js'

describe('answer rationale quality gate', () => {
  it('flags a decision answer that only maps options to scenarios', () => {
    expect(isConclusionOnlyDecisionAnswer(
      '上下文窗口大是否可以不用 RAG？',
      '不一定。持续更新、细粒度权限和需要引用的企业知识仍更适合 RAG；长窗口更适合少量材料的一次性综合分析。',
    )).toBe(true)
  })

  it('accepts a concise mechanism even without the word because', () => {
    expect(isConclusionOnlyDecisionAnswer(
      '负载因子是否越小越好？',
      '不是。过小会让桶数组大量空置并增加内存与缓存压力，需要结合规模和冲突特征权衡。',
    )).toBe(false)
  })

  it('accepts a direct technical explanation instead of requiring causal filler', () => {
    expect(isConclusionOnlyDecisionAnswer(
      'Hash 索引能否用于范围查询？',
      '不能。哈希结构不保留业务键的整体顺序，无法自然支持范围扫描与按键排序。',
    )).toBe(false)
  })

  it('does not apply the decision heuristic to definition questions', () => {
    expect(isConclusionOnlyDecisionAnswer(
      '什么是上下文窗口？',
      '上下文窗口是一次模型调用能够处理的 Token 总容量。',
    )).toBe(false)
  })

  it('stops the final follow-up before pitfalls and source sections', () => {
    const markdown = `**递进追问：**

1. **为什么要限制候选数量？**

   候选过多会挤占上下文并增加重排成本。

2. **上下文窗口大是否可以不用 RAG？**

   不一定。持续更新的企业知识更适合 RAG；长窗口更适合少量材料的一次性分析。

**易错点：**

- 不能把窗口容量当成知识治理能力。

**参考来源：**

- [官方文档](https://example.com)`

    const followUps = extractFollowUpAnswers(markdown)
    expect(followUps).toHaveLength(2)
    expect(followUps[1].answer).not.toContain('易错点')
    expect(followUps[1].answer).not.toContain('参考来源')
    expect(isConclusionOnlyDecisionAnswer(
      followUps[1].question,
      followUps[1].answer,
    )).toBe(true)
  })
})
