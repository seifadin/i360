import { createContext, useContext, useState, useCallback, useMemo, ReactNode, JSX } from 'react'

export interface AppState {
  // Platform
  useWeb: boolean
  isChina: boolean
  useHMS: boolean
  // Desktop-simulator target only: simulate iOS (Apple links) instead of
  // Android. 5th app variable, added 2026-08-19 for the three-way
  // Google→Huawei→Apple cycle — genuinely read (resolveEffectiveOS,
  // computeIsGMSorApple) and written (OSRow's cycle control), unlike the
  // 11 removed as write-only in earlier rounds. Only ever consulted when
  // detectOS()==='web' && !useWeb, so it's inert on real devices and in
  // web mode by construction — no stale-flag leak possible (the class of
  // bug computeUseHuawei's !useWeb gate exists for).
  simIOS: boolean
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
  simIOS: false, // simulator starts on Android (Google) — today's exact behavior
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
