import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import MarketingLanding from './MarketingLanding'
import { isMarketingEntry } from './lib/entryRoute'
import { registerVisit } from './lib/visits'
import './boot.css'

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
      <main className="boot-screen" role="status" aria-busy="true" aria-live="polite">
        <div className="load-state__panel">
          <div className="load-state__brand" aria-hidden="true">
            <span className="load-state__mark">边</span>
            <div>
              <span className="load-state__eyebrow">INTERVIEW MARGIN</span>
              <strong>面试边注</strong>
            </div>
          </div>
          <div className="load-state__copy">
            <h1>正在打开题库</h1>
            <p>正在载入学习工作台，请稍候。</p>
          </div>
          <div className="load-state__line" aria-hidden="true"><span /></div>
          <span className="load-state__hint">首次打开可能需要几秒钟</span>
        </div>
      </main>
    }><App /></Suspense>,
)
