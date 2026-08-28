import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/noto-sans-sc/wght.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import { isMarketingEntry } from './lib/entryRoute'

const MarketingLanding = lazy(() => import('./MarketingLanding'))
const App = lazy(() => import('./App'))

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<div aria-label="页面加载中" /> }>
    {isMarketingEntry(window.location) ? <MarketingLanding /> : <App />}
  </Suspense>,
)
