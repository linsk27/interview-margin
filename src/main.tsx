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
    : <Suspense fallback={<main className="load-state" aria-live="polite"><p>正在打开题库…</p></main>}><App /></Suspense>,
)
