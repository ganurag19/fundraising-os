import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import './styles.css'
import App from './App.tsx'

// The live app lives at www.firstcheq.ai; send anyone on the old Convex address there (same path), so her list stays in one place.
if (location.hostname === 'dazzling-fox-925.ap-southeast-2.convex.site') location.replace('https://www.firstcheq.ai' + location.pathname + location.search)

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexAuthProvider>
  </StrictMode>,
)
