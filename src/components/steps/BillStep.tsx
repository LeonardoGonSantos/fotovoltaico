import { useCallback, useEffect, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { clamp, parseLocaleNumber } from '../../utils/formatting'
import { useLayout } from '../../context/LayoutContext'

export function BillStep() {
  const {
    state: { bill },
    config: { solar },
    setBill,
    previousStep,
    nextStep,
    clearResults,
  } = useAppState()
  const { setLayout, resetLayout } = useLayout()

  const [spendInput, setSpendInput] = useState(bill.monthlySpendBRL?.toString() ?? '')
  const [tariffInput, setTariffInput] = useState(bill.tariffBRLkWh?.toString() ?? '')
  const [consumptionInput, setConsumptionInput] = useState(bill.monthlyConsumptionKWh?.toString() ?? '')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    setSpendInput(bill.monthlySpendBRL ? bill.monthlySpendBRL.toString() : '')
    setTariffInput(bill.tariffBRLkWh ? bill.tariffBRLkWh.toString() : '')
    setConsumptionInput(bill.monthlyConsumptionKWh ? bill.monthlyConsumptionKWh.toString() : '')
  }, [bill.monthlySpendBRL, bill.tariffBRLkWh, bill.monthlyConsumptionKWh])

  const updateBillField = (field: 'monthlySpendBRL' | 'tariffBRLkWh' | 'monthlyConsumptionKWh', rawValue: string) => {
    const parsed = parseLocaleNumber(rawValue)
    const value = Number.isFinite(parsed) && parsed > 0 ? parsed : null
    setBill({ [field]: value })
    clearResults()
  }

  const handleCompensationChange = (value: number) => {
    const clampedValue = clamp(value, 50, 100)
    setBill({ compensationTargetPct: clampedValue })
    clearResults()
  }

  const spendValue = parseLocaleNumber(spendInput)
  const canContinue = Number.isFinite(spendValue) && spendValue > 0

  const handleNext = useCallback(() => {
    if (!canContinue) return
    nextStep()
  }, [canContinue, nextStep])

  const handleBack = useCallback(() => {
    previousStep()
  }, [previousStep])

  useEffect(() => {
    setLayout({
      title: 'Conta de luz',
      subtitle: 'Informe o valor mensal e ajuste parâmetros opcionais.',
      actions: [
        { label: 'Voltar', onClick: handleBack, variant: 'secondary' },
        { label: 'Ver resultados', onClick: handleNext, disabled: !canContinue, variant: 'primary' },
      ],
    })
    return () => resetLayout()
  }, [canContinue, handleBack, handleNext, resetLayout, setLayout])

  return (
    <section className="card" aria-labelledby="bill-step-title">
      <h2 id="bill-step-title">Quanto custa sua conta?</h2>
      <p className="input-helper">Informe o gasto médio mensal. Isso é necessário para estimar a economia.</p>

      <div className="input-group">
        <label htmlFor="spend-input">Gasto mensal (R$)</label>
        <input
          id="spend-input"
          inputMode="decimal"
          placeholder="Ex.: 450,00"
          value={spendInput}
          onChange={(event) => {
            setSpendInput(event.target.value)
            updateBillField('monthlySpendBRL', event.target.value)
          }}
          required
        />
        {!canContinue && spendInput && <span className="input-helper error">Informe um valor maior que zero.</span>}
      </div>

      <button type="button" className="link-button" onClick={() => setShowAdvanced((prev) => !prev)}>
        {showAdvanced ? 'Ocultar configurações avançadas' : 'Configurações avançadas'}
      </button>

      {showAdvanced ? (
        <div className="advanced-panel">
          <div className="input-group">
            <label htmlFor="tariff-input">Tarifa (R$/kWh)</label>
            <input
              id="tariff-input"
              inputMode="decimal"
              placeholder={`Ex.: ${solar.defaultTariffBRLkWh.toFixed(2)}`}
              value={tariffInput}
              onChange={(event) => {
                setTariffInput(event.target.value)
                updateBillField('tariffBRLkWh', event.target.value)
              }}
            />
            <span className="input-helper">Se vazio, usamos a tarifa padrão de {solar.defaultTariffBRLkWh.toFixed(2)} R$/kWh.</span>
          </div>

          <div className="input-group">
            <label htmlFor="consumption-input">Consumo mensal (kWh)</label>
            <input
              id="consumption-input"
              inputMode="decimal"
              placeholder="Opcional"
              value={consumptionInput}
              onChange={(event) => {
                setConsumptionInput(event.target.value)
                updateBillField('monthlyConsumptionKWh', event.target.value)
              }}
            />
            <span className="input-helper">Utilize se tiver o consumo exato na fatura.</span>
          </div>

          <div className="input-group">
            <label htmlFor="compensation-slider">Meta de compensação (%)</label>
            <input
              id="compensation-slider"
              type="range"
              min={50}
              max={100}
              step={5}
              value={bill.compensationTargetPct}
              onChange={(event) => handleCompensationChange(Number(event.target.value))}
            />
            <span className="input-helper">Meta atual: {bill.compensationTargetPct}% (padrão {solar.compensationTargetDefaultPct}%).</span>
          </div>
        </div>
      ) : null}

      <div className="alert" role="status">
        Estimativa aproximada. Ajustes finos (tarifa/consumo/meta) melhoram a precisão da simulação.
      </div>
    </section>
  )
}
