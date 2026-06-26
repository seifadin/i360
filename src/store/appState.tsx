import { createContext, useContext, useState, ReactNode, JSX } from 'react'

export interface AppState {
  useWeb: boolean
  isMobile: boolean
  isChina: boolean
  useHMS: boolean
  isGMSorApple: boolean
  useHMSdefault: boolean
  ScienceMinorId: number
  WebsiteStatus: string | null
  WebAppendix: string | null
  QuranChapter: number | null
  QuranVerse: number | null
  QuranId: string
  ExegesisURL: string | null
  i360dbqEOF: number | null
  i360dbqPages: number
  VersionVisibility: boolean
}

export interface AppStateContextType {
  state: AppState
  setState: (updates: Partial<AppState>) => void
}

const defaultState: AppState = {
  useWeb: false,
  isMobile: true,
  isChina: false,
  useHMS: false,
  isGMSorApple: false,
  useHMSdefault: false,
  ScienceMinorId: 0,
  WebsiteStatus: null,
  WebAppendix: null,
  QuranChapter: null,
  QuranVerse: null,
  QuranId: '',
  ExegesisURL: null,
  i360dbqEOF: null,
  i360dbqPages: 1,
  VersionVisibility: false,
}

const AppStateContext = createContext<AppStateContextType | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setStateRaw] = useState<AppState>(defaultState)
  const setState = (updates: Partial<AppState>) =>
    setStateRaw(prev => ({ ...prev, ...updates }))
  return (
    <AppStateContext.Provider value={{ state, setState }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState(): AppStateContextType {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider')
  return ctx
}
