import { useMemo } from 'react'
import { useAppState } from '../context/AppStateContext'
import { AddressStep } from '../components/steps/AddressStep'
import { BillStep } from '../components/steps/BillStep'
import { ResultsStep } from '../components/steps/ResultsStep'

const STEP_COMPONENTS = [AddressStep, BillStep, ResultsStep]

export function HomePage() {
  const {
    state: { currentStepIndex },
  } = useAppState()

  const StepComponent = useMemo(() => STEP_COMPONENTS[currentStepIndex] ?? AddressStep, [currentStepIndex])

  return <StepComponent />
}
