import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import MarketingLanding from './MarketingLanding'
import { isMarketingEntry } from './lib/entryRoute'
import { registerVisit } from './lib/visits'

const App = lazy(() => import('./App'))
const marketingEntry = isMarketingEntry(window.location)

function registerVisitAfterFirstPaint() {
  return new Promise<number | undefined>((resolve) => {
    const start = () => { void registerVisit().then(resolve) }
    window.requestAnimationFrame(() => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1500 })
      else globalThis.setTimeout(start, 0)
    })
  })
}

const visitRegistration = marketingEntry ? registerVisitAfterFirstPaint() : undefined

createRoot(document.getElementById('root')!).render(
  marketingEntry
    ? <MarketingLanding visitRegistration={visitRegistration} />
    : <Suspense fallback={
      <main className="load-state load-state--boot" aria-busy="true" aria-live="polite">
        <div className="load-state__panel">
          <div className="load-state__brand" aria-hidden="true">
            <span className="load-state__mark">边</span>
            <div>
              <span className="load-state__eyebrow">INTERVIEW MARGIN</span>
              <strong>面试边注</strong>
            </div>
          </div>
          <div className="load-state__copy">
            <span className="load-state__kicker">YOUR INTERVIEW WORKSPACE</span>
            <h1>正在准备你的题库工作台</h1>
            <p>题目、原理和复习进度马上就绪。</p>
          </div>
          <div className="load-state__line" aria-hidden="true"><span /></div>
          <div className="load-state__skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="load-state__hint">首次打开会加载题库目录，之后会更快。</span>
        </div>
      </main>
    }><App /></Suspense>,
)
