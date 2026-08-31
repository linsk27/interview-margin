import '@fontsource/zcool-xiaowei/400.css'

import {
  ArrowRight, BookOpenCheck, Bot, Check, CheckCircle2, ChevronRight,
  Highlighter, MessageSquareText, RefreshCcw, Search, Send, Sparkles,
  UserRoundPlus, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { PublicCatalogIndex } from './lib/api'
import { registerVisit } from './lib/visits'
import './marketing.css'

type ContactKind = 'feedback' | 'account'

interface LandingQuestion {
  id: string
  library: string
  title: string
  readMinutes: number
  sectionTitle: string
  sourceTitle?: string
}

interface LandingTrack {
  id: 'frontend' | 'java' | 'ai'
  title: string
  bankCount: number
  questionCount: number
  banks: Array<{ id: string; title: string; shortTitle: string }>
}

interface LandingPayload {
  version: 1
  summary: { banks: number; questions: number }
  featuredQuestions: LandingQuestion[]
  tracks: LandingTrack[]
}

interface MarketingLandingProps {
  visitRegistration?: Promise<number | undefined>
}

const visitNumberFormatter = new Intl.NumberFormat('zh-CN')

const FEATURED_QUESTION_IDS = [
  'q-1',
  '521d047b-e5d6-59b9-907a-cd7ad0de657a',
  '72d8195b-5fad-5cfc-8370-85a1379ca106',
]

const TRACK_DEFINITIONS: Array<{ id: LandingTrack['id']; title: string; bankIds: string[] }> = [
  { id: 'frontend', title: '前端工程', bankIds: ['javascript', 'git-engineering', 'vue-core', 'react-core', 'frontend-engineering'] },
  { id: 'java', title: 'Java 后端', bankIds: ['java-foundations', 'java-backend-interviews', 'database-cache', 'network-deployment'] },
  { id: 'ai', title: 'AI 应用开发', bankIds: ['frontend-ai-interviews', 'java-ai-applications', '360-ai-frontend'] },
]

const TRACK_COPY: Record<LandingTrack['id'], { mark: string; description: string; topics: string[]; href: string }> = {
  frontend: {
    mark: 'FE',
    description: '从语言基础到框架与浏览器，把常见追问连成一条完整前端路线。',
    topics: ['JavaScript', 'Vue / React', '浏览器', 'TypeScript', 'Git'],
    href: '/app#q-1',
  },
  java: {
    mark: 'JV',
    description: '先补齐 Java 基础，再进入 Spring、数据库、缓存与线上排障。',
    topics: ['集合与并发', 'JVM', 'Spring', 'MySQL / Redis', '分布式'],
    href: '/app#521d047b-e5d6-59b9-907a-cd7ad0de657a',
  },
  ai: {
    mark: 'AI',
    description: '面向真正的应用开发：模型接入、检索、Agent、工具与安全边界。',
    topics: ['RAG', 'Agent', 'MCP / Skill', '流式交互', 'Spring AI'],
    href: '/app#72d8195b-5fad-5cfc-8370-85a1379ca106',
  },
}

const QUESTION_LABELS: Record<string, string> = {
  interview: '前端',
  'java-foundations': 'Java',
  'java-ai-applications': 'AI 应用',
}

function landingFromIndex(index: PublicCatalogIndex): LandingPayload {
  const banksById = new Map(index.banks.map((bank) => [bank.id, bank]))
  const questions = index.banks.flatMap((bank) => bank.sections.flatMap((section) => section.questions))
  const questionsById = new Map(questions.map((question) => [question.id, question]))
  return {
    version: 1,
    summary: {
      banks: index.banks.length,
      questions: index.banks.reduce((total, bank) => total + bank.questionCount, 0),
    },
    featuredQuestions: FEATURED_QUESTION_IDS
      .map((id) => questionsById.get(id))
      .filter((question): question is NonNullable<typeof question> => Boolean(question))
      .map(({ id, library, title, readMinutes, sectionTitle, sources }) => ({
        id, library, title, readMinutes, sectionTitle, sourceTitle: sources?.[0]?.title,
      })),
    tracks: TRACK_DEFINITIONS.map((definition) => {
      const banks = definition.bankIds.map((id) => banksById.get(id)).filter((bank): bank is NonNullable<typeof bank> => Boolean(bank))
      return {
        id: definition.id,
        title: definition.title,
        bankCount: banks.length,
        questionCount: banks.reduce((total, bank) => total + bank.questionCount, 0),
        banks: banks.map(({ id, title, shortTitle }) => ({ id, title, shortTitle })),
      }
    }),
  }
}

async function fetchLandingPayload() {
  try {
    const response = await fetch('/api/landing', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    if (response.ok) return await response.json() as LandingPayload
  } catch {
    // Static catalog fallback keeps the public entrance useful during API maintenance.
  }
  const fallback = await fetch('/catalog-index.json', { headers: { Accept: 'application/json' } })
  if (!fallback.ok) throw new Error('公开题库暂时不可用。')
  return landingFromIndex(await fallback.json() as PublicCatalogIndex)
}

function BrandMark() {
  return <span className="marketing-brand__mark" aria-hidden="true"><BookOpenCheck /></span>
}

function ContactDialog({ kind, onClose }: { kind: ContactKind; onClose: () => void }) {
  const titleId = 'contact-dialog-' + kind
  const panelRef = useRef<HTMLElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstFieldRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled])',
      ))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitState('submitting')
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/contact-requests', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          name: form.get('name'),
          contact: form.get('contact'),
          message: form.get('message'),
          consent: form.get('consent') === 'on',
          website: form.get('website'),
        }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(payload.error || '提交失败，请稍后重试。')
      setSubmitState('success')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '提交失败，请稍后重试。')
      setSubmitState('idle')
    }
  }

  const isAccount = kind === 'account'
  return <div className="contact-overlay" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section ref={panelRef} className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="contact-dialog__header">
        <div className="contact-dialog__icon" aria-hidden="true">{isAccount ? <UserRoundPlus /> : <MessageSquareText />}</div>
        <div><span>{isAccount ? '学习账号' : '产品反馈'}</span><h2 id={titleId}>{isAccount ? '申请学习账号' : '告诉我哪里还不好用'}</h2></div>
        <button type="button" className="contact-dialog__close" onClick={onClose} aria-label="关闭"><X /></button>
      </header>

      {submitState === 'success' ? <div className="contact-success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <h3>已经收到</h3>
        <p>{isAccount ? '申请不会自动建号。管理员审核后，会通过你留下的联系方式回复。' : '反馈已进入管理后台，谢谢你把问题说清楚。'}</p>
        <button type="button" onClick={onClose}>完成</button>
      </div> : <form className="contact-form" onSubmit={submit}>
        <p className="contact-dialog__intro">{isAccount
          ? '游客可以直接读题和体验 AI；账号用于保存批注、收藏、进度与复习计划。'
          : '可提交内容错误、交互问题或功能建议。若希望收到回复，请留下联系方式。'}</p>
        <label>怎么称呼你
          <input ref={firstFieldRef} name="name" required maxLength={80} autoComplete="name" placeholder="例如：Linda" />
        </label>
        <label>联系方式{isAccount ? '' : '（可选）'}
          <input name="contact" required={isAccount} maxLength={160} autoComplete="email" placeholder="邮箱、微信或其他可联系到你的方式" />
        </label>
        <label>{isAccount ? '简单说说你的使用需求' : '反馈内容'}
          <textarea name="message" required minLength={10} maxLength={2000} rows={5}
            placeholder={isAccount ? '例如：正在准备前端 × AI 面试，希望保存复习进度。' : '请描述发生了什么、你原本希望怎样。'} />
        </label>
        <label className="contact-honeypot" aria-hidden="true">网站<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label className="contact-consent"><input name="consent" type="checkbox" required /><span>同意将以上信息保存到本站，用于处理本次{isAccount ? '账号申请' : '反馈'}。</span></label>
        {error && <p className="contact-error" role="alert">{error}</p>}
        <footer><button type="button" className="button-secondary" onClick={onClose}>取消</button><button type="submit" className="button-primary" disabled={submitState === 'submitting'}>{submitState === 'submitting' ? <RefreshCcw className="is-spinning" /> : <Send />} {submitState === 'submitting' ? '提交中' : '提交'}</button></footer>
      </form>}
    </section>
  </div>
}

