import {
  Archive, BookCopy, Check, DatabaseBackup, Download, FilePlus2, History,
  Import, LoaderCircle, Plus, RefreshCcw, RotateCcw, Save, ShieldCheck, Trash2, UserPlus, Users, X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api, ApiError } from '../lib/api'
import type { InterviewQuestion, InterviewSection, QuestionBankDefinition, SessionUser } from '../types'

interface ManagedUser {
  id: string
  username: string
  displayName: string
  status: 'active' | 'disabled'
  roles: string[]
  mustChangePassword: boolean
  createdAt: string
}

interface BackupRecord { filename: string; size: number; createdAt: string }
type AdminTab = 'content' | 'users' | 'backups'

interface QuestionDraft {
  id: string
  sectionTitle: string
  title: string
  body: string
  tags: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
  sources: Array<{ title: string; url: string }>
  version: number
}

const EMPTY_QUESTION: QuestionDraft = {
  id: '', sectionTitle: '基础题', title: '', body: '', tags: '', difficulty: 'intermediate',
  sources: [{ title: '', url: '' }], version: 0,
}

function questionDraft(question: InterviewQuestion) {
  return {
    id: question.id,
    sectionTitle: question.sectionTitle,
    title: question.title,
    body: question.body,
    tags: question.tags.join(', '),
    difficulty: question.difficulty ?? 'intermediate',
    sources: question.sources?.length ? question.sources.map(({ title, url }) => ({ title, url })) : [{ title: '', url: '' }],
    version: question.version ?? 1,
  }
}

