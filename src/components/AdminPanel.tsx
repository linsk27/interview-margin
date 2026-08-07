import {
  Archive, Ban, BookCopy, Check, ChevronRight, Clock3, Copy, DatabaseBackup, Download, Eye, FilePlus2, History,
  Import, LoaderCircle, PencilLine, Plus, RefreshCcw, RotateCcw, Save, Send, ShieldCheck, Trash2, UserPlus, Users, X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  api, ApiError, appPath, createInvitation, listInvitations, revokeInvitation,
  type ManagedInvitation,
} from '../lib/api'
import { invitationLink } from '../lib/invitations'
import type { InterviewQuestion, InterviewSection, QuestionBankDefinition, SessionUser } from '../types'
import { QuestionMarkdown } from './QuestionMarkdown'

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
type ContentLoadState = 'loading' | 'ready' | 'error'

interface QuestionDraft {
  id: string
  sectionTitle: string
  title: string
  body: string
  tags: string[]
  difficulty: 'basic' | 'intermediate' | 'advanced'
  sources: Array<{ title: string; url: string }>
  version: number
}

const EMPTY_QUESTION: QuestionDraft = {
  id: '', sectionTitle: '基础题', title: '', body: '', tags: [], difficulty: 'intermediate',
  sources: [{ title: '', url: '' }], version: 0,
}

function questionDraft(question: InterviewQuestion) {
  return {
    id: question.id,
    sectionTitle: question.sectionTitle,
    title: question.title,
    body: question.body,
    tags: [...question.tags],
    difficulty: question.difficulty ?? 'intermediate',
    sources: question.sources?.length ? question.sources.map(({ title, url }) => ({ title, url })) : [{ title: '', url: '' }],
    version: question.version ?? 1,
  }
}

