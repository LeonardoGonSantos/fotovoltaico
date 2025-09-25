import type { ActionButtonConfig } from '../../context/LayoutContext'

interface BottomActionsProps {
  actions: ActionButtonConfig[]
}

export function BottomActions({ actions }: BottomActionsProps) {
  if (!actions.length) return null

  return (
    <footer className="bottom-actions">
      <div className="bottom-actions-content">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`bottom-action ${action.variant ?? 'primary'}`}
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
          </button>
        ))}
      </div>
    </footer>
  )
}
