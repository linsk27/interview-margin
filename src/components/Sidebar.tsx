import { BarChart3, BookMarked, Check, ChevronDown, Circle, CircleUserRound, Clock3, LibraryBig, LogIn, Search, Settings2, Star, X } from 'lucide-react'
import type { InterviewQuestion, InterviewSection, QuestionBankDefinition, StudyState, StudyStatus } from '../types'
import { progressFor } from '../lib/storage'

export type LibraryFilter = 'all' | 'favorite' | 'review' | 'mastered'

interface SidebarProps {
  sections: InterviewSection[]
  questions: InterviewQuestion[]
  activeId: string
  state: StudyState
  query: string
  filter: LibraryFilter
  bank: QuestionBankDefinition
  mobileOpen: boolean
  expanded: boolean
  authenticated: boolean
  onQueryChange: (value: string) => void
  onFilterChange: (value: LibraryFilter) => void
  onSelect: (question: InterviewQuestion) => void
  onOpenQuestionBanks: () => void
  onOpenDashboard: () => void
  onOpenSettings: () => void
  onOpenAccount: () => void
  onClose: () => void
}

const FILTERS: Array<{ id: LibraryFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'review', label: '复习' },
  { id: 'favorite', label: '收藏' },
  { id: 'mastered', label: '掌握' },
]

function StatusGlyph({ status }: { status: StudyStatus }) {
  if (status === 'mastered') return <Check aria-hidden="true" />
  if (status === 'review') return <Clock3 aria-hidden="true" />
  if (status === 'learning') return <BookMarked aria-hidden="true" />
  return <Circle aria-hidden="true" />
}

function QuestionRow({ question, active, state, onSelect }: {
  question: InterviewQuestion
  active: boolean
  state: StudyState
  onSelect: () => void
}) {
  const progress = progressFor(state, question.id)
  return (
    <button
      className={`question-row status-${progress.status}${active ? ' is-active' : ''}`}
      type="button"
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      title={question.title}
    >
      <span className="question-row__status"><StatusGlyph status={progress.status} /></span>
      <span className="question-row__number">Q{question.number}</span>
      <span className="question-row__title">{question.title.replace(/^Q[\d.]+[：:]?\s*/, '')}</span>
      {progress.favorite && <Star className="question-row__star" aria-label="已收藏" />}
    </button>
  )
}

export function Sidebar({
  sections,
  questions,
  activeId,
  state,
  query,
  filter,
  bank,
  mobileOpen,
  expanded,
  authenticated,
  onQueryChange,
  onFilterChange,
  onSelect,
  onOpenQuestionBanks,
  onOpenDashboard,
  onOpenSettings,
  onOpenAccount,
  onClose,
}: SidebarProps) {
  const filteredIds = new Set(questions.map((question) => question.id))
  const hasSearch = query.trim().length > 0

  return (
    <aside
      id="question-library"
      className={`library${mobileOpen ? ' is-mobile-open' : ''}${expanded ? ' is-open' : ''}`}
      aria-label={`${bank.title}题目目录`}
      aria-hidden={!expanded}
      inert={!expanded}
    >
      <header className="library__header">
        <div>
          <p className="library__kicker">{bank.kicker}</p>
          <h1>{bank.shortTitle}</h1>
        </div>
        <div className="library__header-actions">
          <button className="icon-button library__mobile-tool" type="button" onClick={onOpenQuestionBanks} aria-label="返回题库中心" title="题库中心">
            <LibraryBig aria-hidden="true" />
          </button>
          <button className="icon-button library__mobile-tool" type="button" onClick={onOpenDashboard} aria-label="打开学习概览" title="学习概览">
            <BarChart3 aria-hidden="true" />
          </button>
          <button className="icon-button library__mobile-tool" type="button" onClick={onOpenSettings} aria-label="打开阅读设置" title="阅读设置">
            <Settings2 aria-hidden="true" />
          </button>
          <button className="icon-button library__mobile-tool" type="button" onClick={onOpenAccount} aria-label={authenticated ? '打开学习账号' : '登录学习账号'} title={authenticated ? '学习账号' : '登录'}>
            {authenticated ? <CircleUserRound aria-hidden="true" /> : <LogIn aria-hidden="true" />}
          </button>
          <button
            className="icon-button library__close"
            type="button"
            onClick={onClose}
            aria-label="收起题库"
            aria-controls="question-library"
            aria-expanded={expanded}
            title="收起题库"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      </header>

      <label className="search-field">
        <Search aria-hidden="true" />
        <span className="sr-only">搜索题目和正文</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索题目、原理或项目…"
        />
        <kbd>/</kbd>
      </label>

      <div className="filter-strip" role="tablist" aria-label="题库筛选">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={filter === item.id ? 'is-active' : ''}
            onClick={() => onFilterChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="library__summary">
        <span>{questions.length} 道题</span>
        <span>{sections.filter((section) => section.questions.some((question) => filteredIds.has(question.id))).length} 个章节</span>
      </div>

      <div className="library__scroll">
        {questions.length === 0 ? (
          <div className="library__empty">
            <Search aria-hidden="true" />
            <strong>没有匹配题目</strong>
            <p>换一个关键词，或清除当前筛选。</p>
            <button type="button" onClick={() => { onQueryChange(''); onFilterChange('all') }}>查看全部题目</button>
          </div>
        ) : hasSearch ? (
          <div className="search-results">
            {questions.map((question) => (
              <QuestionRow
                key={question.id}
                question={question}
                active={question.id === activeId}
                state={state}
                onSelect={() => onSelect(question)}
              />
            ))}
          </div>
        ) : (
          sections.map((section) => {
            const visible = section.questions.filter((question) => filteredIds.has(question.id))
            if (!visible.length) return null
            const mastered = visible.filter((question) => progressFor(state, question.id).status === 'mastered').length
            return (
              <details className="library-section" key={section.id} open={visible.some((question) => question.id === activeId) || filter !== 'all'}>
                <summary>
                  <span>{section.title.replace(/^Part\s*\d+[：:]?\s*/i, '')}</span>
                  <small>{mastered}/{visible.length}</small>
                  <ChevronDown aria-hidden="true" />
                </summary>
                <div className="library-section__questions">
                  {visible.map((question) => (
                    <QuestionRow
                      key={question.id}
                      question={question}
                      active={question.id === activeId}
                      state={state}
                      onSelect={() => onSelect(question)}
                    />
                  ))}
                </div>
              </details>
            )
          })
        )}
      </div>
    </aside>
  )
}
