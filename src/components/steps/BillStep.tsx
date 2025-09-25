import { useEffect, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { clamp, parseLocaleNumber } from '../../utils/formatting'

export function BillStep() {
  const {
    state: { bill },
    config: { solar },
    setBill,
    previousStep,
    nextStep,
    clearResults,
  } = useAppState()

  const [spendInput, setSpendInput] = useState(bill.monthlySpendBRL?.toString() ?? '')
  const [tariffInput, setTariffInput] = useState(bill.tariffBRLkWh?.toString() ?? '')
  const [consumptionInput, setConsumptionInput] = useState(bill.monthlyConsumptionKWh?.toString() ?? '')

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
    const clamped = clamp(value, 50, 100)
    setBill({ compensationTargetPct: clamped })
    clearResults()
  }

  const spendValue = parseLocaleNumber(spendInput)
  const canContinue = Number.isFinite(spendValue) && spendValue > 0

  return (
    <section className="section-card" aria-labelledby="bill-step-title">
      <header>
        <h2 id="bill-step-title" className="section-title">
          4. Conta de luz
        </h2>
        <p className="section-subtitle">
          Informe o gasto mensal obrigatório. Tarifa (R$/kWh) ou consumo mensal ajudam a melhorar a precisão.
        </p>
      </header>

      <div className="form-grid two-columns">
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
        </div>

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
          <span className="input-helper">Se vazio, será usada tarifa padrão de {solar.defaultTariffBRLkWh.toFixed(2)} R$/kWh.</span>
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
          <span className="input-helper">Preencha se conhecer o consumo exato. Caso contrário, será estimado.</span>
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
          <span>{bill.compensationTargetPct}%</span>
          <span className="input-helper">Ajuste a meta desejada (padrão {solar.compensationTargetDefaultPct}%).</span>
        </div>
      </div>

      <div className="alert" role="status">
        Estimativas aproximadas. Se nenhuma tarifa for informada, utiliza-se {solar.defaultTariffBRLkWh.toFixed(2)} R$/kWh.
      </div>

      <div className="action-bar">
        <button type="button" className="secondary-button" onClick={previousStep}>
          Voltar
        </button>
        <button type="button" className="primary-button" onClick={nextStep} disabled={!canContinue}>
          Ver resultados
        </button>
      </div>
    </section>
  )
}