export function AdminPanel({ user, onExit, onCatalogChanged, initialCatalog = { banks: [], sections: [] } }: {
  user: SessionUser
  onExit: () => void
  onCatalogChanged: () => Promise<void>
  initialCatalog?: { banks: QuestionBankDefinition[]; sections: InterviewSection[] }
}) {
  const canManageUsers = user.permissions.includes('users.manage')
  const canBackup = user.permissions.includes('backup.manage')
  const [tab, setTab] = useState<AdminTab>('content')
  const [banks, setBanks] = useState<QuestionBankDefinition[]>(initialCatalog.banks)
  const [sections, setSections] = useState<InterviewSection[]>(initialCatalog.sections)
  const [contentLoadState, setContentLoadState] = useState<ContentLoadState>(initialCatalog.banks.length ? 'ready' : 'loading')
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [selectedBankId, setSelectedBankId] = useState(initialCatalog.banks[0]?.id ?? '')
  const [selectedQuestionId, setSelectedQuestionId] = useState('')
  const [question, setQuestion] = useState<QuestionDraft>(EMPTY_QUESTION)
  const [editorView, setEditorView] = useState<'edit' | 'preview'>('edit')
  const [questionDirty, setQuestionDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'conflict' | 'error'>('idle')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [bankAction, setBankAction] = useState<{ id: string; mode: 'archive' | 'restore' }>()
  const [bankFormOpen, setBankFormOpen] = useState(false)
  const [bankTags, setBankTags] = useState<string[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [markdown, setMarkdown] = useState('')
  const [previewCount, setPreviewCount] = useState<number>()
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const savingRef = useRef(false)

  const selectedBank = banks.find((bank) => bank.id === selectedBankId)
  const bankQuestions = useMemo(() => sections.flatMap((section) => section.questions)
    .filter((item) => item.library === selectedBankId), [sections, selectedBankId])
  const selectedQuestion = bankQuestions.find((item) => item.id === selectedQuestionId)

  const loadContent = async ({ showLoading = false, retry = false } = {}) => {
    if (showLoading) setContentLoadState('loading')
    let lastError: unknown
    const attempts = retry ? 2 : 1
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const result = await api<{ banks: QuestionBankDefinition[]; sections: InterviewSection[] }>('/api/admin/catalog')
        setBanks(result.banks)
        setSections(result.sections)
        setSelectedBankId((current) => result.banks.some((bank) => bank.id === current) ? current : result.banks[0]?.id || '')
        setContentLoadState('ready')
        return
      } catch (reason) {
        lastError = reason
        if (attempt + 1 < attempts) await new Promise((resolve) => window.setTimeout(resolve, 650))
      }
    }
    setContentLoadState('error')
    throw lastError
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
    Promise.all([loadContent({ showLoading: initialCatalog.banks.length === 0, retry: true }), loadUsers(), loadBackups()])
      .catch((reason) => setError(reason instanceof Error ? reason.message : '题库目录加载失败。'))
  }, [])

  useEffect(() => {
    const found = bankQuestions.find((item) => item.id === selectedQuestionId)
    if (found) setQuestion(questionDraft(found))
    else setQuestion(EMPTY_QUESTION)
    setEditorView('edit')
    setQuestionDirty(false)
    setSaveState('idle')
  }, [selectedQuestionId])

  useEffect(() => {
    if (!bankFormOpen && !importOpen && !temporaryPassword) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (temporaryPassword) setTemporaryPassword('')
      else if (importOpen) setImportOpen(false)
      else setBankFormOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [bankFormOpen, importOpen, temporaryPassword])

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
            tags: question.tags,
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
          tags: question.tags,
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
        baseTags: bankTags, tone: values.get('tone'), visibility: 'public',
      }),
    })
    setBankFormOpen(false)
    setBankTags([])
    await loadContent(); await onCatalogChanged(); setSelectedBankId(id)
  }

  const archiveBank = async (bank: QuestionBankDefinition) => {
    const mode = bank.archivedAt ? 'restore' : 'archive'
    setBankAction({ id: bank.id, mode })
    setError('')
    setFeedback('')
    try {
      if (mode === 'restore') await api(`/api/banks/${bank.id}/restore`, { method: 'POST' })
      else await api(`/api/banks/${bank.id}`, { method: 'DELETE' })

      setBanks((current) => current.map((item) => item.id === bank.id
        ? { ...item, archivedAt: mode === 'restore' ? undefined : new Date().toISOString(), version: (item.version ?? 0) + 1 }
        : item))
      setFeedback(mode === 'restore'
        ? `已恢复“${bank.shortTitle}”，学习用户现在可以再次看到该题库。`
        : `已归档“${bank.shortTitle}”，题库内容仍保留在管理端。`)
      setBankAction(undefined)
      void Promise.all([loadContent(), onCatalogChanged()]).catch((reason) => {
        setError(reason instanceof Error ? `题库状态已更新，但目录刷新失败：${reason.message}` : '题库状态已更新，但目录刷新失败。')
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `${mode === 'restore' ? '恢复' : '归档'}题库失败。`)
      setBankAction(undefined)
    }
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
        <div className="admin-panel__identity">
          <ShieldCheck aria-hidden="true" />
          <p><span>CONTENT OPERATIONS</span><strong>题库与账号管理</strong></p>
          <em>{canManageUsers ? '管理员工作区' : '内容编辑工作区'}</em>
        </div>
        <button className="icon-button" type="button" onClick={onExit} aria-label="退出管理"><X aria-hidden="true" /></button>
      </header>
      <div className="admin-panel__tabs" role="tablist">
        <button id="admin-tab-content" aria-controls="admin-panel-content" type="button" role="tab" aria-selected={tab === 'content'} className={tab === 'content' ? 'is-active' : ''} onClick={() => setTab('content')}><BookCopy aria-hidden="true" />题库内容</button>
        {canManageUsers && <button id="admin-tab-users" aria-controls="admin-panel-users" type="button" role="tab" aria-selected={tab === 'users'} className={tab === 'users' ? 'is-active' : ''} onClick={() => setTab('users')}><Users aria-hidden="true" />账号权限</button>}
        {canBackup && <button id="admin-tab-backups" aria-controls="admin-panel-backups" type="button" role="tab" aria-selected={tab === 'backups'} className={tab === 'backups' ? 'is-active' : ''} onClick={() => setTab('backups')}><DatabaseBackup aria-hidden="true" />备份审计</button>}
      </div>
      {error && <div className="admin-alert" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="关闭错误提示"><X aria-hidden="true" /></button></div>}
      {feedback && <div className="admin-feedback" role="status" aria-live="polite"><Check aria-hidden="true" /><span>{feedback}</span><button type="button" onClick={() => setFeedback('')} aria-label="关闭成功提示"><X aria-hidden="true" /></button></div>}

      {tab === 'content' && (
        <div className={`admin-content ${contentLoadState !== 'ready' && banks.length === 0 ? 'is-state' : ''}`} id="admin-panel-content" role="tabpanel" aria-labelledby="admin-tab-content" aria-busy={contentLoadState === 'loading'}>
          {contentLoadState !== 'ready' && banks.length === 0 ? <section className={`admin-content-state is-${contentLoadState}`} role="status" aria-live="polite">
            {contentLoadState === 'loading' ? <LoaderCircle className="admin-action-spinner" aria-hidden="true" /> : <RefreshCcw aria-hidden="true" />}
            <strong>{contentLoadState === 'loading' ? '正在加载题库目录' : '题库目录暂时没有加载出来'}</strong>
            <span>{contentLoadState === 'loading' ? '题目内容较多，首次打开可能需要几秒钟。' : '数据仍安全保存在服务器，可以重新请求目录。'}</span>
            {contentLoadState === 'error' && <button className="primary-button" type="button" onClick={() => {
              setError('')
              void loadContent({ showLoading: true, retry: true }).catch((reason) => setError(reason instanceof Error ? reason.message : '题库目录加载失败。'))
            }}><RefreshCcw aria-hidden="true" />重新加载</button>}
          </section> : <>
          <nav className="admin-breadcrumbs" aria-label="内容位置">
            <ol>
              <li><BookCopy aria-hidden="true" /><span>题库内容</span></li>
              {selectedBank && <li><ChevronRight aria-hidden="true" /><span>{selectedBank.shortTitle}</span></li>}
              <li aria-current="page"><ChevronRight aria-hidden="true" /><strong>{selectedQuestion ? `Q${selectedQuestion.number} ${selectedQuestion.title.replace(/^Q[\d.]+[：:]?\s*/, '')}` : '新建题目'}</strong></li>
            </ol>
          </nav>

          <section className="admin-bank-switcher" aria-labelledby="admin-bank-switcher-title">
            <header className="admin-bank-switcher__toolbar">
              <div className="admin-bank-switcher__label"><span id="admin-bank-switcher-title">题库</span><strong>{banks.length}</strong></div>
              <div className="admin-bank-switcher__actions">
                {selectedBank && (() => {
                  const pending = bankAction?.id === selectedBank.id
                  const mode = pending ? bankAction.mode : selectedBank.archivedAt ? 'restore' : 'archive'
                  return <button type="button" disabled={pending} aria-busy={pending} onClick={() => archiveBank(selectedBank)}>
                    {pending ? <LoaderCircle className="admin-action-spinner" aria-hidden="true" /> : mode === 'restore' ? <RotateCcw aria-hidden="true" /> : <Archive aria-hidden="true" />}
                    {pending ? mode === 'restore' ? '恢复中…' : '归档中…' : mode === 'restore' ? '恢复题库' : '归档题库'}
                  </button>
                })()}
                <button className="primary-button" type="button" onClick={() => { setBankTags([]); setBankFormOpen(true) }}><Plus aria-hidden="true" />新建题库</button>
              </div>
            </header>
            <div className="admin-bank-switcher__tags" role="tablist" aria-label="选择题库">
              {banks.map((bank) => {
                const count = sections.flatMap((section) => section.questions).filter((item) => item.library === bank.id).length
                return <button type="button" role="tab" aria-selected={bank.id === selectedBankId} key={bank.id} className={bank.id === selectedBankId ? 'is-active' : ''} onClick={() => { setSelectedBankId(bank.id); setSelectedQuestionId('') }}>
                  <span>{bank.shortTitle}</span><small>{count}</small>{bank.archivedAt && <em>已归档</em>}
                </button>
              })}
            </div>
          </section>

          <div className="admin-content__workspace">
            <section className="admin-questions">
              <header>
                <div className="admin-questions__heading"><span title={selectedBank?.title}>{selectedBank?.title ?? '选择题库'}</span><strong>{bankQuestions.length} 题</strong></div>
                <div className="admin-questions__actions"><button type="button" onClick={() => setImportOpen(true)}><Import aria-hidden="true" />导入</button><button type="button" onClick={() => setSelectedQuestionId('')}><FilePlus2 aria-hidden="true" />新题</button></div>
              </header>
              <div className="admin-question-list">
                {bankQuestions.map((item) => <button type="button" key={item.id} className={item.id === selectedQuestionId ? 'is-active' : ''} onClick={() => setSelectedQuestionId(item.id)}>
                  <span>Q{item.number}</span><strong>{item.title.replace(/^Q[\d.]+[：:]?\s*/, '')}</strong>{item.archivedAt && <em>归档</em>}
                </button>)}
              </div>
            </section>
            <section className="admin-editor">
              <header>
                <div><span>{editorView === 'preview' ? '题目预览' : question.id ? '编辑题目' : '新建题目'}</span><small className={`save-state is-${saveState}`}>{saveState === 'saving' && <LoaderCircle />}{saveState === 'saved' && <Check />}{saveState === 'conflict' ? '版本冲突，请刷新' : saveState === 'saving' ? '自动保存中' : saveState === 'saved' ? '已保存' : questionDirty ? '有未保存更改' : '尚未修改'}</small></div>
                <div className="admin-editor__actions">
                  <div className="admin-editor__view-tabs" role="tablist" aria-label="编辑器显示方式">
                    <button type="button" role="tab" aria-selected={editorView === 'edit'} aria-controls="admin-editor-edit" className={editorView === 'edit' ? 'is-active' : ''} onClick={() => setEditorView('edit')}><PencilLine aria-hidden="true" />编辑</button>
                    <button type="button" role="tab" aria-selected={editorView === 'preview'} aria-controls="admin-editor-preview" className={editorView === 'preview' ? 'is-active' : ''} onClick={() => setEditorView('preview')}><Eye aria-hidden="true" />预览</button>
                  </div>
                  {question.id && (selectedQuestion?.archivedAt
                    ? <button type="button" onClick={() => restoreQuestion(question.id)}><RotateCcw />恢复</button>
                    : <button type="button" onClick={archiveQuestion}><Trash2 />归档</button>)}
                </div>
              </header>
              {editorView === 'edit' ? <div className="admin-editor__fields" id="admin-editor-edit" role="tabpanel">
                <div className="admin-editor__identity-fields">
                  <label>章节<input value={question.sectionTitle} onChange={(event) => editQuestion({ sectionTitle: event.target.value })} /></label>
                  <label>题目<input value={question.title} onChange={(event) => editQuestion({ title: event.target.value })} placeholder="输入面试问题" /></label>
                </div>
                <div className="admin-editor__meta">
                  <TagInput key={`${selectedBankId}:${question.id || 'new'}`} label="标签" value={question.tags} onChange={(tags) => editQuestion({ tags })} placeholder="例如 Vue、响应式" />
                  <label>难度<select value={question.difficulty} onChange={(event) => editQuestion({ difficulty: event.target.value as typeof question.difficulty })}><option value="basic">基础</option><option value="intermediate">进阶</option><option value="advanced">高级</option></select></label>
                </div>
                <label>Markdown 正文<textarea value={question.body} onChange={(event) => editQuestion({ body: event.target.value })} placeholder="**短回答：** ..." /></label>
                <div className="admin-editor__source">
                  <label>官方来源<input value={question.sources[0]?.title ?? ''} onChange={(event) => editQuestion({ sources: [{ ...question.sources[0], title: event.target.value }] })} placeholder="MDN" /></label>
                  <label>来源 URL<input value={question.sources[0]?.url ?? ''} onChange={(event) => editQuestion({ sources: [{ ...question.sources[0], url: event.target.value }] })} placeholder="https://..." /></label>
                </div>
                {!question.id && <button className="primary-button admin-editor__create" type="button" onClick={createQuestion}><Save aria-hidden="true" />创建题目</button>}
              </div> : <div className="admin-editor__preview" id="admin-editor-preview" role="tabpanel"><span>题目预览</span><article className="markdown-body"><QuestionMarkdown>{question.body || '*这里显示 Markdown 预览*'}</QuestionMarkdown></article></div>}
            </section>
          </div>
          </>}
        </div>
      )}

      {tab === 'users' && canManageUsers && <div className="admin-account-management" id="admin-panel-users" role="tabpanel" aria-labelledby="admin-tab-users"><div className="admin-account-management__inner"><InvitationManager /><UserManager users={users} onReload={loadUsers} onTemporaryPassword={setTemporaryPassword} /></div></div>}
      {tab === 'backups' && canBackup && <div className="admin-tab-panel" id="admin-panel-backups" role="tabpanel" aria-labelledby="admin-tab-backups"><BackupManager backups={backups} onReload={loadBackups} /></div>}

      {bankFormOpen && <div className="admin-overlay" role="presentation"><form className="admin-form-card admin-bank-form" onSubmit={createBank} role="dialog" aria-modal="true" aria-labelledby="create-bank-title">
        <header className="admin-form-card__header"><div><span>QUESTION BANK</span><h2 id="create-bank-title">新建题库包</h2><p>填写识别信息与展示信息，创建后即可继续导入或编辑题目。</p></div><button className="icon-button" type="button" onClick={() => setBankFormOpen(false)} aria-label="关闭新建题库"><X aria-hidden="true" /></button></header>
        <div className="admin-form-card__body">
          <section className="admin-form-section"><div className="admin-form-section__intro"><strong>基础信息</strong><span>用于系统识别、导航和题库卡片标题。</span></div><div className="admin-form-grid">
            <label>ID<small>小写字母、数字和短横线，创建后不可修改。</small><input name="id" placeholder="例如 react-advanced" pattern="[a-z0-9][a-z0-9-]{1,63}" autoFocus required /></label>
            <label>题库名称<small>完整显示名称。</small><input name="title" placeholder="例如 React 进阶面试题" required /></label>
            <label>短名称<small>用于空间较窄的导航区域。</small><input name="shortTitle" placeholder="例如 React 进阶" required /></label>
            <label>英文眉题<small>显示在题库名称上方。</small><input name="kicker" defaultValue="QUESTION BANK" required /></label>
          </div></section>
          <section className="admin-form-section"><div className="admin-form-section__intro"><strong>展示信息</strong><span>决定题库在首页的分类、说明与视觉色调。</span></div><div className="admin-form-grid">
            <label>分类<input name="category" placeholder="例如 前端框架" required /></label>
            <label>配色<select name="tone"><option value="blue">蓝色</option><option value="amber">琥珀</option><option value="green">绿色</option><option value="rose">玫红</option></select></label>
            <label className="is-wide">描述<textarea name="description" placeholder="用一两句话说明题库范围和适合人群。" required /></label>
            <TagInput className="is-wide" label="标签" value={bankTags} onChange={setBankTags} placeholder="例如 React、Hooks、性能优化" maxTags={12} />
          </div></section>
        </div>
        <footer className="admin-form-card__footer"><p><ShieldCheck aria-hidden="true" />题库默认公开给已登录用户，内容修改会记录版本。</p><div><button type="button" onClick={() => setBankFormOpen(false)}>取消</button><button className="primary-button" type="submit"><Plus aria-hidden="true" />创建题库</button></div></footer>
      </form></div>}
      {importOpen && <div className="admin-overlay" role="presentation"><section className="admin-form-card admin-import" role="dialog" aria-modal="true" aria-labelledby="import-markdown-title"><header className="admin-form-card__header"><div><span>CONTENT IMPORT</span><h2 id="import-markdown-title">导入 Markdown</h2><p>一级标题作为章节，二级标题必须以 Q 编号开头。</p></div><button className="icon-button" type="button" onClick={() => setImportOpen(false)} aria-label="关闭导入"><X aria-hidden="true" /></button></header><div className="admin-form-card__body admin-import__body"><textarea aria-label="Markdown 内容" value={markdown} onChange={(event) => setMarkdown(event.target.value)} placeholder="# 章节名称&#10;&#10;## Q1. 问题标题&#10;&#10;正文内容…" /></div><footer className="admin-form-card__footer"><span>{previewCount === undefined ? '粘贴内容后先执行预览' : `已识别 ${previewCount} 题`}</span><div><button type="button" onClick={previewMarkdown}>预览</button><button className="primary-button" type="button" onClick={importMarkdown} disabled={!previewCount}>确认导入</button></div></footer></section></div>}
      {temporaryPassword && <div className="admin-overlay" role="presentation"><section className="admin-form-card temporary-password" role="dialog" aria-modal="true" aria-labelledby="temporary-password-title"><header className="admin-form-card__header"><div><span>ONE-TIME CREDENTIAL</span><h2 id="temporary-password-title">一次性密码</h2><p>密码仅显示一次，请通过可信渠道发送给用户。</p></div><button className="icon-button" type="button" onClick={() => setTemporaryPassword('')} aria-label="关闭一次性密码"><X aria-hidden="true" /></button></header><div className="admin-form-card__body"><code>{temporaryPassword}</code></div><footer className="admin-form-card__footer"><span>用户首次登录后必须修改密码。</span><button className="primary-button" type="button" onClick={() => navigator.clipboard.writeText(temporaryPassword)}><Copy aria-hidden="true" />复制密码</button></footer></section></div>}
    </main>
  )
}

