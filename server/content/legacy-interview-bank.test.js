// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDatabase } from '../database.js'

const REPAIRED_IDS = [
  'q-13', 'q-15', 'q-18', 'q-23', 'q-24', 'q-25', 'q-32', 'q-38',
  'q-46', 'q-47', 'q-52', 'q-56', 'q-57', 'q-59', 'q-60', 'q-61',
  'q-62', 'q-67', 'q-69', 'q-70', 'q-75',
]

describe('legacy interview bank quality repairs', () => {
  let db

  beforeEach(() => {
    db = createDatabase({ filename: ':memory:', bootstrap: false }).db
  })

  afterEach(() => db.close())

  const question = (id) => db.prepare(`
    SELECT id, title, body_md
    FROM questions
    WHERE bank_id = 'interview' AND id = ? AND archived_at IS NULL
  `).get(id)

  it('preserves the legacy identity map while repairing content in place', () => {
    expect(db.prepare(`
      SELECT COUNT(*) count
      FROM questions
      WHERE bank_id = 'interview' AND archived_at IS NULL
    `).get().count).toBe(81)

    expect(REPAIRED_IDS.every((id) => question(id)?.id === id)).toBe(true)
  })

  it('keeps unrelated concepts out of the repaired RBAC, page stack and SSR questions', () => {
    expect(question('q-13').title).toContain('RBAC 如何落到前后端权限校验')
    expect(question('q-13').title).not.toContain('CORS')

    expect(question('q-52').title).toContain('页面栈溢出')
    expect(question('q-52').title).not.toContain('上传鉴权')

    expect(question('q-56').title).toContain('SSR 首屏慢')
    expect(question('q-56').title).not.toMatch(/401|CORS/)
    expect(question('q-56').body_md).toContain('401 和 CORS 是独立故障')
  })

  it('labels behavioral prompts and removes candidate-specific scripts', () => {
    for (const id of ['q-24', 'q-38']) {
      expect(question(id).title).toContain('行为面试｜')
      expect(question(id).body_md).not.toMatch(/我的优势|广州前端|三段实习/)
    }
    expect(question('q-24').body_md).toContain('事实')
    expect(question('q-24').body_md).toContain('证据')
    expect(question('q-38').body_md).toContain('承认边界')
  })

  it('requires verifiable boundaries for project claims', () => {
    for (const id of ['q-23', 'q-25', 'q-32']) {
      expect(question(id).body_md, id).toContain('**可验证边界：**')
    }
    expect(question('q-23').body_md).toContain('无法现场复现或给出仓库证据')
    expect(question('q-25').body_md).toContain('非法状态转移测试')
    expect(question('q-32').body_md).toContain('快照版本过旧')
  })

  it('adds measurable RAG diagnosis and an explicit dependency recovery lifecycle', () => {
    expect(question('q-46').body_md).toContain('Recall@K')
    expect(question('q-46').body_md).toContain('引用覆盖率')
    expect(question('q-46').body_md).toContain('固定评测集')

    const recovery = question('q-47').body_md
    for (const state of ['正常', '降级', '探测恢复', '补建索引', '完成']) {
      expect(recovery).toContain(`**${state}**`)
    }
    expect(recovery).toContain('待补建 chunk 数')
    expect(recovery).toContain('真实流量基线和 SLO')
    expect(recovery).toContain('BM25 是可选升级，不是当前实现')
    expect(db.prepare(`
      SELECT COUNT(*) count
      FROM source_refs
      WHERE question_id = 'q-47'
        AND url = 'https://cloud.google.com/vertex-ai/docs/vector-search/update-rebuild-index'
    `).get().count).toBe(1)
  })

  it('keeps project-specific claims conditional and evidence based', () => {
    const ble = question('q-36').body_md
    expect(ble).not.toContain('我把蓝牙能力封装')
    expect(ble).toContain('**可验证边界：**')
    expect(ble).toContain('若项目只是页面内串联了若干 BLE API')

    const three = question('q-37').body_md
    expect(three).not.toContain('我负责的重点')
    expect(three).toContain('**可验证边界：**')
    expect(three).toContain('通用设计与个人贡献分开')
  })

  it('keeps cache, stream, BLE and hashing examples internally consistent', () => {
    expect(question('q-30').body_md).toContain('dictCache.has(key)')

    const stream = question('q-48').body_md
    expect(stream).toContain('用 `type: done` 明确结束')
    expect(stream).not.toContain('用明确的 error event 和 `[DONE]` 结束标记')

    const ble = question('q-72').body_md
    expect(ble).toContain('protocol.serviceUuid')
    expect(ble).toContain('protocol.notifyCharacteristicUuid')
    expect(ble).not.toContain('services.services[0]')

    const hash = question('q-74').body_md
    expect(hash).toContain('256 bit 的摘要')
    expect(hash).toContain('64 个十六进制字符')
    expect(hash).not.toContain('64 位十六进制字符串')
  })

  it('keeps schema setup outside the runtime request path', () => {
    const body = question('q-79').body_md
    expect(body).toContain('context_pack_repo.py -> MySQL')
    expect(body).toContain('schema.py` 负责启动或迁移阶段')
    expect(body).toContain('不参与每次业务请求')
    expect(body).not.toContain('context_pack_repo.py -> schema.py')
  })

  it('separates Redis durability from cache consistency', () => {
    const body = question('q-60').body_md
    expect(question('q-60').title).toContain('持久化能解决缓存与数据库不一致吗')
    expect(body).toContain('不能')
    expect(body).toContain('RDB/AOF 解决的是 Redis 重启后能恢复多少自身数据')
    expect(body).toContain('Cache-Aside')
  })

  it('turns cross-bank repetitions into project decisions and canonical guidance', () => {
    expect(question('q-15').title).toContain('AI 对话为什么常用 fetch 流')
    expect(question('q-18').body_md).toContain('统一放在 Q75')
    expect(question('q-75').body_md).toContain('Embedding 概念与误召回原因见 Q18')

    for (const id of ['q-57', 'q-59', 'q-67']) {
      expect(question(id).body_md, id).toContain('统一到《数据库与缓存》题库')
    }
    expect(question('q-61').body_md).toContain('本题只训练 Topic 与权限建模')
    expect(question('q-69').body_md).toContain('统一到《网络与部署》题库')
    expect(question('q-70').body_md).toContain('统一到《网络与部署》题库')
  })

  it('gives every repaired question at least one traceable official source', () => {
    for (const id of REPAIRED_IDS) {
      const sources = db.prepare(`
        SELECT source_kind, url
        FROM source_refs
        WHERE question_id = ?
      `).all(id)
      expect(sources.length, id).toBeGreaterThanOrEqual(1)
      expect(sources.every((source) => source.source_kind === 'official'), id).toBe(true)
      expect(sources.every((source) => source.url.startsWith('https://')), id).toBe(true)
    }
  })
})
