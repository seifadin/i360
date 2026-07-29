import { createContext, useContext, useState, useCallback, useMemo, ReactNode, JSX } from 'react'

export interface AppState {
  // Platform
  useWeb: boolean
  isChina: boolean
  useHMS: boolean

  // Content
  WebAppendix: string | null
}

export interface AppStateContextType {
  state: AppState
  setState: (updates: Partial<AppState>) => void
}

const defaultState: AppState = {
  // Platform — useWeb defaults TRUE on all OS (manual toggle via OS_WebToggle, Sprint 6b)
  useWeb: true,
  isChina: false,
  useHMS: false,

  // Content
  WebAppendix: null,
}

const AppStateContext = createContext<AppStateContextType | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setStateRaw] = useState<AppState>(defaultState)
  const setState = useCallback(
    (updates: Partial<AppState>) => setStateRaw(prev => ({ ...prev, ...updates })),
    []
  )
  const value = useMemo(() => ({ state, setState }), [state, setState])
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState(): AppStateContextType {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider')
  return ctx
}
