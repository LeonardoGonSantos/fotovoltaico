import type { PropsWithChildren } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { Stepper } from './Stepper'

export function AppShell({ children }: PropsWithChildren) {
  const {
    config: { steps },
  } = useAppState()

  return (
    <div className="app-container">
      <header style={{ background: 'linear-gradient(120deg, #0ea5e9, #2563eb)', color: 'white' }}>
        <div className="container" style={{ paddingBottom: '2rem', paddingTop: '2.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem' }}>Economia Solar — MVP</h1>
              <p style={{ margin: '0.5rem 0 0', maxWidth: '720px', color: 'rgba(255,255,255,0.86)' }}>
                Estime a área útil do telhado, dimensione seu sistema fotovoltaico e visualize a economia potencial em cinco etapas guiadas.
              </p>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>
              Utilize as ferramentas de seleção no mapa em modo satélite, ajuste manualmente inclinação e azimute e exporte um PDF com o resumo do projeto.
            </p>
          </div>
        </div>
      </header>

      <main>
        <div className="container">
          <Stepper steps={steps} />
          {children}
        </div>
      </main>

      <footer style={{ padding: '1.5rem 0', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
        Estimativas fornecidas para fins informativos. Dados de radiação via NASA POWER. Mapas © Google.
      </footer>
    </div>
  )
}
