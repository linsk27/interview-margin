import { createRoot } from 'react-dom/client'
import '@fontsource-variable/noto-sans-sc/index.css'
import '@fontsource-variable/noto-serif-sc/index.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(<App />)