function LandingLoadError({ onRetry }: { onRetry: () => void }) {
  return <div className="landing-load-error" role="alert">
    <strong>题库数据暂时没有加载出来</strong>
    <span>页面主体仍可浏览，重新连接后再试一次。</span>
    <button type="button" onClick={onRetry}>重新加载 <RefreshCcw /></button>
  </div>
}

function QuestionShelf({ questions, state, onRetry }: {
  questions?: LandingQuestion[]
  state: 'loading' | 'ready' | 'error'
  onRetry: () => void
}) {
  if (state === 'error') return <LandingLoadError onRetry={onRetry} />
  if (!questions?.length) {
    return <div className="question-shelf question-shelf--loading" aria-label="正在读取真实题目">
      {[0, 1, 2].map((index) => <div key={index}><span /><strong /><i /></div>)}
    </div>
  }
  return <div className="question-shelf">
    {questions.map((question, index) => <a key={question.id} href={'/app#' + question.id} className={'question-card question-card--' + (index + 1)}>
      <div className="question-card__meta">
        <span>{QUESTION_LABELS[question.library] ?? question.sectionTitle}</span>
        <small>{question.readMinutes} 分钟</small>
      </div>
      <strong>{question.title.replace(/^Q\d+[：:]\s*/, '')}</strong>
      <small className="question-card__source">{question.sourceTitle ?? `${question.sectionTitle} · 题库内公开题`}</small>
      <div className="question-card__footer"><span>打开题目</span><ArrowRight /></div>
    </a>)}
  </div>
}

