interface NavbarProps {
  title: string
  subtitle?: string | null
  onMenuClick?: () => void
}

export function Navbar({ title, subtitle, onMenuClick }: NavbarProps) {
  return (
    <header className="navbar">
      <button
        type="button"
        className="navbar-menu"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        ☰
      </button>
      <div className="navbar-texts">
        <h1>{title || 'Economia Solar'}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </header>
  )
}
