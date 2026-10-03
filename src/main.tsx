import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { installStartupErrorGuard } from './lib/startupHealth'
import { primeDiagnosticContext } from './lib/feedbackReport'

// Installed here, before anything else — genuinely as early as possible,
// so it can catch a startup-relevant error even before ErrorBoundary/App
// mount. See startupHealth.ts's own header comment for the full reasoning.
installStartupErrorGuard()

// Reads the OTA build once so bug reports never have to await it at tap
// time — see feedbackReport.ts's copyAndEmailReport() for why. Installed
// AFTER the error guard: it can't reject (fully caught), but the guard
// should exist before anything async starts regardless.
primeDiagnosticContext()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
