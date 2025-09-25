import { createContext, useContext, useMemo, useState } from 'react'

export type ActionVariant = 'primary' | 'secondary'

export interface ActionButtonConfig {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: ActionVariant
}

export interface LayoutState {
  title: string
  subtitle?: string | null
  actions: ActionButtonConfig[]
}

interface LayoutContextValue {
  layout: LayoutState
  setLayout: (state: LayoutState) => void
  resetLayout: () => void
}

const DEFAULT_LAYOUT: LayoutState = {
  title: '',
  subtitle: null,
  actions: [],
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined)

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayoutState] = useState<LayoutState>(DEFAULT_LAYOUT)

  const value = useMemo<LayoutContextValue>(
    () => ({
      layout,
      setLayout: (state: LayoutState) => setLayoutState(state),
      resetLayout: () => setLayoutState(DEFAULT_LAYOUT),
    }),
    [layout]
  )

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLayout() {
  const ctx = useContext(LayoutContext)
  if (!ctx) {
    throw new Error('useLayout deve ser usado dentro de LayoutProvider')
  }
  return ctx
}
