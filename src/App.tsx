import { AppStateProvider } from './context/AppStateContext'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './routes/HomePage'

export default function App() {
  return (
    <AppStateProvider>
      <AppShell>
        <HomePage />
      </AppShell>
    </AppStateProvider>
  )
}
