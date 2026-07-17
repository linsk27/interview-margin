import { createRoot } from 'react-dom/client'
import '@fontsource-variable/noto-sans-sc/index.css'
import '@fontsource-variable/noto-serif-sc/index.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import App from './App'
import './styles.css'

if (window.location.hostname === 'interview-margin.vercel.app') {
  window.location.replace(`https://interview.linsk27.dpdns.org${window.location.pathname}${window.location.search}${window.location.hash}`)
}

createRoot(document.getElementById('root')!).render(<App />)
