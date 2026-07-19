import { createContext, useContext, useState, useCallback, useMemo, ReactNode, JSX } from 'react'

export interface AppState {
  // Platform
  useWeb: boolean
  isMobile: boolean
  isChina: boolean
  useHMS: boolean
  isGMSorApple: boolean
  useHMSdefault: boolean

  // Content
  ScienceMinorId: number
  WebsiteStatus: string | null
  WebAppendix: string | null

  // Quran
  QuranChapter: number | null
  QuranVerse: number | null
  QuranId: string
  ExegesisURL: string | null
}

export interface AppStateContextType {
  state: AppState
  setState: (updates: Partial<AppState>) => void
}

const defaultState: AppState = {
  // Platform — useWeb defaults TRUE on all OS (manual toggle via OS_WebToggle, Sprint 6b)
  useWeb: true,
  isMobile: true,
  isChina: false,
  useHMS: false,
  isGMSorApple: false,
  useHMSdefault: false,

  // Content
  ScienceMinorId: 0,
  WebsiteStatus: null,
  WebAppendix: null,

  // Quran
  QuranChapter: null,
  QuranVerse: null,
  QuranId: '',
  ExegesisURL: null,
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
