import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  CheckCircle2,
  Clock3,
  Layers3,
  Search,
  Settings2,
} from 'lucide-react'
import { progressFor } from '../lib/storage'
import type {
  InterviewQuestion,
  QuestionBankDefinition,
  QuestionLibrary,
  StudyState,
} from '../types'

interface QuestionBankHubProps {
  banks: QuestionBankDefinition[]
  questions: InterviewQuestion[]
  state: StudyState
  currentBankId: QuestionLibrary
  onOpenBank: (bank: QuestionBankDefinition) => void
  onOpenDashboard: () => void
  onOpenSettings: () => void
}

function statsForBank(bank: QuestionBankDefinition, questions: InterviewQuestion[], state: StudyState) {
  const bankQuestions = questions.filter((question) => question.library === bank.id)
  const mastered = bankQuestions.filter((question) => progressFor(state, question.id).status === 'mastered').length
  const started = bankQuestions.filter((question) => progressFor(state, question.id).status !== 'unread').length
  const review = bankQuestions.filter((question) => {
    const progress = progressFor(state, question.id)
    return progress.status === 'review' || Boolean(progress.dueAt && new Date(progress.dueAt) <= new Date())
  }).length

  return {
    total: bankQuestions.length,
    mastered,
    started,
    review,
    percent: bankQuestions.length ? Math.round((mastered / bankQuestions.length) * 100) : 0,
  }
}

export function QuestionBankHub({
  banks,
  questions,
  state,
  currentBankId,
  onOpenBank,
  onOpenDashboard,
  onOpenSettings,
}: QuestionBankHubProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const categories = useMemo(() => ['全部', ...new Set(banks.map((bank) => bank.category))], [banks])
  const totalMastered = questions.filter((question) => progressFor(state, question.id).status === 'mastered').length
  const totalReview = questions.filter((question) => {
    const progress = progressFor(state, question.id)
    return progress.status === 'review' || Boolean(progress.dueAt && new Date(progress.dueAt) <= new Date())
  }).length
  const needle = query.trim().toLowerCase()
  const visibleBanks = banks.filter((bank) => {
    const matchesCategory = category === '全部' || bank.category === category
    const matchesQuery = !needle || `${bank.title} ${bank.shortTitle} ${bank.category} ${bank.description} ${bank.baseTags.join(' ')}`.toLowerCase().includes(needle)
    return matchesCategory && matchesQuery
  })

  return (
    <main className="question-bank-hub">
      <header className="bank-hub__topbar">
        <div className="bank-hub__identity">
          <span className="bank-hub__mark"><Layers3 aria-hidden="true" /></span>
          <div>
            <p>STUDY LIBRARY</p>
            <strong>题库中心</strong>
          </div>
        </div>
        <div className="bank-hub__actions">
          <button className="icon-button" type="button" onClick={onOpenDashboard} aria-label="打开学习概览" title="学习概览">
            <BarChart3 aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="打开阅读设置" title="阅读设置">
            <Settings2 aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="bank-hub__body">
        <section className="bank-hub__intro" aria-labelledby="bank-hub-title">
          <div>
            <p className="bank-hub__eyebrow">QUESTION BANKS</p>
            <h1 id="bank-hub-title">选择一个题库包</h1>
            <p>按知识方向独立维护题目、进度、复习计划与批注。</p>
          </div>
          <dl className="bank-hub__metrics" aria-label="题库总览">
            <div><dt>题库包</dt><dd>{banks.length}</dd></div>
            <div><dt>全部题目</dt><dd>{questions.length}</dd></div>
            <div><dt>已掌握</dt><dd>{totalMastered}</dd></div>
            <div><dt>待复习</dt><dd>{totalReview}</dd></div>
          </dl>
        </section>

        <section className="bank-hub__controls" aria-label="筛选题库包">
          <label className="bank-hub__search">
            <Search aria-hidden="true" />
            <span className="sr-only">搜索题库包</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索题库名称或知识方向" />
          </label>
          <div className="bank-hub__categories" role="tablist" aria-label="题库分类">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={category === item}
                className={category === item ? 'is-active' : ''}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {visibleBanks.length ? (
          <section className="bank-package-grid" aria-label="题库包列表">
            {visibleBanks.map((bank, index) => {
              const stats = statsForBank(bank, questions, state)
              const isCurrent = bank.id === currentBankId
              return (
                <article className="bank-package" data-tone={bank.tone} key={bank.id}>
                  <div className="bank-package__accent" aria-hidden="true" />
                  <div className="bank-package__head">
                    <span className="bank-package__index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="bank-package__category">{bank.category}</span>
                    {isCurrent && <span className="bank-package__current">最近打开</span>}
                  </div>
                  <div className="bank-package__copy">
                    <p>{bank.kicker}</p>
                    <h2>{bank.title}</h2>
                    <span>{bank.description}</span>
                  </div>
                  <div className="bank-package__tags" aria-label="知识标签">
                    {bank.baseTags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <div className="bank-package__progress">
                    <div>
                      <span>掌握进度</span>
                      <strong>{stats.mastered}/{stats.total}</strong>
                    </div>
                    <span className="bank-package__track" aria-label={`已掌握 ${stats.percent}%`}>
                      <span style={{ width: `${stats.percent}%` }} />
                    </span>
                  </div>
                  <footer className="bank-package__footer">
                    <div className="bank-package__status">
                      <span><BookOpenText aria-hidden="true" />已学习 {stats.started}</span>
                      <span><CheckCircle2 aria-hidden="true" />已掌握 {stats.mastered}</span>
                      {stats.review > 0 && <span><Clock3 aria-hidden="true" />待复习 {stats.review}</span>}
                    </div>
                    <button type="button" onClick={() => onOpenBank(bank)}>
                      {stats.started ? '继续学习' : '开始学习'}
                      <ArrowRight aria-hidden="true" />
                    </button>
                  </footer>
                </article>
              )
            })}
          </section>
        ) : (
          <section className="bank-hub__empty">
            <Search aria-hidden="true" />
            <h2>没有匹配的题库包</h2>
            <p>尝试更换关键词或分类。</p>
            <button type="button" onClick={() => { setQuery(''); setCategory('全部') }}>清除筛选</button>
          </section>
        )}
      </div>
    </main>
  )
}
