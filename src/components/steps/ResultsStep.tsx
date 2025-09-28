import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { useSolarCalc } from '../../hooks/useSolarCalc'
import { MonthlyGenerationChart } from '../charts/MonthlyGenerationChart'
import { formatCurrency, formatNumber } from '../../utils/formatting'
import type { LatLngPoint } from '../../types/domain'
import { exportResultsPdf } from '../../services/pdfExport'
import { useLayout } from '../../context/LayoutContext'

function buildStaticMapUrl(points: LatLngPoint[], apiKey: string, centroid: LatLngPoint) {
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap')
  url.searchParams.set('maptype', 'satellite')
  url.searchParams.set('scale', '2')
  url.searchParams.set('zoom', '20')
  url.searchParams.set('size', '640x320')
  url.searchParams.set('key', apiKey)
  const pathPoints = [...points, points[0]]
    .map((point) => `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`)
    .join('|')
  url.searchParams.append('path', `fillcolor:0x554B5563|color:0xFF1F2937|weight:3|${pathPoints}`)
  url.searchParams.append('markers', `color:0x1F2937|${centroid.lat.toFixed(6)},${centroid.lng.toFixed(6)}`)
  return url.toString()
}

export function ResultsStep() {
  const {
    state: {
      roof,
      summary,
      monthlyResults,
      isCalculating,
      nasaError,
      angles,
      place,
      dataSource,
    },
    config: { solar },
    previousStep,
    setStep,
  } = useAppState()
  const { runCalculation, dimensioningCapped } = useSolarCalc()
  const { setLayout, resetLayout } = useLayout()
  const resultsRef = useRef<HTMLDivElement>(null)
  const [tableExpanded, setTableExpanded] = useState(false)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const staticMapUrl = roof?.polygon && apiKey ? buildStaticMapUrl(roof.polygon, apiKey, roof.centroid) : null

  const handleCalculate = useCallback(() => {
    void runCalculation()
  }, [runCalculation])

  useEffect(() => {
    if (!summary && !isCalculating) {
      handleCalculate()
    }
  }, [summary, isCalculating, handleCalculate])

  const handleExportPdf = useCallback(() => {
    if (!resultsRef.current) return
    void exportResultsPdf(resultsRef.current, {
      fileName: `economia-solar-${place?.formattedAddress?.replace(/[^a-z0-9]+/gi, '-').toLowerCase() ?? 'relatorio'}.pdf`,
      title: 'Economia Solar — Estimativa',
      subtitle: place?.formattedAddress,
      notes:
        dataSource === 'SOLAR_API'
          ? 'Resultados estimados com base nos dados da Google Solar API.'
          : 'Resultados estimados com base na modelagem manual (NASA POWER + Liu–Jordan).',
    })
  }, [dataSource, place])

  useEffect(() => {
    setLayout({
      title: 'Resultados',
      subtitle: 'Veja a estimativa de geração, potência e economia.',
      actions: [
        { label: 'Voltar', onClick: previousStep, variant: 'secondary' },
        { label: 'Exportar PDF', onClick: handleExportPdf, disabled: !summary, variant: 'primary' },
      ],
    })
    return () => resetLayout()
  }, [handleExportPdf, previousStep, resetLayout, setLayout, summary])

  const sourceLabel = summary ? (dataSource === 'SOLAR_API' ? 'Fonte: Solar API' : 'Fonte: Manual (MVP)') : ''

  return (
    <section className="card" aria-labelledby="results-step-title">
      <h2 id="results-step-title">Resultados da simulação</h2>
      <p className="input-helper">Os cálculos consideram suas informações e dados climáticos públicos. {sourceLabel}</p>

      {nasaError ? (
        <div className="alert error-alert">{nasaError}</div>
      ) : null}

      {dimensioningCapped ? (
        <div className="alert">Potência limitada pela área disponível. Ajuste a meta ou revise o segmento.</div>
      ) : null}

      {summary && monthlyResults ? (
        <div ref={resultsRef} className="results-wrapper">
          <div className="summary-cards">
            <article>
              <h3>Economia mensal</h3>
              <strong>{formatCurrency(summary.monthlySavingsBRL)}</strong>
              <span className="input-helper">Tarifa aplicada: {formatCurrency(summary.tariffApplied)}</span>
            </article>
            <article>
              <h3>Potência instalada</h3>
              <strong>{formatNumber(summary.kwp, 2)} kWp</strong>
              <span className="input-helper">Limite pela área útil: {formatNumber(summary.kwpMax, 2)} kWp</span>
            </article>
            <article>
              <h3>Geração média</h3>
              <strong>{formatNumber(summary.avgMonthlyGenerationKWh, 1)} kWh/mês</strong>
              <span className="input-helper">Total anual: {formatNumber(summary.annualGenerationKWh, 0)} kWh</span>
            </article>
          </div>

          <button type="button" className="link-button" onClick={() => setStep(1)}>
            Refinar telhado ou segmento
          </button>

          {staticMapUrl ? (
            <figure className="static-map">
              <img src={staticMapUrl} alt="Miniatura do telhado selecionado" />
              <figcaption>Map data © Google — polígono usado para cálculo.</figcaption>
            </figure>
          ) : null}

          <p className="input-helper">
            Ângulos considerados: β {formatNumber(angles.betaDeg, 1)}° e γ {formatNumber(angles.gammaDeg, 0)}°.
          </p>

          <div className="chart-section">
            <h3>Geração estimada por mês</h3>
            <MonthlyGenerationChart data={monthlyResults} />
          </div>

          <button
            type="button"
            className="link-button"
            onClick={() => setTableExpanded((prev) => !prev)}
          >
            {tableExpanded ? 'Ocultar tabela detalhada' : 'Ver tabela detalhada'}
          </button>

          {tableExpanded ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>HPOA (kWh/m²)</th>
                    <th>Yield (kWh/kWp)</th>
                    <th>Geração (kWh)</th>
                    <th>Economia (R$)</th>
                    <th>Faixa (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyResults.map((item) => (
                    <tr key={item.month}>
                      <td>{item.month}</td>
                      <td>{formatNumber(item.hpoa, 1)}</td>
                      <td>{formatNumber(item.specificYield, 1)}</td>
                      <td>{formatNumber(item.energyKWh, 1)}</td>
                      <td>{formatCurrency(item.savingsBRL)}</td>
                      <td>
                        {formatNumber(item.uncertaintyLow, 1)} – {formatNumber(item.uncertaintyHigh, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="alert" role="note">
            Estimativa sujeita a variação de ±{Math.round(solar.uncertaintyPct * 100)}%. Dados climáticos complementares NASA POWER.
          </div>
        </div>
      ) : (
        <div className="loading-block">
          {isCalculating ? 'Calculando estimativas…' : 'Clique em “Ver Resultados” na etapa anterior para iniciar o cálculo.'}
        </div>
      )}
    </section>
  )
}
