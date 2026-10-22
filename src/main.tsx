import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { installStartupErrorGuard } from './lib/startupHealth'
import { primeDiagnosticContext } from './lib/feedbackReport'
import { startTheme } from './lib/theme'
import { installBackButton } from './lib/backButton'

// Installed here, before anything else — genuinely as early as possible,
// so it can catch a startup-relevant error even before ErrorBoundary/App
// mount. See startupHealth.ts's own header comment for the full reasoning.
installStartupErrorGuard()

// Reads the OTA build once so bug reports never have to await it at tap
// time — see feedbackReport.ts's copyAndEmailReport() for why. Installed
// AFTER the error guard: it can't reject (fully caught), but the guard
// should exist before anything async starts regardless.
primeDiagnosticContext()

// The shared theme and numerals (§15t) — after the error guard, like the line
// above; the saved theme is already on screen (index.html's built-in early script).
startTheme()

// Android's back button on the home screen: an open dialog first, else to the
// background (lib/backButton.ts). A no-op elsewhere.
installBackButton()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
