// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { parseQuestionMarkdown } from './markdown.js'
import { denseProseBlocks, normalizeReadableQuestionBody } from './readability.js'

describe('question readability normalization', () => {
  it('turns a dense short answer into a lead plus scannable points', () => {
    const source = `**短回答：**

进程状态说明执行实体现在能否运行以及正在等待什么资源。PCB 保存内核调度和恢复这个执行实体所需的信息。上下文切换负责暂停当前任务并恢复下一个任务需要的机器状态。就绪只代表已经具备运行条件，不代表此刻正在占用处理器。阻塞通常表示任务仍在等待输入输出、锁、定时器或外部事件。状态迁移不代表每次都发生进程切换，线程切换也可能发生在同一地址空间。一次切换只处理当前路径需要的上下文，并不会复制整个 PCB。`

    const result = normalizeReadableQuestionBody(source)
    expect(result).toContain('进程状态说明执行实体现在能否运行以及正在等待什么资源。')
    expect(result).toContain('\n\n- ')
    expect(result).toContain('上下文切换负责暂停当前任务并恢复下一个任务需要的机器状态。')
    expect(denseProseBlocks(result)).toEqual([])
  })

  it('splits long mechanism prose without changing code fences or authored lists', () => {
    const source = `**原理：**

第一层负责收集输入并建立稳定边界，避免调用方直接依赖内部结构和临时字段。第二层根据明确规则转换数据，并记录足够的上下文用于定位失败步骤和重放问题。第三层只提交已经校验的结果，任何中间失败都保留原状态并返回可理解的原因。最后通过指标、日志和回归测试验证完整链路，确认同一输入可以稳定复现，而不是凭感觉判断成功。

- 已有列表保持原样。

~~~ts
const value = object.method()
~~~`

    const result = normalizeReadableQuestionBody(source)
    expect(result.split('\n\n').length).toBeGreaterThanOrEqual(4)
    expect(result).toContain('- 已有列表保持原样。')
    expect(result).toContain('~~~ts\nconst value = object.method()\n~~~')
    expect(denseProseBlocks(result)).toEqual([])
  })

  it('is idempotent', () => {
    const source = `**短回答：**\n\n第一句给结论。第二句补充边界。第三句说明结果。第四句提示验证。`
    const once = normalizeReadableQuestionBody(source)
    expect(normalizeReadableQuestionBody(once)).toBe(once)
  })

  it('normalizes legacy inline learning labels before splitting the prose', () => {
    const source = `**先背答案：** 第一句给出明确结论和适用边界，避免只重复题目中的名词。第二句解释实现时真正需要观察的数据、状态与输入输出。第三句说明这些状态在什么触发条件下发生变化。第四句补充任一步骤失败以后怎样恢复到一致状态。第五句说明不能把相邻但不同层次的概念直接画等号。第六句要求最后用日志、指标和独立测试验证判断。第七句补充并发情况下还需要版本和幂等保护。`
    const result = normalizeReadableQuestionBody(source)

    expect(result).toMatch(/^\*\*先背答案：\*\*\n\n/)
    expect(result).toContain('\n\n- ')
    expect(normalizeReadableQuestionBody(result)).toBe(result)
  })

  it('only rewrites catalog prose when the caller explicitly opts in', () => {
    const source = `# 测试章节

## Q1：测试题

**短回答：**

第一句说明核心结论和当前判断边界。第二句补充实现时需要保存的数据与状态。第三句说明失败后必须恢复原状态。第四句强调需要用指标和测试验证结果。第五句继续补充一个足够长的运行条件，让这段原文超过自动拆分阈值。第六句说明并发修改需要版本号或事务保护，不能依赖最后写入覆盖。第七句提醒调用方记录关联标识，确保失败链路可以定位和重放。`
    const options = { idPrefix: 'test', preserveIds: false, baseTags: [] }
    const authored = parseQuestionMarkdown(source, options)[0].questions[0].body
    const normalized = parseQuestionMarkdown(source, { ...options, normalizeReadability: true })[0].questions[0].body

    expect(authored).not.toContain('\n- ')
    expect(normalized).toContain('\n- ')
  })
})
