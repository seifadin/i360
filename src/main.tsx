import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { installStartupErrorGuard } from './lib/startupHealth'

// Installed here, before anything else — genuinely as early as possible,
// so it can catch a startup-relevant error even before ErrorBoundary/App
// mount. See startupHealth.ts's own header comment for the full reasoning.
installStartupErrorGuard()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