export function AdminPanel({ user, onExit, onCatalogChanged }: {
  user: SessionUser
  onExit: () => void
  onCatalogChanged: () => Promise<void>
}) {
  const canManageUsers = user.permissions.includes('users.manage')
  const canBackup = user.permissions.includes('backup.manage')
  const [tab, setTab] = useState<AdminTab>('content')
  const [banks, setBanks] = useState<QuestionBankDefinition[]>([])
  const [sections, setSections] = useState<InterviewSection[]>([])
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [selectedBankId, setSelectedBankId] = useState('')
  const [selectedQuestionId, setSelectedQuestionId] = useState('')
  const [question, setQuestion] = useState<QuestionDraft>(EMPTY_QUESTION)
  const [questionDirty, setQuestionDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'conflict' | 'error'>('idle')
  const [error, setError] = useState('')
  const [bankFormOpen, setBankFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [markdown, setMarkdown] = useState('')
  const [previewCount, setPreviewCount] = useState<number>()
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const savingRef = useRef(false)

  const selectedBank = banks.find((bank) => bank.id === selectedBankId)
  const bankQuestions = useMemo(() => sections.flatMap((section) => section.questions)
    .filter((item) => item.library === selectedBankId), [sections, selectedBankId])

  const loadContent = async () => {
    const result = await api<{ banks: QuestionBankDefinition[]; sections: InterviewSection[] }>('/api/admin/catalog')
    setBanks(result.banks)
    setSections(result.sections)
    setSelectedBankId((current) => current || result.banks[0]?.id || '')
  }
  const loadUsers = async () => {
    if (!canManageUsers) return
    const result = await api<{ users: ManagedUser[] }>('/api/users')
    setUsers(result.users)
  }
  const loadBackups = async () => {
    if (!canBackup) return
    const result = await api<{ backups: BackupRecord[] }>('/api/backups')
    setBackups(result.backups)
  }

  useEffect(() => {
    Promise.all([loadContent(), loadUsers(), loadBackups()]).catch((reason) => setError(reason.message))
  }, [])

  useEffect(() => {
    const found = bankQuestions.find((item) => item.id === selectedQuestionId)
    if (found) setQuestion(questionDraft(found))
    else setQuestion(EMPTY_QUESTION)
    setQuestionDirty(false)
    setSaveState('idle')
  }, [selectedQuestionId])

  useEffect(() => {
    if (!questionDirty || !question.id || savingRef.current) return
    const timer = window.setTimeout(async () => {
      savingRef.current = true
      setSaveState('saving')
      try {
        const result = await api<{ version: number }>(`/api/questions/${question.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            version: question.version,
            sectionTitle: question.sectionTitle,
            title: question.title,
            body: question.body,
            tags: question.tags.split(',').map((item) => item.trim()).filter(Boolean),
            difficulty: question.difficulty,
            sources: question.sources.filter((source) => source.title && source.url),
          }),
        })
        setQuestion((current) => ({ ...current, version: result.version }))
        setQuestionDirty(false)
        setSaveState('saved')
        await loadContent()
        await onCatalogChanged()
      } catch (reason) {
        setSaveState(reason instanceof ApiError && reason.status === 409 ? 'conflict' : 'error')
        setError(reason instanceof Error ? reason.message : '自动保存失败。')
      } finally {
        savingRef.current = false
      }
    }, 1_100)
    return () => window.clearTimeout(timer)
  }, [question, questionDirty])

  const editQuestion = (patch: Partial<typeof question>) => {
    setQuestion((current) => ({ ...current, ...patch }))
    setQuestionDirty(true)
    setSaveState('idle')
  }

  const createQuestion = async () => {
    if (!selectedBankId || !question.title || !question.body) return
    setSaveState('saving')
    try {
      const result = await api<{ id: string }>(`/api/banks/${selectedBankId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          sectionTitle: question.sectionTitle, title: question.title, body: question.body,
          tags: question.tags.split(',').map((item) => item.trim()).filter(Boolean),
          difficulty: question.difficulty,
          sources: question.sources.filter((source) => source.title && source.url),
        }),
      })
      await loadContent()
      await onCatalogChanged()
      setSelectedQuestionId(result.id)
      setSaveState('saved')
    } catch (reason) { setError(reason instanceof Error ? reason.message : '题目创建失败。'); setSaveState('error') }
  }

  const archiveQuestion = async () => {
    if (!question.id) return
    await api(`/api/questions/${question.id}`, { method: 'DELETE' })
    setSelectedQuestionId('')
    await loadContent()
    await onCatalogChanged()
  }

  const restoreQuestion = async (id: string) => {
    await api(`/api/questions/${id}/restore`, { method: 'POST' })
    await loadContent(); await onCatalogChanged()
  }

  const createBank = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const id = String(values.get('id'))
    await api('/api/banks', {
      method: 'POST',
      body: JSON.stringify({
        id, title: values.get('title'), shortTitle: values.get('shortTitle'), kicker: values.get('kicker'),
        category: values.get('category'), description: values.get('description'),
        baseTags: String(values.get('tags')).split(',').map((item) => item.trim()).filter(Boolean), tone: values.get('tone'), visibility: 'public',
      }),
    })
    setBankFormOpen(false)
    await loadContent(); await onCatalogChanged(); setSelectedBankId(id)
  }

  const archiveBank = async (bank: QuestionBankDefinition) => {
    if (bank.archivedAt) await api(`/api/banks/${bank.id}/restore`, { method: 'POST' })
    else await api(`/api/banks/${bank.id}`, { method: 'DELETE' })
    await loadContent(); await onCatalogChanged()
  }

  const previewMarkdown = async () => {
    const result = await api<{ questions: number }>('/api/import/markdown/preview', { method: 'POST', body: JSON.stringify({ markdown }) })
    setPreviewCount(result.questions)
  }
  const importMarkdown = async () => {
    const result = await api<{ count: number }>(`/api/banks/${selectedBankId}/import-markdown`, { method: 'POST', body: JSON.stringify({ markdown }) })
    setPreviewCount(result.count); setMarkdown(''); setImportOpen(false)
    await loadContent(); await onCatalogChanged()
  }

  return (
    <main className="admin-panel">
      <header className="admin-panel__topbar">
        <div><ShieldCheck aria-hidden="true" /><p><span>CONTENT OPERATIONS</span><strong>题库与账号管理</strong></p></div>
        <button className="icon-button" type="button" onClick={onExit} aria-label="退出管理"><X aria-hidden="true" /></button>
      </header>
      <div className="admin-panel__tabs" role="tablist">
        <button className={tab === 'content' ? 'is-active' : ''} onClick={() => setTab('content')}><BookCopy aria-hidden="true" />题库内容</button>
        {canManageUsers && <button className={tab === 'users' ? 'is-active' : ''} onClick={() => setTab('users')}><Users aria-hidden="true" />账号权限</button>}
        {canBackup && <button className={tab === 'backups' ? 'is-active' : ''} onClick={() => setTab('backups')}><DatabaseBackup aria-hidden="true" />备份审计</button>}
      </div>
      {error && <div className="admin-alert"><span>{error}</span><button onClick={() => setError('')}><X aria-hidden="true" /></button></div>}

      {tab === 'content' && (
        <div className="admin-content">
          <aside className="admin-library">
            <header><div><span>题库</span><strong>{banks.length}</strong></div><button onClick={() => setBankFormOpen(true)} title="新建题库"><Plus aria-hidden="true" /></button></header>
            <div className="admin-library__banks">
              {banks.map((bank) => <button key={bank.id} className={bank.id === selectedBankId ? 'is-active' : ''} onClick={() => { setSelectedBankId(bank.id); setSelectedQuestionId('') }}>
                <span>{bank.shortTitle}{bank.archivedAt && <em>已归档</em>}</span><small>{bank.category}</small>
              </button>)}
            </div>
            {selectedBank && <button className="admin-archive-button" onClick={() => archiveBank(selectedBank)}>{selectedBank.archivedAt ? <RotateCcw /> : <Archive />}{selectedBank.archivedAt ? '恢复题库' : '归档题库'}</button>}
          </aside>
          <section className="admin-questions">
            <header>
              <div><span>{selectedBank?.title ?? '选择题库'}</span><strong>{bankQuestions.length} 题</strong></div>
              <div><button onClick={() => setImportOpen(true)}><Import aria-hidden="true" />导入</button><button onClick={() => setSelectedQuestionId('')}><FilePlus2 aria-hidden="true" />新题</button></div>
            </header>
            <div className="admin-question-list">
              {bankQuestions.map((item) => <button key={item.id} className={item.id === selectedQuestionId ? 'is-active' : ''} onClick={() => setSelectedQuestionId(item.id)}>
                <span>Q{item.number}</span><strong>{item.title.replace(/^Q[\d.]+[：:]?\s*/, '')}</strong>{item.archivedAt && <em>归档</em>}
              </button>)}
            </div>
          </section>
          <section className="admin-editor">
            <header>
              <div><span>{question.id ? '编辑题目' : '新建题目'}</span><small className={`save-state is-${saveState}`}>{saveState === 'saving' && <LoaderCircle />}{saveState === 'saved' && <Check />}{saveState === 'conflict' ? '版本冲突，请刷新' : saveState === 'saving' ? '自动保存中' : saveState === 'saved' ? '已保存' : questionDirty ? '有未保存更改' : '尚未修改'}</small></div>
              {question.id && (bankQuestions.find((item) => item.id === question.id)?.archivedAt
                ? <button onClick={() => restoreQuestion(question.id)}><RotateCcw />恢复</button>
                : <button onClick={archiveQuestion}><Trash2 />归档</button>)}
            </header>
            <div className="admin-editor__fields">
              <label>章节<input value={question.sectionTitle} onChange={(event) => editQuestion({ sectionTitle: event.target.value })} /></label>
              <label>题目<input value={question.title} onChange={(event) => editQuestion({ title: event.target.value })} placeholder="输入面试问题" /></label>
              <div className="admin-editor__meta">
                <label>标签<input value={question.tags} onChange={(event) => editQuestion({ tags: event.target.value })} placeholder="Vue, 响应式" /></label>
                <label>难度<select value={question.difficulty} onChange={(event) => editQuestion({ difficulty: event.target.value as typeof question.difficulty })}><option value="basic">基础</option><option value="intermediate">进阶</option><option value="advanced">高级</option></select></label>
              </div>
              <label>Markdown 正文<textarea value={question.body} onChange={(event) => editQuestion({ body: event.target.value })} placeholder="**短回答：** ..." /></label>
              <div className="admin-editor__source">
                <label>官方来源<input value={question.sources[0]?.title ?? ''} onChange={(event) => editQuestion({ sources: [{ ...question.sources[0], title: event.target.value }] })} placeholder="MDN" /></label>
                <label>来源 URL<input value={question.sources[0]?.url ?? ''} onChange={(event) => editQuestion({ sources: [{ ...question.sources[0], url: event.target.value }] })} placeholder="https://..." /></label>
              </div>
              {!question.id && <button className="primary-button" onClick={createQuestion}><Save aria-hidden="true" />创建题目</button>}
            </div>
            <div className="admin-editor__preview"><span>实时预览</span><article className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{question.body || '*这里显示 Markdown 预览*'}</ReactMarkdown></article></div>
          </section>
        </div>
      )}

      {tab === 'users' && <UserManager users={users} onReload={loadUsers} onTemporaryPassword={setTemporaryPassword} />}
      {tab === 'backups' && <BackupManager backups={backups} onReload={loadBackups} />}

      {bankFormOpen && <div className="admin-overlay"><form className="admin-form-card" onSubmit={createBank}><header><h2>新建题库包</h2><button type="button" onClick={() => setBankFormOpen(false)}><X /></button></header><label>ID<input name="id" pattern="[a-z0-9][a-z0-9-]{1,63}" required /></label><label>题库名称<input name="title" required /></label><label>短名称<input name="shortTitle" required /></label><label>英文眉题<input name="kicker" defaultValue="QUESTION BANK" required /></label><label>分类<input name="category" required /></label><label>描述<textarea name="description" required /></label><label>标签<input name="tags" /></label><label>配色<select name="tone"><option value="blue">蓝</option><option value="amber">琥珀</option><option value="green">绿</option><option value="rose">玫红</option></select></label><button className="primary-button" type="submit">创建题库</button></form></div>}
      {importOpen && <div className="admin-overlay"><section className="admin-form-card admin-import"><header><h2>导入 Markdown</h2><button onClick={() => setImportOpen(false)}><X /></button></header><p>一级标题作为章节，二级标题必须以 Q 编号开头。先预览数量，再确认写入。</p><textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} /><footer><span>{previewCount === undefined ? '尚未解析' : `识别 ${previewCount} 题`}</span><button onClick={previewMarkdown}>预览</button><button className="primary-button" onClick={importMarkdown} disabled={!previewCount}>确认导入</button></footer></section></div>}
      {temporaryPassword && <div className="admin-overlay"><section className="admin-form-card temporary-password"><header><h2>一次性密码</h2><button onClick={() => setTemporaryPassword('')}><X /></button></header><p>密码仅在此处显示一次，用户首次登录后必须修改。</p><code>{temporaryPassword}</code><button className="primary-button" onClick={() => navigator.clipboard.writeText(temporaryPassword)}>复制密码</button></section></div>}
    </main>
  )
}

function UserManager({ users, onReload, onTemporaryPassword }: { users: ManagedUser[]; onReload: () => Promise<void>; onTemporaryPassword: (password: string) => void }) {
  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget)
    const result = await api<{ temporaryPassword: string }>('/api/users', { method: 'POST', body: JSON.stringify({ username: values.get('username'), displayName: values.get('displayName'), role: values.get('role') }) })
    onTemporaryPassword(result.temporaryPassword); event.currentTarget.reset(); await onReload()
  }
  const patch = async (id: string, data: object) => { await api(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); await onReload() }
  const reset = async (id: string) => { const result = await api<{ temporaryPassword: string }>(`/api/users/${id}/reset-password`, { method: 'POST' }); onTemporaryPassword(result.temporaryPassword) }
  return <div className="admin-users"><form onSubmit={create}><div><UserPlus /><p><strong>创建账号</strong><span>不开放公共注册，由管理员分配角色。</span></p></div><input name="username" placeholder="用户名" required /><input name="displayName" placeholder="显示名称" required /><select name="role"><option value="learner">learner</option><option value="editor">editor</option><option value="admin">admin</option></select><button className="primary-button">创建</button></form><section><header><span>账号</span><span>角色</span><span>状态</span><span>操作</span></header>{users.map((item) => <article key={item.id}><div><strong>{item.displayName}</strong><small>@{item.username}</small></div><select value={item.roles[0]} onChange={(event) => patch(item.id, { role: event.target.value })}><option value="learner">learner</option><option value="editor">editor</option><option value="admin">admin</option></select><span className={`user-status is-${item.status}`}>{item.status === 'active' ? '启用' : '停用'}</span><div><button onClick={() => reset(item.id)}><RefreshCcw />重置密码</button><button onClick={() => patch(item.id, { status: item.status === 'active' ? 'disabled' : 'active' })}>{item.status === 'active' ? <Archive /> : <RotateCcw />}{item.status === 'active' ? '停用' : '启用'}</button></div></article>)}</section></div>
}

function BackupManager({ backups, onReload }: { backups: BackupRecord[]; onReload: () => Promise<void> }) {
  const create = async () => { await api('/api/backups', { method: 'POST' }); await onReload() }
  return <div className="admin-backups"><header><div><DatabaseBackup /><p><strong>SQLite 在线备份</strong><span>WAL 一致性备份，自动保留最近 30 份。</span></p></div><button className="primary-button" onClick={create}><Plus />立即备份</button></header><section>{backups.map((item) => <article key={item.filename}><div><strong>{item.filename}</strong><span>{new Date(item.createdAt).toLocaleString()} · {(item.size / 1024 / 1024).toFixed(2)} MB</span></div><a href={`/api/backups/${item.filename}`}><Download />下载</a></article>)}</section><footer><History />管理操作会写入审计日志；管理员接口不会读取其他用户的私人批注正文。</footer></div>
}
