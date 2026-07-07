import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './lib/auth.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        {/* Respect the user's OS-level reduced-motion setting for all
            framer-motion animations. */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)

// iOS standalone PWAs often don't re-check for a new service worker when you
// just switch back to an already-open app, so a fresh deploy can look stale.
// Nudge the check whenever the app returns to the foreground; the plugin's
// autoUpdate registration (with skipWaiting) handles activating + reloading if
// there's a new version. No-op in dev, where no SW is registered.
if ('serviceWorker' in navigator) {
  const checkForUpdates = () => {
    if (document.visibilityState !== 'visible') return
    navigator.serviceWorker.getRegistration().then((reg) => reg && reg.update()).catch(() => {})
  }
  document.addEventListener('visibilitychange', checkForUpdates)
  window.addEventListener('focus', checkForUpdates)
}
