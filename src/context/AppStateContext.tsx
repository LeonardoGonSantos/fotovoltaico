import { createContext, useCallback, useContext, useMemo, useReducer } from 'react'
import type {
  Angles,
  AppConfig,
  BillInput,
  DataSource,
  PlaceSelection,
  ResultMonth,
  RoofSelection,
  SolarBuildingInsights,
  SolarSelection,
  Summary,
} from '../types/domain'
import { DEFAULT_APP_CONFIG, DEFAULT_SOLAR_PARAMS, STEP_DEFINITIONS } from './appConfig'

interface AppState {
  currentStepIndex: number
  place: PlaceSelection | null
  roof: RoofSelection | null
  angles: Angles
  bill: BillInput
  dataSource: DataSource
  solarInsights: SolarBuildingInsights | null
  solarSelection: SolarSelection
  solarStatus: 'idle' | 'loading' | 'success' | 'error'
  solarError: string | null
  monthlyResults: ResultMonth[] | null
  summary: Summary | null
  isCalculating: boolean
  nasaError: string | null
}

type AppAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_PLACE'; payload: PlaceSelection | null }
  | { type: 'SET_ROOF'; payload: RoofSelection | null }
  | { type: 'SET_ANGLES'; payload: Partial<Angles> }
  | { type: 'SET_BILL'; payload: Partial<BillInput> }
  | { type: 'SET_DATASOURCE'; payload: DataSource }
  | { type: 'SET_SOLAR_STATUS'; payload: { status: AppState['solarStatus']; error?: string | null } }
  | { type: 'SET_SOLAR_INSIGHTS'; payload: SolarBuildingInsights | null }
  | { type: 'SET_SOLAR_SELECTION'; payload: Partial<SolarSelection> }
  | { type: 'SET_RESULTS'; payload: { summary: Summary; results: ResultMonth[] } }
  | { type: 'CLEAR_RESULTS' }
  | { type: 'SET_CALCULATING'; payload: boolean }
  | { type: 'SET_NASA_ERROR'; payload: string | null }

const INITIAL_BILL: BillInput = {
  monthlySpendBRL: null,
  tariffBRLkWh: null,
  monthlyConsumptionKWh: null,
  compensationTargetPct: DEFAULT_SOLAR_PARAMS.compensationTargetDefaultPct,
}

const INITIAL_STATE: AppState = {
  currentStepIndex: 0,
  place: null,
  roof: null,
  angles: {
    betaDeg: DEFAULT_SOLAR_PARAMS.defaultTiltDeg,
    gammaDeg: DEFAULT_SOLAR_PARAMS.defaultAzimuthDeg,
  },
  bill: INITIAL_BILL,
  dataSource: 'SOLAR_API',
  solarInsights: null,
  solarSelection: { source: 'SOLAR_API', segmentId: null, manualOverride: false },
  solarStatus: 'idle',
  solarError: null,
  monthlyResults: null,
  summary: null,
  isCalculating: false,
  nasaError: null,
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStepIndex: action.payload }
    case 'SET_PLACE':
      return { ...state, place: action.payload }
    case 'SET_ROOF':
      return { ...state, roof: action.payload }
    case 'SET_ANGLES':
      return { ...state, angles: { ...state.angles, ...action.payload } }
    case 'SET_BILL':
      return { ...state, bill: { ...state.bill, ...action.payload } }
    case 'SET_DATASOURCE':
      return {
        ...state,
        dataSource: action.payload,
        solarSelection: {
          ...state.solarSelection,
          source: action.payload,
          manualOverride: action.payload === 'MANUAL' ? true : state.solarSelection.manualOverride,
        },
      }
    case 'SET_SOLAR_STATUS':
      return {
        ...state,
        solarStatus: action.payload.status,
        solarError: action.payload.error ?? null,
      }
    case 'SET_SOLAR_INSIGHTS':
      return {
        ...state,
        solarInsights: action.payload,
      }
    case 'SET_SOLAR_SELECTION':
      return {
        ...state,
        solarSelection: {
          ...state.solarSelection,
          ...action.payload,
        },
      }
    case 'SET_RESULTS':
      return {
        ...state,
        monthlyResults: action.payload.results,
        summary: action.payload.summary,
        nasaError: null,
      }
    case 'CLEAR_RESULTS':
      return { ...state, monthlyResults: null, summary: null }
    case 'SET_CALCULATING':
      return { ...state, isCalculating: action.payload }
    case 'SET_NASA_ERROR':
      return { ...state, nasaError: action.payload }
    default:
      return state
  }
}

