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

function javaFoundationQuestion(number) {
  const question = validQuestion(number)
  return {
    ...question,
    sources: [
      { label: 'JavaGuide Java 基础高频题', url: 'https://javaguide.cn/java/basis/java-basic-questions-01.html' },
      { label: 'Java 官方文档', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/' },
    ],
  }
}

function javaSpecialistQuestion(number) {
  const question = validQuestion(number)
  return {
    ...question,
    sources: [
      question.sources[0],
      { label: '小林 Coding Java 面试题', url: 'https://www.xiaolincoding.com/interview/java.html' },
      question.sources[1],
    ],
  }
}

describe('community interview bank quality gate', () => {
  it('classifies supported community platforms separately from technical authorities', () => {
    expect(sourceKindForUrl('https://www.nowcoder.com/discuss/123')).toBe('community-interview')
    expect(sourceKindForUrl('https://maimai.cn/article/detail?id=1')).toBe('community-interview')
    expect(sourceKindForUrl('https://www.xiaohongshu.com/explore/1')).toBe('community-interview')
    expect(sourceKindForUrl('https://javaguide.cn/java/')).toBe('curated-guide')
    expect(sourceKindForUrl('https://www.xiaolincoding.com/interview/java.html')).toBe('curated-guide')
    expect(sourceKindForUrl('https://javaguide.cn.example.com/java/')).toBe('official')
    expect(sourceKindForUrl('https://docs.spring.io/spring-ai/reference/')).toBe('official')
    expect(sourceKindForUrl('https://%')).toBe('invalid')
  })

  it('persists the source distinction when Markdown is parsed', () => {
    const parsed = parseQuestionMarkdown(`# 章节\n\n## Q1：示例题？\n\n- [面经](https://www.nowcoder.com/discuss/123)\n- [真实面经线索（题目已改写）：个人复盘](https://example.dev/interview)\n- [高频题库](https://javaguide.cn/java/)\n- [ClassLoader API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ClassLoader.html#loadClass(java.lang.String,boolean))\n- [规范](https://www.rfc-editor.org/rfc/rfc9110)`, {
      idPrefix: 'example',
      baseTags: [],
      preserveIds: false,
    })
    expect(parsed[0].questions[0].sources.map((source) => source.kind))
      .toEqual(['community-interview', 'official', 'curated-guide', 'official', 'official'])
    expect(parsed[0].questions[0].sources[3].url)
      .toBe('https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ClassLoader.html#loadClass(java.lang.String,boolean)')
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

  it('rejects a follow-up that gives only a selection result without explaining why', () => {
    const question = validQuestion(1)
    question.followUps[0] = {
      question: '上下文窗口大是否可以不用 RAG？',
      answer: '不一定。持续更新、细粒度权限和需要引用的企业知识仍更适合 RAG；长窗口更适合少量材料的一次性综合分析。',
    }
    expect(() => assertCommunityInterviewBank({
      id: 'example-bank',
      title: '示例真实面经',
      source: 'public/question-banks/example-bank.md',
      sections: [{ title: '章节', questions: [question] }],
    }, { minimumQuestions: 1 })).toThrow('只给结论，缺少原因或机制')
  })

  it('accepts a Java foundation bank with a curated high-frequency guide and official calibration', () => {
    const questions = Array.from({ length: 24 }, (_, index) => javaFoundationQuestion(index + 1))
    const bank = {
      id: 'java-foundations',
      title: 'Java 基础高频题库',
      sourcePolicy: 'curated-guide',
      source: 'public/question-banks/java-foundations.md',
      sections: [{ title: '章节', questions }],
    }
    expect(assertCommunityInterviewBank(bank)).toBe(bank)
  })

  it('accepts a Java specialist bank only when interview, guide and official provenance are all present', () => {
    const bank = {
      id: 'java-backend-interviews',
      title: 'Java 后端高频面试题',
      sourcePolicy: 'community-guide-official',
      source: 'public/question-banks/java-backend-interviews.md',
      sections: [{ title: '章节', questions: Array.from({ length: 24 }, (_, index) => javaSpecialistQuestion(index + 1)) }],
    }
    expect(assertCommunityInterviewBank(bank)).toBe(bank)

    const missingGuide = javaSpecialistQuestion(1)
    missingGuide.sources = [
      missingGuide.sources[0],
      missingGuide.sources[2],
      { label: 'Spring 官方文档', url: 'https://docs.spring.io/spring-framework/reference/' },
    ]
    expect(() => assertCommunityInterviewBank({
      ...bank,
      sections: [{ title: '章节', questions: [missingGuide] }],
    }, { minimumQuestions: 1 })).toThrow('Java 专项面经必须包含高频题库参考')

    const fakeOfficial = javaSpecialistQuestion(2)
    fakeOfficial.sources[2] = { label: '伪官方文档', url: 'https://evil.example/not-official', kind: 'official' }
    expect(() => assertCommunityInterviewBank({
      ...bank,
      sections: [{ title: '章节', questions: [fakeOfficial] }],
    }, { minimumQuestions: 1 })).toThrow('官方来源不在白名单域名')

    const fakeGithubOfficial = javaSpecialistQuestion(3)
    fakeGithubOfficial.sources[2] = { label: '伪 GitHub 官方文档', url: 'https://github.com/evil-user/fake-docs', kind: 'official' }
    expect(() => assertCommunityInterviewBank({
      ...bank,
      sections: [{ title: '章节', questions: [fakeGithubOfficial] }],
    }, { minimumQuestions: 1 })).toThrow('官方来源不在白名单域名')

    const fakeGithubSubdomain = javaSpecialistQuestion(4)
    fakeGithubSubdomain.sources[2] = { label: '伪 GitHub 子域文档', url: 'https://www.github.com/evil-user/fake-docs', kind: 'official' }
    expect(() => assertCommunityInterviewBank({
      ...bank,
      sections: [{ title: '章节', questions: [fakeGithubSubdomain] }],
    }, { minimumQuestions: 1 })).toThrow('官方来源不在白名单域名')

    const malformedExtra = javaSpecialistQuestion(5)
    malformedExtra.sources.push({ label: '损坏链接', url: 'https://%' })
    expect(() => assertCommunityInterviewBank({
      ...bank,
      sections: [{ title: '章节', questions: [malformedExtra] }],
    }, { minimumQuestions: 1 })).toThrow('来源不完整')
  })

  it('rejects community, missing guide or lookalike domains from the Java foundation bank', () => {
    const communityQuestion = validQuestion(1)
    expect(() => assertCommunityInterviewBank({
      id: 'java-foundations',
      title: 'Java 基础高频题库',
      sourcePolicy: 'curated-guide',
      source: 'public/question-banks/java-foundations.md',
      sections: [{ title: '章节', questions: [{ ...communityQuestion, sources: communityQuestion.sources }] }],
    }, { minimumQuestions: 1 })).toThrow('只允许白名单教程与官方来源')

    const missingGuide = javaFoundationQuestion(2)
    missingGuide.sources = [
      missingGuide.sources[1],
      { label: 'OpenJDK JEP 444', url: 'https://openjdk.org/jeps/444' },
    ]
    expect(() => assertCommunityInterviewBank({
      id: 'java-foundations',
      title: 'Java 基础高频题库',
      sourcePolicy: 'curated-guide',
      source: 'public/question-banks/java-foundations.md',
      sections: [{ title: '章节', questions: [missingGuide] }],
    }, { minimumQuestions: 1 })).toThrow('Java 基础题必须包含高频题库参考')

    const lookalike = javaFoundationQuestion(3)
    lookalike.sources[0] = { label: '伪高频题库', url: 'https://javaguide.cn.example.com/java', kind: 'curated-guide' }
    expect(() => assertCommunityInterviewBank({
      id: 'java-foundations',
      title: 'Java 基础高频题库',
      sourcePolicy: 'curated-guide',
      source: 'public/question-banks/java-foundations.md',
      sections: [{ title: '章节', questions: [lookalike] }],
    }, { minimumQuestions: 1 })).toThrow('来源类型与域名不匹配')
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
