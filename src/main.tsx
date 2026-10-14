import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import './styles.css'
import { applyTheme } from './lib/theme'
import App from './App.tsx'

// The live app lives at www.firstcheq.ai; send anyone on the old Convex address there (same path), so her list stays in one place.
if (location.hostname === 'dazzling-fox-925.ap-southeast-2.convex.site') location.replace('https://www.firstcheq.ai' + location.pathname + location.search)

applyTheme('dark') // public pages are dark; the dashboard switches to its own theme

// No "Leave site?" prompt: a click counter still in flight when she heads to Google sign-in isn't unsaved work.
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string, { unsavedChangesWarning: false })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexAuthProvider>
  </StrictMode>,
)
