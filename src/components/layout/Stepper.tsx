import type { StepDefinition } from '../../types/domain'
import { useAppState } from '../../context/AppStateContext'

interface StepperProps {
  steps: StepDefinition[]
}

export function Stepper({ steps }: StepperProps) {
  const {
    state: { currentStepIndex },
    setStep,
  } = useAppState()

  return (
    <nav className="stepper" aria-label="Fluxo principal do assistente">
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex
        const isEnabled = index <= currentStepIndex

        return (
          <div className="stepper-item" key={step.key}>
            <button
              type="button"
              onClick={() => isEnabled && setStep(index)}
              disabled={!isEnabled}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className={`badge ${isActive ? 'badge-active' : ''}`}>{index + 1}</span>
              <span>
                <span style={{ display: 'block', fontSize: '0.85rem', opacity: 0.75 }}>{step.title}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{step.description}</span>
              </span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
