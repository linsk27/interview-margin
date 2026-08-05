// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { assertCommunityInterviewBank } from './community-interview-bank.js'
import { parseQuestionMarkdown, sourceKindForUrl } from './markdown.js'

const text = (prefix, size) => `${prefix}${'具体机制、约束、边界与验证方法。'.repeat(size)}`

function validQuestion(number) {
  return {
    title: `生产场景技术问题 ${number} 如何处理？`,
    summary: text('先给结论：', 3),
    mechanism: text('机制拆解：', 10),
    example: text('在真实项目中：', 6),
    followUps: [
      { question: '如何验证？', answer: text('建立固定样本并记录指标，', 3) },
      { question: '失败如何降级？', answer: text('设置超时、隔离和明确兜底，', 3) },
    ],
    pitfalls: [
      '不能把偶然成功当作稳定性结论，需要重复压测并覆盖失败路径。',
      '不能省略权限、超时和幂等边界，否则示例无法用于生产环境。',
    ],
    sources: [
      { label: '牛客真实面经', url: 'https://www.nowcoder.com/discuss/123', kind: 'community-interview' },
      { label: 'Java 官方文档', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/' },
    ],
  }
}

describe('community interview bank quality gate', () => {
  it('classifies supported community platforms separately from technical authorities', () => {
    expect(sourceKindForUrl('https://www.nowcoder.com/discuss/123')).toBe('community-interview')
    expect(sourceKindForUrl('https://maimai.cn/article/detail?id=1')).toBe('community-interview')
    expect(sourceKindForUrl('https://www.xiaohongshu.com/explore/1')).toBe('community-interview')
    expect(sourceKindForUrl('https://docs.spring.io/spring-ai/reference/')).toBe('official')
  })

  it('persists the source distinction when Markdown is parsed', () => {
    const parsed = parseQuestionMarkdown(`# 章节\n\n## Q1：示例题？\n\n- [面经](https://www.nowcoder.com/discuss/123)\n- [真实面经线索（题目已改写）：个人复盘](https://example.dev/interview)\n- [规范](https://www.rfc-editor.org/rfc/rfc9110)`, {
      idPrefix: 'example',
      baseTags: [],
      preserveIds: false,
    })
    expect(parsed[0].questions[0].sources.map((source) => source.kind))
      .toEqual(['community-interview', 'community-interview', 'official'])
  })

  it('accepts substantial technical questions with both provenance layers', () => {
    const bank = {
      id: 'example-bank',
      title: '示例真实面经',
      source: 'public/question-banks/example-bank.md',
      sections: [{ title: '章节', questions: Array.from({ length: 24 }, (_, index) => validQuestion(index + 1)) }],
    }
    expect(assertCommunityInterviewBank(bank)).toBe(bank)
  })

  it('accepts an official-only foundation bank without fabricating community provenance', () => {
    const questions = Array.from({ length: 24 }, (_, index) => {
      const question = validQuestion(index + 1)
      return {
        ...question,
        sources: question.sources
          .filter((source) => source.kind !== 'community-interview')
          .map((source) => ({ ...source, kind: 'official' })),
      }
    })
    const bank = {
      id: 'java-foundations',
      title: '官方基础题库',
      sourcePolicy: 'official-only',
      source: 'public/question-banks/java-foundations.md',
      sections: [{ title: '章节', questions }],
    }
    expect(assertCommunityInterviewBank(bank)).toBe(bank)
  })

  it('rejects community or lookalike domains from the official-only foundation bank', () => {
    const communityQuestion = validQuestion(1)
    expect(() => assertCommunityInterviewBank({
      id: 'java-foundations',
      title: '官方基础题库',
      sourcePolicy: 'official-only',
      source: 'public/question-banks/java-foundations.md',
      sections: [{ title: '章节', questions: [{ ...communityQuestion, sources: communityQuestion.sources }] }],
    }, { minimumQuestions: 1 })).toThrow('只允许白名单官方来源')

    const lookalike = validQuestion(2)
    lookalike.sources = [{ label: '伪官方文档', url: 'https://docs.oracle.com.example.com/java', kind: 'official' }]
    expect(() => assertCommunityInterviewBank({
      id: 'java-foundations',
      title: '官方基础题库',
      sourcePolicy: 'official-only',
      source: 'public/question-banks/java-foundations.md',
      sections: [{ title: '章节', questions: [lookalike] }],
    }, { minimumQuestions: 1 })).toThrow('只允许白名单官方来源')
  })

  it('rejects behavioral filler even when the rest of the entry is complete', () => {
    const question = validQuestion(1)
    question.title = '请做一下自我介绍'
    expect(() => assertCommunityInterviewBank({
      id: 'example-bank',
      title: '示例真实面经',
      source: 'public/question-banks/example-bank.md',
      sections: [{ title: '章节', questions: [question] }],
    }, { minimumQuestions: 1 })).toThrow('不得收录非技术面试题')
  })
})
