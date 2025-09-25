import { AppStateProvider } from './context/AppStateContext'
import { LayoutProvider } from './context/LayoutContext'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './routes/HomePage'

export default function App() {
  return (
    <AppStateProvider>
      <LayoutProvider>
        <AppShell>
          <HomePage />
        </AppShell>
      </LayoutProvider>
    </AppStateProvider>
  )
}