function UserManager({ users, onReload, onTemporaryPassword }: { users: ManagedUser[]; onReload: () => Promise<void>; onTemporaryPassword: (password: string) => void }) {
  const [createOpen, setCreateOpen] = useState(false)
  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget)
    const result = await api<{ temporaryPassword: string }>('/api/users', { method: 'POST', body: JSON.stringify({ username: values.get('username'), displayName: values.get('displayName'), role: values.get('role') }) })
    onTemporaryPassword(result.temporaryPassword); event.currentTarget.reset(); setCreateOpen(false); await onReload()
  }
  const patch = async (id: string, data: object) => { await api(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); await onReload() }
  const reset = async (id: string) => { const result = await api<{ temporaryPassword: string }>(`/api/users/${id}/reset-password`, { method: 'POST' }); onTemporaryPassword(result.temporaryPassword) }
  const activeUsers = users.filter((item) => item.status === 'active').length

  useEffect(() => {
    if (!createOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setCreateOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [createOpen])

  return <section className="admin-users" aria-labelledby="user-manager-title">
    <header className="admin-section-heading"><div><span className="admin-section-heading__icon"><UserPlus aria-hidden="true" /></span><p><small>ACCOUNT DIRECTORY</small><strong id="user-manager-title">账号目录</strong><span>创建、分配角色或停用站内账号。</span></p></div><div className="admin-section-heading__aside"><dl><div><dt>全部</dt><dd>{users.length}</dd></div><div><dt>启用</dt><dd>{activeUsers}</dd></div></dl><button className="primary-button" type="button" onClick={() => setCreateOpen(true)}><Plus aria-hidden="true" />创建账号</button></div></header>
    <section className="admin-users__list" aria-label="账号列表"><header><span>账号</span><span>角色</span><span>状态</span><span>操作</span></header>{users.map((item) => <article key={item.id}>
      <div className="admin-user__identity"><span className="admin-user__avatar" aria-hidden="true">{item.displayName.trim().slice(0, 1).toUpperCase()}</span><div><strong>{item.displayName}</strong><small>@{item.username}</small></div></div>
      <select aria-label={`${item.username} 的角色`} value={item.roles[0]} onChange={(event) => patch(item.id, { role: event.target.value })}><option value="learner">学习用户</option><option value="editor">内容编辑</option><option value="admin">管理员</option></select>
      <span className={`user-status is-${item.status}`}>{item.status === 'active' ? '启用' : '停用'}</span>
      <div className="admin-user__actions"><button type="button" onClick={() => reset(item.id)}><RefreshCcw aria-hidden="true" />重置密码</button><button type="button" onClick={() => patch(item.id, { status: item.status === 'active' ? 'disabled' : 'active' })}>{item.status === 'active' ? <Archive aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}{item.status === 'active' ? '停用' : '启用'}</button></div>
    </article>)}</section>
    {createOpen && <div className="admin-overlay" role="presentation"><form className="admin-form-card admin-user-create-dialog" onSubmit={create} role="dialog" aria-modal="true" aria-labelledby="create-user-title">
      <header className="admin-form-card__header"><div><span>NEW ACCOUNT</span><h2 id="create-user-title">创建站内账号</h2><p>适合管理员或编辑账号；普通学习用户也可以使用邀请注册。</p></div><button className="icon-button" type="button" onClick={() => setCreateOpen(false)} aria-label="关闭创建账号"><X aria-hidden="true" /></button></header>
      <div className="admin-form-card__body"><div className="admin-form-grid">
        <label>用户名<small>登录时使用，建议简短且便于识别。</small><input name="username" autoComplete="off" placeholder="例如 linda.chen" autoFocus required /></label>
        <label>显示名称<small>在账号目录与个人资料中展示。</small><input name="displayName" autoComplete="off" placeholder="例如 Linda" required /></label>
        <label className="is-wide">初始角色<small>学习用户只能学习；内容编辑可以维护题库。</small><select name="role" defaultValue="learner"><option value="learner">学习用户</option><option value="editor">内容编辑</option><option value="admin">管理员</option></select></label>
      </div></div>
      <footer className="admin-form-card__footer"><span>系统会生成一次性初始密码。</span><div><button type="button" onClick={() => setCreateOpen(false)}>取消</button><button className="primary-button" type="submit"><Plus aria-hidden="true" />创建账号</button></div></footer>
    </form></div>}
  </section>
}

function TagInput({ label, value, onChange, placeholder = '输入后按 Enter', maxTags = 16, className = '' }: {
  label: string
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  className?: string
}) {
  const [draft, setDraft] = useState('')

  const commit = (raw = draft) => {
    const additions = raw.split(/[,，\n]+/).map((item) => item.trim()).filter(Boolean)
    if (!additions.length) return setDraft('')
    const next = [...value]
    additions.forEach((item) => {
      const normalized = item.slice(0, 40)
      if (next.length < maxTags && !next.some((tag) => tag.toLocaleLowerCase() === normalized.toLocaleLowerCase())) next.push(normalized)
    })
    onChange(next)
    setDraft('')
  }

  const remove = (tag: string) => onChange(value.filter((item) => item !== tag))

  return <div className={`admin-tag-field${className ? ` ${className}` : ''}`}>
    <span className="admin-tag-field__label">{label}</span>
    <div className="admin-tag-input" role="group" aria-label={`${label}，已添加 ${value.length} 个`}>
      {value.map((tag) => <span className="admin-tag" key={tag}>{tag}<button type="button" onClick={() => remove(tag)} aria-label={`移除标签 ${tag}`}><X aria-hidden="true" /></button></span>)}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit()}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Enter' || event.key === ',' || event.key === '，') { event.preventDefault(); commit() }
          if (event.key === 'Backspace' && !draft && value.length) remove(value[value.length - 1])
        }}
        aria-label={`添加${label}`}
        placeholder={value.length >= maxTags ? `最多 ${maxTags} 个标签` : placeholder}
        disabled={value.length >= maxTags}
      />
    </div>
    <small>Enter 或逗号确认，最多 {maxTags} 个。</small>
  </div>
}

