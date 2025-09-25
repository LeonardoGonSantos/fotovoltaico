import type { PropsWithChildren } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { useLayout } from '../../context/LayoutContext'
import { Stepper } from './Stepper'
import { Navbar } from './Navbar'
import { BottomActions } from './BottomActions'

export function AppShell({ children }: PropsWithChildren) {
  const {
    config: { steps },
  } = useAppState()
  const { layout } = useLayout()

  return (
    <div className="app-shell">
      <Navbar title={layout.title || 'Economia Solar'} subtitle={layout.subtitle} />
      <main className="app-main">
        <div className="app-main-inner">
          <Stepper steps={steps} />
          <div className="app-content">{children}</div>
          <p className="disclaimer">Estimativas informativas. Dados de radiação via NASA POWER. Mapas © Google.</p>
        </div>
      </main>
      <BottomActions actions={layout.actions} />
    </div>
  )
}
