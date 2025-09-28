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

  const totalSteps = steps.length
  const maximumStepIndex = Math.max(totalSteps - 1, 1)
  const progressPercent = (currentStepIndex / maximumStepIndex) * 100

  return (
    <nav className="stepper" aria-label="Fluxo principal do assistente">
      <div
        className="stepper-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalSteps - 1}
        aria-valuenow={currentStepIndex}
        aria-valuetext={`Etapa ${currentStepIndex + 1} de ${totalSteps}`}
      >
        <div className="stepper-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <ol className="stepper-list">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex
          const isEnabled = index <= currentStepIndex
          const status = isActive ? 'active' : index < currentStepIndex ? 'complete' : 'upcoming'

          return (
            <li className={`stepper-item stepper-item-${status}`} key={step.key}>
              <button
                type="button"
                onClick={() => isEnabled && setStep(index)}
                disabled={!isEnabled}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="stepper-index" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="stepper-text">
                  <span className="stepper-title">{step.title}</span>
                  <span className="stepper-description">{step.description}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
