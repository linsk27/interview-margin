import {
  ArrowRight, BookOpenCheck, BrainCircuit, Check, CheckCircle2, Highlighter,
  Layers3, MessageSquareText, RefreshCcw, Send, ShieldCheck, Sparkles, UserRoundPlus, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import './marketing.css'

type ContactKind = 'feedback' | 'account'

interface HealthSummary {
  banks: number
  questions: number
}

function BrandMark() {
  return <span className="marketing-brand__mark" aria-hidden="true"><BookOpenCheck /></span>
}

function ContactDialog({ kind, onClose }: { kind: ContactKind; onClose: () => void }) {
  const titleId = `contact-dialog-${kind}`
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
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
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
        <div><span>{isAccount ? 'ACCOUNT REQUEST' : 'PRODUCT FEEDBACK'}</span><h2 id={titleId}>{isAccount ? '申请学习账号' : '告诉我哪里还不好用'}</h2></div>
        <button type="button" className="contact-dialog__close" onClick={onClose} aria-label="关闭"><X /></button>
      </header>

      {submitState === 'success' ? <div className="contact-success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <h3>已经收到</h3>
        <p>{isAccount ? '申请不会自动建号。管理员审核后，会通过你留下的联系方式回复。' : '反馈已进入管理后台，谢谢你把问题说清楚。'}</p>
        <button type="button" onClick={onClose}>完成</button>
      </div> : <form className="contact-form" onSubmit={submit}>
        <p className="contact-dialog__intro">{isAccount
          ? '游客可以直接阅读和体验 AI；账号用于保存批注、收藏、进度与复习计划。'
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
        <label className="contact-consent"><input name="consent" type="checkbox" required /><span>同意将以上信息保存到本站，用于处理本次{isAccount ? '账号申请' : '反馈'}；处理完成后最多保留 30 天。</span></label>
        {error && <p className="contact-error" role="alert">{error}</p>}
        <footer><button type="button" className="button-secondary" onClick={onClose}>取消</button><button type="submit" className="button-primary" disabled={submitState === 'submitting'}>{submitState === 'submitting' ? <RefreshCcw className="is-spinning" /> : <Send />} {submitState === 'submitting' ? '提交中' : '提交'}</button></footer>
      </form>}
    </section>
  </div>
}

export default function MarketingLanding() {
  const [contactKind, setContactKind] = useState<ContactKind>()
  const [health, setHealth] = useState<HealthSummary>({ banks: 14, questions: 762 })

  useEffect(() => {
    fetch('/api/health', { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: Partial<HealthSummary>) => {
        if (Number.isInteger(payload.banks) && Number.isInteger(payload.questions)) {
          setHealth({ banks: payload.banks!, questions: payload.questions! })
        }
      }).catch(() => undefined)
  }, [])

  return <div className="marketing-page">
    <header className="marketing-header">
      <a className="marketing-brand" href="/" aria-label="面试边注首页"><BrandMark /><span><strong>面试边注</strong><small>INTERVIEW MARGIN</small></span></a>
      <nav aria-label="首页导航"><a href="#product">产品体验</a><a href="#workflow">使用方式</a><a href="#questions">常见问题</a></nav>
      <a className="header-cta" href="/app#question-banks">进入题库 <ArrowRight /></a>
    </header>

    <main>
      <section className="marketing-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span>762</span> 道持续校验的技术面试题</p>
          <h1 id="hero-title">把答案读懂，<br /><em>也把复习做完。</em></h1>
          <p className="hero-lead">不是把八股堆给你。面试边注把题目拆成速答、原理、实战、追问与避坑，让你先理解，再用批注和复习节奏真正记住。</p>
          <div className="hero-actions"><a className="button-primary" href="/app#question-banks">以游客身份开始 <ArrowRight /></a><a className="button-secondary" href="#workflow">看看怎么用</a></div>
          <ul className="hero-trust"><li><Check />游客可读全部公开题库</li><li><Check />可直接体验 AI 追问</li><li><Check />登录后才保存个人记忆</li></ul>
        </div>

        <figure className="product-preview" aria-label="面试边注阅读与复习界面示意">
          <div className="preview-topbar"><span>前端基础 · Q1</span><div><i className="is-active" />速答<i />原理<i />实战<i />追问</div><small>63%</small></div>
          <div className="preview-body">
            <aside><span>题库</span><strong>前端基础</strong><ul><li className="is-active">Q1 Vue 响应式</li><li>Q2 浏览器渲染</li><li>Q3 事件循环</li><li>Q4 React 更新</li></ul></aside>
            <article><p className="preview-kicker">INTERVIEW NOTES · Q1</p><h2>为什么 Vue 3 使用 Proxy？</h2><p className="preview-meta">2 分钟阅读 · 前端 · 工程化</p><div className="preview-answer"><strong>先背答案</strong><p>Proxy 代理整个对象，能拦截新增、删除与集合操作，让响应式边界更完整。</p></div><h3>先把两个概念说清楚</h3><div className="preview-list"><span><b>响应式</b>数据变化后，依赖它的界面重新计算。</span><span><b>Proxy</b>把对象操作统一交给代理层处理。</span></div></article>
            <div className="preview-notes"><span>本题工作区</span><strong>写下自己的理解</strong><div /><span className="preview-notes__action" aria-hidden="true">安排复习</span></div>
          </div>
          <figcaption><Sparkles /> 阅读、批注、复习与 AI 追问，在同一个学习上下文里完成。</figcaption>
        </figure>
      </section>

      <section className="proof-strip" aria-label="内容规模" aria-live="polite"><p><strong>{health.banks}</strong><span>个主题题库</span></p><p><strong>{health.questions}</strong><span>道在库题目</span></p><p><strong>6</strong><span>层答案结构</span></p><p><strong>0</strong><span>游客注册门槛</span></p></section>

      <section className="feature-section" id="product" aria-labelledby="feature-title">
        <header className="section-heading"><p>BUILT FOR UNDERSTANDING</p><h2 id="feature-title">不只是给答案，<br />而是帮你形成回答。</h2><span>从“看过”到“能讲”，每一步都有明确位置。</span></header>
        <div className="feature-grid">
          <article><span className="feature-number">01</span><BookOpenCheck /><h3>先给结论，再解释为什么</h3><p>速答用于面试开场；原理补概念、因果和边界。长段落会拆成对比、步骤或图解。</p></article>
          <article><span className="feature-number">02</span><Highlighter /><h3>把不会的地方留在原文旁</h3><p>登录后可高亮、批注和写本题总结。复习时回到当时卡住的位置，不必重新找上下文。</p></article>
          <article><span className="feature-number">03</span><BrainCircuit /><h3>让 AI 围绕当前题继续追问</h3><p>游客也能体验。AI 自动携带当前题目上下文，适合通俗解释、项目类比和模拟追问。</p></article>
        </div>
      </section>

      <section className="workflow-section" id="workflow" aria-labelledby="workflow-title">
        <div className="workflow-intro"><p>ONE QUIET LOOP</p><h2 id="workflow-title">一条不打断思路的学习路径</h2><span>不用先配置账号。先确认内容适不适合你，再决定是否留下学习记录。</span><a href="/app#question-banks">打开公开题库 <ArrowRight /></a></div>
        <ol className="workflow-list">
          <li><span>01</span><div><strong>游客先读</strong><p>选择方向，完整阅读题目、来源和图解，也可以调用 AI 解释。</p></div><BookOpenCheck /></li>
          <li><span>02</span><div><strong>遇到值得记的，再登录</strong><p>收藏、批注、总结和掌握状态只写入自己的学习账号。</p></div><Layers3 /></li>
          <li><span>03</span><div><strong>按 1 / 3 / 7 天回来</strong><p>把模糊的题加入复习队列，让系统记住下一次回看的时间。</p></div><RefreshCcw /></li>
        </ol>
      </section>

      <section className="contact-section" aria-labelledby="contact-title">
        <div><p>OPEN CHANNEL</p><h2 id="contact-title">看到问题，就直接告诉我。</h2><span>内容错误、交互建议和账号申请都会进入管理员工作区，不会丢进无人查看的邮箱。</span></div>
        <div className="contact-actions"><button type="button" onClick={() => setContactKind('feedback')}><MessageSquareText /><span><strong>提交反馈</strong><small>内容、样式或功能建议</small></span><ArrowRight /></button><button type="button" onClick={() => setContactKind('account')}><UserRoundPlus /><span><strong>申请账号</strong><small>保存批注与复习进度</small></span><ArrowRight /></button></div>
      </section>

      <section className="faq-section" id="questions" aria-labelledby="faq-title">
        <header><p>BEFORE YOU START</p><h2 id="faq-title">常见问题</h2></header>
        <div><details><summary>游客能看到多少内容？</summary><p>公开题库可完整阅读，也可以体验 AI。收藏、批注、学习状态和跨设备同步需要登录。</p></details><details><summary>申请账号后会自动注册吗？</summary><p>不会。管理员会先审核用途，再通过你留下的联系方式发出邀请或账号信息；本站不会要求你提交密码。</p></details><details><summary>题目内容来自哪里？</summary><p>题库结合真实社区面经、官方文档与高质量技术资料整理，题内尽量保留可核对的来源，并持续修正表述。</p></details></div>
      </section>
    </main>

    <footer className="marketing-footer"><a className="marketing-brand" href="/"><BrandMark /><span><strong>面试边注</strong><small>INTERVIEW MARGIN</small></span></a><p>为真正要讲清技术的人，做一张安静的学习桌。</p><div><button type="button" onClick={() => setContactKind('feedback')}>反馈</button><button type="button" onClick={() => setContactKind('account')}>申请账号</button><a href="https://github.com/linsk27/interview-margin" target="_blank" rel="noreferrer">GitHub</a></div></footer>
    {contactKind && <ContactDialog kind={contactKind} onClose={() => setContactKind(undefined)} />}
  </div>
}
