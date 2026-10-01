import { GitHubIcon, MoonIcon, SunIcon } from '@/shared/Icons'

interface Props {
  view: 'library' | 'editor'
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({ view, theme, onToggleTheme }: Props) {
  return (
    <header className="site-header">
      <a className="brand" href="#/" aria-label="Muriel Schematics, home">
        <img src={`${import.meta.env.BASE_URL}brand/muriel-mark.png`} width={30} height={30} alt="" />
        <span className="brand-name">
          Muriel<span className="brand-sub">Schematics</span>
        </span>
      </a>
      <nav className="tabs" aria-label="Sections">
        <a href="#/" aria-current={view === 'library' ? 'page' : undefined}>
          Library
        </a>
        <a href="#/editor" aria-current={view === 'editor' ? 'page' : undefined}>
          Editor
        </a>
      </nav>
      <div className="header-end">
        <a className="icon-btn" href="https://github.com/levii17/symbol-library" target="_blank" rel="noreferrer" aria-label="View source on GitHub" title="Source on GitHub">
          <GitHubIcon />
        </a>
        <button type="button" className="icon-btn" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Toggle theme">
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  )
}
