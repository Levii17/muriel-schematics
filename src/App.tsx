import { lazy, Suspense } from 'react'
import { Header } from './components/Header'
import { Library } from './components/Library'
import { useRoute, useTheme, useToast } from './lib/hooks'

// The editor is only needed on its own route, so keep it out of the initial bundle.
const Editor = lazy(() => import('./editor/Editor'))

export default function App() {
  const route = useRoute()
  const [theme, toggleTheme] = useTheme()
  const [toast, showToast] = useToast()

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header view={route.name} theme={theme} onToggleTheme={toggleTheme} />
      <main id="main" className={route.name === 'editor' ? 'main-editor' : 'main-library'}>
        {route.name === 'library' ? (
          <Library openId={route.symbol} onToast={showToast} />
        ) : (
          <Suspense fallback={<p className="loading">Loading editor…</p>}>
            <Editor armId={route.arm} loadExample={route.example} onToast={showToast} />
          </Suspense>
        )}
      </main>
      <div className="toast" role="status" aria-live="polite">
        {toast && <span>{toast}</span>}
      </div>
    </>
  )
}