export default function MarketingLanding({ visitRegistration }: MarketingLandingProps = {}) {
  const [contactKind, setContactKind] = useState<ContactKind>()
  const [landing, setLanding] = useState<LandingPayload>()
  const [landingState, setLandingState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [landingAttempt, setLandingAttempt] = useState(0)
  const [visitTotal, setVisitTotal] = useState<number>()

  useEffect(() => {
    let active = true
    ;(visitRegistration ?? registerVisit()).then((total) => {
      if (active && total !== undefined) setVisitTotal(total)
    })
    return () => { active = false }
  }, [visitRegistration])

  useEffect(() => {
    let active = true
    setLandingState('loading')
    fetchLandingPayload().then((payload) => {
      if (!active) return
      setLanding(payload)
      setLandingState('ready')
    }).catch(() => {
      if (active) setLandingState('error')
    })
    return () => { active = false }
  }, [landingAttempt])

  const retryLanding = () => setLandingAttempt((attempt) => attempt + 1)

  return <div className="marketing-page">
    <header className="marketing-header">
      <a className="marketing-brand" href="/" aria-label="面试边注首页"><BrandMark /><span><strong>面试边注</strong><small>INTERVIEW MARGIN</small></span></a>
      <nav aria-label="首页导航"><a href="#questions">先试一题</a><a href="#paths">题库路线</a><a href="#guest">游客能做什么</a></nav>
      <a className="header-cta" href="/app#question-banks">开始刷题 <ArrowRight /></a>
    </header>

    <main>
      <section className="marketing-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="hero-kicker">
            <span className="hero-kicker__line" aria-hidden="true" />
            <span className="hero-kicker__catalog">{landing
              ? landing.summary.banks + ' 个公开题库 · ' + landing.summary.questions + ' 道题'
              : landingState === 'error'
                ? <button type="button" onClick={retryLanding}>题库数据加载失败，点此重试</button>
                : '公开题库正在同步'}</span>
            {visitTotal !== undefined && <>
              <span className="hero-kicker__separator" aria-hidden="true">·</span>
              <span className="hero-kicker__visits" role="status" aria-atomic="true"
                aria-label={`累计访问 ${visitNumberFormatter.format(visitTotal)} 次；同一浏览器 24 小时内只计一次`}
                title="同一浏览器 24 小时内只计一次">
                累计 {visitNumberFormatter.format(visitTotal)} 次访问
              </span>
            </>}
          </p>
          <h1 id="hero-title"><span>别急着背答案，</span><em>先把这道题讲明白。</em></h1>
          <p className="hero-lead">这里整理了前端、Java 后端和 AI 应用面试题。先自己组织答案，再看结论、为什么、边界与追问；卡住时，让 AI 换一种说法。</p>
          <div className="hero-actions"><a className="button-primary" href="/app#question-banks">开始刷题 <ArrowRight /></a><a className="button-text" href="#questions">先试三道真实题 <ChevronRight /></a></div>
          <p className="hero-note"><Check />无需注册即可读题和试用 AI；登录后才保存个人学习记录。</p>
        </div>
        <aside className="hero-note-card" aria-label="学习提示">
          <Sparkles aria-hidden="true" />
          <p>能讲清楚，<br />才算真的会。</p>
          <span>先答 · 再看 · 再追问</span>
        </aside>
      </section>

      <section className="sample-section" id="questions" aria-labelledby="sample-title">
        <header className="section-heading">
          <span className="section-index">01</span>
          <div><h2 id="sample-title">先试三道高频题</h2><p>不是产品截图，点击就是题库里的真实内容。</p></div>
          <a href="/app#question-banks">查看全部题库 <ArrowRight /></a>
        </header>
        <QuestionShelf questions={landing?.featuredQuestions} state={landingState} onRetry={retryLanding} />
      </section>

      <section className="paths-section" id="paths" aria-labelledby="paths-title">
        <header className="section-heading">
          <span className="section-index">02</span>
          <div><h2 id="paths-title"><span>按方向开始，</span><span>不必逛完整目录。</span></h2><p>选最接近下一场面试的路线。</p></div>
        </header>
        {landingState === 'error' ? <LandingLoadError onRetry={retryLanding} /> : <div className="track-grid">
          {(landing?.tracks ?? []).map((track) => {
            const copy = TRACK_COPY[track.id]
            return <article key={track.id} className={'track-card track-card--' + track.id}>
              <div className="track-card__top"><span>{copy.mark}</span><small>{track.questionCount} 题 · {track.bankCount} 个题库</small></div>
              <h3>{track.title}</h3>
              <p>{copy.description}</p>
              <ul>{copy.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
              <a href={copy.href}>从这题开始 <ArrowRight /></a>
            </article>
          })}
          {!landing && [0, 1, 2].map((index) => <article className="track-card track-card--loading" key={index} aria-hidden="true"><span /><strong /><p /><i /></article>)}
        </div>}
        <p className="paths-footnote">另外还有简历专项，以及 API、鉴权与 Node / Flask 等独立题库。</p>
      </section>

      <section className="practice-section" aria-labelledby="practice-title">
        <div className="practice-copy">
          <span className="section-index">03</span>
          <h2 id="practice-title"><span>一道题，</span><span>不只是翻答案。</span></h2>
          <p>把“看起来懂了”变成“面试时能讲”，中间需要一次主动回忆和一次真实追问。</p>
        </div>
        <ol className="practice-steps">
          <li><span>1</span><div><strong>先答</strong><p>先写关键词，或者在脑中组织一遍。</p></div></li>
          <li><span>2</span><div><strong>再对照</strong><p>按速答、原理、场景和边界逐项检查。</p></div></li>
          <li><span>3</span><div><strong>继续追问</strong><p>AI 带着当前题，换说法或模拟面试官。</p></div></li>
          <li><span>4</span><div><strong>安排复习</strong><p>需要记住时，再登录保存学习状态。</p></div></li>
        </ol>
      </section>

      <section className="access-section" id="guest" aria-labelledby="access-title">
        <div className="access-intro">
          <span className="section-index">04</span>
          <h2 id="access-title"><span>游客先试，</span><span>记录以后再留。</span></h2>
          <p>题库不是登录后的诱饵。公开内容和 AI 体验对游客开放，账号只负责你的个人记忆。</p>
          <a className="button-primary" href="/app#question-banks">继续游客阅读 <ArrowRight /></a>
        </div>
        <div className="access-list">
          <article>
            <header><Search /><div><strong>游客可以</strong><span>直接开始，不注册</span></div></header>
            <ul><li><Check />完整阅读公开题库</li><li><Check />搜索、筛选与练习模式</li><li><Check />围绕当前题向 AI 追问</li><li><Check />查看图解与可核对来源</li></ul>
          </article>
          <article>
            <header><Highlighter /><div><strong>登录后增加</strong><span>保存自己的学习痕迹</span></div></header>
            <ul><li><Check />阅读进度与掌握状态</li><li><Check />收藏、高亮、批注与总结</li><li><Check />复习队列与跨设备同步</li><li><Check />学习数据导入与导出</li></ul>
            <button type="button" onClick={() => setContactKind('account')}>申请学习账号 <ChevronRight /></button>
          </article>
        </div>
      </section>

      <section className="final-cta" aria-labelledby="final-title">
        <div><Bot aria-hidden="true" /><span>游客也可以直接体验 AI 追问</span></div>
        <h2 id="final-title">从一道真正会讲的题开始。</h2>
        <a className="button-primary" href="/app#question-banks">打开题库 <ArrowRight /></a>
      </section>
    </main>

    <footer className="marketing-footer">
      <a className="marketing-brand" href="/"><BrandMark /><span><strong>面试边注</strong><small>INTERVIEW MARGIN</small></span></a>
      <p>给认真准备下一场面试的人。</p>
      <div><button type="button" onClick={() => setContactKind('feedback')}>反馈</button><button type="button" onClick={() => setContactKind('account')}>申请账号</button><a href="https://github.com/linsk27/interview-margin" target="_blank" rel="noreferrer">GitHub</a></div>
    </footer>
    {contactKind && <ContactDialog kind={contactKind} onClose={() => setContactKind(undefined)} />}
  </div>
}
