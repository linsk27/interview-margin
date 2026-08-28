// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  assertEnrichmentEntries,
  formatEnrichedBody,
  normalizeQuestionTitle,
} from './format.js'
import { denseProseBlocks } from '../readability.js'

const entry = {
  number: 1,
  title: '示例题？',
  mechanism: '读取阶段记录当前执行单元与数据键之间的依赖关系，写入阶段只调度真正依赖该键的执行单元。调度器还要去重、规定刷新时机并防止同步递归，因此依赖收集和实际执行是两个不同步骤。条件分支改变时必须先移除上一次运行留下的边，再根据本次真实读取重新连边；否则已经失效的数据仍会唤醒执行单元。队列通常以集合去重，并在微任务检查点批量刷新，既保证同步代码先完成，也避免一个业务动作造成多次重复提交。',
  example: '组件读取 count 后建立依赖；连续执行两次 count += 1 时，调度队列只保留一次组件更新，并在当前同步代码结束后统一刷新。这个例子同时说明触发次数与渲染次数并不相等。',
  followUps: [
    { question: '为什么需要清理旧依赖？', answer: '条件分支改变后，执行单元可能不再读取原来的键；若不清理，旧键仍会触发无意义执行并造成泄漏。' },
    { question: '为什么需要调度去重？', answer: '一次同步业务操作常连续修改多个依赖键；去重可以把同一个执行单元合并为一次稳定刷新。' },
  ],
  pitfalls: [
    '不要把“属性发生写入”直接等同于“页面立即同步重绘”，中间还有调度与提交阶段。',
    '依赖关系应按实际读取动态更新，不能只在初始化时静态登记一次。',
  ],
  sources: [
    { label: '官方指南', url: 'https://example.com/guide' },
    { label: '语言规范', url: 'https://example.com/spec' },
  ],
}

describe('content enrichment format', () => {
  it('normalizes numbered headings', () => {
    expect(normalizeQuestionTitle('Q12： 示例题？')).toBe('示例题？')
  })

  it('validates a complete entry and renders every learning section', () => {
    expect(assertEnrichmentEntries([entry], {
      bankId: 'test', expectedQuestions: [{ title: 'Q1：示例题？' }],
    })).toEqual([entry])
    const body = formatEnrichedBody({ summary: '先给出一段可以直接复述的结论。', ...entry })
    expect(body).toContain('**短回答：**')
    expect(body).toContain('**原理：**')
    expect(body).toContain('**代码 / 场景：**')
    expect(body).toContain('**递进追问：**')
    expect(body).toContain('**易错点：**')
    expect(body).toContain('**参考来源：**')
    expect(denseProseBlocks(body)).toEqual([])
  })

  it('rejects generic or incomplete records', () => {
    expect(() => assertEnrichmentEntries([{ ...entry, mechanism: '太短' }], {
      bankId: 'test', expectedQuestions: [{ title: '示例题？' }],
    })).toThrow('mechanism 过短')
  })

  it('rejects a follow-up that gives only a decision without its rationale', () => {
    const followUps = [
      {
        question: '上下文窗口大是否可以不用 RAG？',
        answer: '不一定。持续更新、细粒度权限和需要引用的企业知识仍更适合 RAG；长窗口更适合少量材料的一次性综合分析。',
      },
      entry.followUps[1],
    ]
    expect(() => assertEnrichmentEntries([{ ...entry, followUps }], {
      bankId: 'test', expectedQuestions: [{ title: '示例题？' }],
    })).toThrow('只给结论，缺少原因或机制')
  })
})