const INVITATION_STATUS: Record<ManagedInvitation['status'], string> = {
  pending: '可使用',
  active: '可使用',
  used: '已使用',
  revoked: '已撤销',
  expired: '已过期',
}

function InvitationManager() {
  const [invitations, setInvitations] = useState<ManagedInvitation[]>([])
  const [generatedLink, setGeneratedLink] = useState('')
  const [generatedInvitationId, setGeneratedInvitationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await listInvitations()
      setInvitations(result.invitations)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '邀请列表读取失败。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    setCopied(false)
    try {
      const result = await createInvitation(Number(values.get('expiresInHours')) || 72)
      setGeneratedLink(invitationLink(result.token))
      setGeneratedInvitationId(result.invitation.id)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '邀请创建失败。')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
    } catch {
      setError('无法访问剪贴板，请手动选中并复制邀请链接。')
    }
  }

  const revoke = async (invitation: ManagedInvitation) => {
    if (!window.confirm('撤销后此邀请将立即失效，确定继续吗？')) return
    setBusy(true)
    setError('')
    try {
      await revokeInvitation(invitation.id)
      if (generatedInvitationId === invitation.id) {
        setGeneratedLink('')
        setGeneratedInvitationId('')
      }
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '邀请撤销失败。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="invitation-manager" aria-labelledby="invitation-manager-title">
      <header>
        <div><Send aria-hidden="true" /><p><small>INVITE ACCESS</small><strong id="invitation-manager-title">邀请注册</strong><span>生成一次性学习用户邀请，由受邀者自行设置账号和密码。</span></p></div>
        <form onSubmit={create}>
          <label htmlFor="invitation-duration">有效期</label>
          <select id="invitation-duration" name="expiresInHours" defaultValue="72" disabled={busy}>
            <option value="24">24 小时</option>
            <option value="72">3 天</option>
            <option value="168">7 天</option>
          </select>
          <button className="primary-button" type="submit" disabled={busy}><Plus aria-hidden="true" />{busy ? '处理中…' : '生成邀请'}</button>
          <button type="button" onClick={load} disabled={loading || busy} aria-label="刷新邀请状态"><RefreshCcw aria-hidden="true" />刷新</button>
        </form>
      </header>

      {generatedLink && (
        <div className="invitation-manager__link" role="status">
          <div><strong>邀请已生成</strong><span>完整链接只在当前页面保留，请现在复制并私下发送。</span></div>
          <input value={generatedLink} readOnly onFocus={(event) => event.currentTarget.select()} aria-label="新生成的邀请链接" />
          <button className="primary-button" type="button" onClick={copy}><Copy aria-hidden="true" />{copied ? '已复制' : '复制链接'}</button>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <div className="invitation-manager__empty" aria-busy="true"><LoaderCircle aria-hidden="true" /><strong>正在读取邀请状态</strong><span>请稍候…</span></div> : invitations.length === 0 ? (
        <div className="invitation-manager__empty"><Clock3 aria-hidden="true" /><strong>还没有邀请记录</strong><span>生成邀请后，可在这里查看有效期、使用状态并随时撤销。</span></div>
      ) : (
        <div className="invitation-manager__list">
          <table>
            <caption className="sr-only">邀请状态列表</caption>
            <colgroup><col className="is-status" /><col className="is-expiry" /><col className="is-created" /><col className="is-user" /><col className="is-action" /></colgroup>
            <thead><tr><th>状态</th><th>有效期</th><th>创建时间</th><th>使用账号</th><th>操作</th></tr></thead>
            <tbody>{invitations.map((invitation) => (
              <tr key={invitation.id}>
                <td data-label="状态"><span className={`invitation-status is-${invitation.status}`}>{INVITATION_STATUS[invitation.status] ?? invitation.status}</span></td>
                <td data-label="有效期"><span className="invitation-date"><Clock3 aria-hidden="true" /><time dateTime={invitation.expiresAt}>{new Date(invitation.expiresAt).toLocaleString()}</time></span></td>
                <td data-label="创建时间"><time className="invitation-date" dateTime={invitation.createdAt}>{new Date(invitation.createdAt).toLocaleString()}</time></td>
                <td data-label="使用账号">{invitation.usedByUsername ? `@${invitation.usedByUsername}` : '—'}</td>
                <td data-label="操作">{(invitation.status === 'active' || invitation.status === 'pending') ? <button type="button" onClick={() => revoke(invitation)} disabled={busy}><Ban aria-hidden="true" />撤销</button> : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function BackupManager({ backups, onReload }: { backups: BackupRecord[]; onReload: () => Promise<void> }) {
  const create = async () => { await api('/api/backups', { method: 'POST' }); await onReload() }
  return <div className="admin-backups"><header><div><DatabaseBackup /><p><strong>SQLite 在线备份</strong><span>WAL 一致性备份，自动保留最近 30 份。</span></p></div><button className="primary-button" onClick={create}><Plus />立即备份</button></header><section>{backups.map((item) => <article key={item.filename}><div><strong>{item.filename}</strong><span>{new Date(item.createdAt).toLocaleString()} · {(item.size / 1024 / 1024).toFixed(2)} MB</span></div><a href={appPath(`/api/backups/${item.filename}`)}><Download />下载</a></article>)}</section><footer><History />管理操作会写入审计日志；管理员接口不会读取其他用户的私人批注正文。</footer></div>
}
