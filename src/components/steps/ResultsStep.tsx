import { useCallback, useEffect, useRef } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { useSolarCalc } from '../../hooks/useSolarCalc'
import { PdfExportButton } from '../pdf/PdfExportButton'
import { MonthlyGenerationChart } from '../charts/MonthlyGenerationChart'
import { formatCurrency, formatNumber } from '../../utils/formatting'
import type { LatLngPoint } from '../../types/domain'

function buildStaticMapUrl(points: LatLngPoint[], apiKey: string, centroid: LatLngPoint) {
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap')
  url.searchParams.set('maptype', 'satellite')
  url.searchParams.set('scale', '2')
  url.searchParams.set('zoom', '20')
  url.searchParams.set('size', '640x400')
  url.searchParams.set('key', apiKey)
  const pathPoints = [...points, points[0]]
    .map((point) => `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`)
    .join('|')
  url.searchParams.append('path', `fillcolor:0x5538BDF8|color:0xFF2563EB|weight:3|${pathPoints}`)
  url.searchParams.append('markers', `color:0x2563EB|${centroid.lat.toFixed(6)},${centroid.lng.toFixed(6)}`)
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
    setStep,
    previousStep,
  } = useAppState()
  const { runCalculation, dimensioningCapped } = useSolarCalc()
  const resultsRef = useRef<HTMLDivElement>(null)

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

  const sourceLabel = summary ? (dataSource === 'SOLAR_API' ? 'Fonte: Solar API' : 'Fonte: Manual (MVP)') : ''
  const pdfNotes =
    dataSource === 'SOLAR_API'
      ? 'Resultados estimados com base nos dados da Google Solar API. Revise com um projeto elétrico homologado para confirmar viabilidade.'
      : 'Resultados estimados com base na modelagem manual (NASA POWER + Liu–Jordan). Revise com um projeto elétrico homologado.'

  return (
    <section className="section-card" aria-labelledby="results-step-title">
      <header>
        <h2 id="results-step-title" className="section-title">
          5. Resultados
        </h2>
        <p className="section-subtitle">
          Visualize a estimativa de geração mensal e economia potencial. {sourceLabel && <span style={{ fontWeight: 600 }}>{sourceLabel}</span>}
        </p>
      </header>

      {nasaError && (
        <div className="alert error-alert" role="alert" style={{ marginBottom: '1rem' }}>
          {nasaError}
        </div>
      )}

      <div className="action-bar" style={{ marginBottom: '1.5rem' }}>
        <button type="button" className="secondary-button" onClick={previousStep}>
          Voltar
        </button>
        <button type="button" className="primary-button" onClick={handleCalculate} disabled={isCalculating}>
          {isCalculating ? 'Calculando…' : 'Calcular estimativa'}
        </button>
      </div>

      {dimensioningCapped && (
        <div className="alert" style={{ marginBottom: '1rem' }}>
          Potência desejada limitada pela área útil disponível. Considere ajustar a meta ou revisar o segmento selecionado.
        </div>
      )}

      {summary && monthlyResults ? (
        <div ref={resultsRef} style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="results-grid">
            <div className="summary-card">
              <span>Potência dimensionada</span>
              <strong>{formatNumber(summary.kwp, 2)} kWp</strong>
              <span className="input-helper">Limite pela área útil: {formatNumber(summary.kwpMax, 2)} kWp</span>
            </div>
            <div className="summary-card">
              <span>Geração média mensal</span>
              <strong>{formatNumber(summary.avgMonthlyGenerationKWh, 1)} kWh</strong>
              <span className="input-helper">Total anual estimado: {formatNumber(summary.annualGenerationKWh, 0)} kWh</span>
            </div>
            <div className="summary-card">
              <span>Economia mensal estimada</span>
              <strong>{formatCurrency(summary.monthlySavingsBRL)}</strong>
              <span className="input-helper">Tarifa aplicada: {formatCurrency(summary.tariffApplied)}</span>
            </div>
            <div className="summary-card">
              <span>Meta de compensação</span>
              <strong>{summary.compensationTargetPct}%</strong>
              <span className="input-helper">Inclinação β: {formatNumber(angles.betaDeg, 1)}° – Azimute γ: {formatNumber(angles.gammaDeg, 0)}°</span>
            </div>
          </div>

          {staticMapUrl ? (
            <figure style={{ margin: 0 }}>
              <img src={staticMapUrl} alt="Miniatura do telhado selecionado" style={{ width: '100%', borderRadius: 14 }} />
              <figcaption style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                Map data © Google — visualize o polígono selecionado.
              </figcaption>
            </figure>
          ) : (
            <p className="input-helper">
              {dataSource === 'SOLAR_API'
                ? 'A Solar API não fornece polígono detalhado neste MVP. Utilize o modo manual para gerar a miniatura personalizada.'
                : 'Defina telhado e chave de API para gerar a imagem estática.'}
            </p>
          )}

          <MonthlyGenerationChart data={monthlyResults} />

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

          <div className="alert" role="note">
            Estimativa sujeita a variação de ±{Math.round(solar.uncertaintyPct * 100)}%.{' '}
            {dataSource === 'SOLAR_API'
              ? 'Dados de segmento fornecidos pela Solar API; irradiância complementar via NASA POWER quando necessário.'
              : `Dados de radiação obtidos via NASA POWER. Inclinação padrão ${solar.defaultTiltDeg}° com ajuste manual permitido.`}
          </div>
        </div>
      ) : (
        <p className="input-helper">
          Execute o cálculo para visualizar geração, economia e exportar o relatório em PDF.
        </p>
      )}

      <div className="action-bar" style={{ marginTop: '1.5rem' }}>
        <button type="button" className="secondary-button" onClick={() => setStep(1)}>
          Refinar telhado
        </button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="secondary-button" onClick={() => setStep(0)}>
            Voltar ao endereço
          </button>
          <PdfExportButton
            targetRef={resultsRef}
            fileName={`economia-solar-${place?.formattedAddress?.replace(/[^a-z0-9]+/gi, '-').toLowerCase() ?? 'relatorio'}.pdf`}
            title="Economia Solar — Estimativa"
            subtitle={place?.formattedAddress}
            notes={pdfNotes}
          />
        </div>
      </div>
    </section>
  )
}