interface AppStateContextValue {
  config: AppConfig
  state: AppState
  setStep: (index: number) => void
  nextStep: () => void
  previousStep: () => void
  setPlace: (place: PlaceSelection | null) => void
  setRoof: (roof: RoofSelection | null) => void
  setAngles: (angles: Partial<Angles>) => void
  setBill: (bill: Partial<BillInput>) => void
  setDataSource: (source: DataSource) => void
  setSolarStatus: (status: AppState['solarStatus'], error?: string | null) => void
  setSolarInsights: (insights: SolarBuildingInsights | null) => void
  setSolarSelection: (selection: Partial<SolarSelection>) => void
  setResults: (summary: Summary, results: ResultMonth[]) => void
  clearResults: () => void
  setCalculating: (value: boolean) => void
  setNasaError: (error: string | null) => void
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const setStep = useCallback((index: number) => {
    dispatch({ type: 'SET_STEP', payload: index })
  }, [])

  const nextStep = useCallback(() => {
    dispatch({ type: 'SET_STEP', payload: Math.min(state.currentStepIndex + 1, STEP_DEFINITIONS.length - 1) })
  }, [state.currentStepIndex])

  const previousStep = useCallback(() => {
    dispatch({ type: 'SET_STEP', payload: Math.max(state.currentStepIndex - 1, 0) })
  }, [state.currentStepIndex])

  const setPlace = useCallback((place: PlaceSelection | null) => {
    dispatch({ type: 'SET_PLACE', payload: place })
  }, [])

  const setRoof = useCallback((roof: RoofSelection | null) => {
    dispatch({ type: 'SET_ROOF', payload: roof })
  }, [])

  const setAngles = useCallback((angles: Partial<Angles>) => {
    dispatch({ type: 'SET_ANGLES', payload: angles })
  }, [])

  const setBill = useCallback((bill: Partial<BillInput>) => {
    dispatch({ type: 'SET_BILL', payload: bill })
  }, [])

  const setResults = useCallback((summary: Summary, results: ResultMonth[]) => {
    dispatch({ type: 'SET_RESULTS', payload: { summary, results } })
  }, [])

  const setDataSource = useCallback((source: DataSource) => {
    dispatch({ type: 'SET_DATASOURCE', payload: source })
  }, [])

  const setSolarStatus = useCallback((status: AppState['solarStatus'], error?: string | null) => {
    dispatch({ type: 'SET_SOLAR_STATUS', payload: { status, error } })
  }, [])

  const setSolarInsights = useCallback((insights: SolarBuildingInsights | null) => {
    dispatch({ type: 'SET_SOLAR_INSIGHTS', payload: insights })
  }, [])

  const setSolarSelection = useCallback((selection: Partial<SolarSelection>) => {
    dispatch({ type: 'SET_SOLAR_SELECTION', payload: selection })
  }, [])

  const clearResults = useCallback(() => {
    dispatch({ type: 'CLEAR_RESULTS' })
  }, [])

  const setCalculating = useCallback((value: boolean) => {
    dispatch({ type: 'SET_CALCULATING', payload: value })
  }, [])

  const setNasaError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_NASA_ERROR', payload: error })
  }, [])

  const value = useMemo<AppStateContextValue>(
    () => ({
      config: DEFAULT_APP_CONFIG,
      state,
      setStep,
      nextStep,
      previousStep,
      setPlace,
      setRoof,
      setAngles,
      setBill,
      setDataSource,
      setSolarStatus,
      setSolarInsights,
      setSolarSelection,
      setResults,
      clearResults,
      setCalculating,
      setNasaError,
    }),
    [
      state,
      setStep,
      nextStep,
      previousStep,
      setPlace,
      setRoof,
      setAngles,
      setBill,
      setDataSource,
      setSolarStatus,
      setSolarInsights,
      setSolarSelection,
      setResults,
      clearResults,
      setCalculating,
      setNasaError,
    ]
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return context
}
