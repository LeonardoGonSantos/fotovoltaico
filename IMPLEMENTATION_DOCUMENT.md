# IMPLEMENTATION_DOCUMENT

## 1. Visão geral do produto e do MVP
- **Economia Solar** é uma aplicação apenas front-end (React + TypeScript + Vite) que estima geração fotovoltaica e economia mensal.
- Fluxo em 5 etapas com stepper: endereço → seleção do telhado → ângulos → conta de luz → resultados/exportação.
- A versão atual prioriza a **Google Solar API (Building Insights)** para obter automaticamente segmentos do telhado (inclinação, azimute, área, energia). Quando não há cobertura, o app retorna ao modo manual (polígono + ajustes β/γ + fator 70%).
- Cálculos e gráficos são executados no browser: Chart.js para barras mensais, html2canvas + jsPDF para PDF. NASA POWER continua sendo o provedor de irradiância quando precisamos gerar estimativas próprias.

## 2. Arquitetura front-end

### 2.1 Estrutura de pastas relevante
```
src/
  App.tsx
  main.tsx
  context/
    AppStateContext.tsx        # store central, seleção Solar vs Manual
    appConfig.ts               # defaults de PR, albedo, ranges, metas
  types/
    domain.ts                  # DataSource, SolarSegment, resultados, etc.
  hooks/
    useMap.ts                  # carrega Maps JS API, DrawingManager
    useRoofGeometry.ts         # cálculo de área (Google geometry ou fallback)
    useSolarData.ts            # fetch e cache Solar API
    useSolarCalc.ts            # orquestra cálculos (Solar API ou manual)
  services/
    googleMapsLoader.ts
    solarApiClient.ts
    nasaPowerClient.ts
    solarCalculations.ts       # performManualComputation / performSolarSegmentComputation
    pdfExport.ts
  components/
    layout/                    # AppShell, Stepper
    steps/
      AddressStep.tsx          # captura endereço e dispara Solar API
      RoofSelectStep.tsx       # lista segmentos ou abre modo manual
      TiltAzimuthStep.tsx      # read-only (Solar) ou sliders (manual)
      BillStep.tsx
      ResultsStep.tsx
    maps/
      MapCanvas.tsx            # integra marker/polígono/drawing
      StaticThumbnails.tsx
      GoniometerOverlay.tsx
    segments/
      SolarSegmentPicker.tsx   # UI para escolher segmento
    charts/
      MonthlyGenerationChart.tsx
    pdf/
      PdfExportButton.tsx
  mock/
    nasaPowerResponse.json     # fallback offline
  test/
    setup.ts
  services/__tests__/
    solarCalculations.test.ts  # unit tests manual + Solar API
```

### 2.2 Fluxo de dados
1. `AppStateContext` mantém estado global: `place`, `dataSource`, `solarInsights`, `solarSelection`, `roof`, `angles`, `bill`, resultados, status de carregamento.
2. `AddressStep` usa Places Autocomplete; ao selecionar um endereço, chama `useSolarData().loadSolarInsights`, que consulta Solar API, atualiza `solarInsights` e já seleciona o segmento de maior área. Em caso de erro/404, troca automaticamente para `dataSource='MANUAL'`.
3. `RoofSelectStep` reage a `dataSource`:
- `SOLAR_API`: renderiza `SolarSegmentPicker`, exibe β/γ/área/energia de cada segmento com miniatura estática.
   - `MANUAL`: re-exibe `MapCanvas` com DrawingManager para polígono + thumbnails estáticos.
4. `TiltAzimuthStep`: read-only com valores da Solar API ou sliders + goniômetro no modo manual.
5. `useSolarCalc` coleta inputs e busca NASA POWER quando necessário. Se a Solar API já traz energia mensal, apenas escalona para meta de compensação; se não, utiliza os dados NASA + Liu–Jordan com β/γ obtidos da Solar API.
6. `ResultsStep` formata `ResultMonth[]` para chart/tabela, exibe selo da fonte (Solar API ou Manual) e exporta PDF.

## 3. UX flow detalhado

### 3.1 Passos
1. **Endereço** – Autocomplete; após seleção, marcador reposiciona o mapa e a tela mostra spinner “Buscando dados do seu telhado…”.
2. **Telhado** – Caso haja retornos da Solar API, cartões listam cada `segmentId` com inclinação, azimute, área (útil ou estimada 70%), energia anual/mensal quando disponível e uma miniatura do local. Se a API não trouxer dados, o fluxo muda automaticamente para o modo manual (DrawingManager + thumbnails vizinhos).
3. **Ângulos** – Valores da Solar API ficam bloqueados (com mensagem informativa). Se manual, sliders 14–22° e 0–360° + goniômetro.
4. **Conta de luz** – Formulário idêntico ao MVP original (gasto obrigatório, tarifa/consumo opcionais, meta 50–100%).
5. **Resultados** – Botão “Calcular” roda `useSolarCalc`. Painéis exibem kWp dimensionado, limite por área, geração média/mensal, economia, meta. Gráfico Jan–Dez, tabela com HPOA/Yf/energia/economia/incerteza. Fonte (Solar API vs Manual) fica indicada no cabeçalho e nota explicativa. PDF inclui resumo e fonte.

### 3.2 Wireframe atualizado
```
Step 2 (Solar API):
+-----------------------------------------+
| Segmentos disponíveis (radio list)      |
| [o] Segmento A  β=18°  γ=210°  65 m²     |
| [ ] Segmento B  β=15°  γ=190°  42 m²     |
| [ Miniatura + radios de segmentos ]     |
+-----------------------------------------+

Step 2 (Fallback manual) mantém wireframe anterior.
Step 3 (Solar API) mostra cartões read-only com β/γ.
```

## 4. APIs externas
- **Google Maps JavaScript API** (`libraries=places,geometry,drawing`) – mapa satélite, autocomplete, cálculo de área via `geometry.spherical.computeArea` quando disponível.
- **Solar API (Building Insights)** – endpoint `https://solar.googleapis.com/v1/buildingInsights:findClosest`, parâmetros `location.latitude`, `location.longitude`, `requiredQuality=BASE`. Retorno parseado para `SolarSegment`. Chave definida em `VITE_GOOGLE_SOLAR_API_KEY` e restrita por referrer.
- **NASA POWER** – ainda usada para obtê-los mensalmente (GHI/DHI/DNI) e calcular Yf via Liu–Jordan quando não recebemos energia da Solar API ou no modo manual. Endpoint mensal (`temporal/monthly/point`).
- **Static Maps API** – miniaturas de vizinhança para facilitar seleção manual.

## 5. Modelagem de dados (trechos relevantes)
```ts
export type DataSource = 'SOLAR_API' | 'MANUAL'

export interface SolarSegment {
  segmentId: string
  pitchDegrees: number
  azimuthDegrees: number
  groundAreaMeters2?: number
  maxArrayAreaMeters2?: number
  monthlyEnergyKwh?: number[]
  annualEnergyKwh?: number
  recommendedSystemKw?: number
}

export interface SolarBuildingInsights {
  lat: number
  lng: number
  coverageQuality: 'HIGH' | 'MEDIUM' | 'BASE' | 'LOW' | 'NONE' | 'UNKNOWN'
  segments: SolarSegment[]
}

export interface SolarSelection {
  source: DataSource
  segmentId?: string | null
  manualOverride?: boolean
}

export interface Summary {
  kwp: number
  kwpMax: number
  annualGenerationKWh: number
  avgMonthlyGenerationKWh: number
  monthlySavingsBRL: number
  annualSavingsBRL: number
  tariffApplied: number
  compensationTargetPct: number
}
```

## 6. Premissas principais
- **Prioridade Solar API**: usar `maxArrayAreaMeters2`, `pitchDegrees`, `azimuthDegrees`, `monthlyEnergyKwh` (quando disponíveis). Caso contrário, fallback manual.
- **Regra 70%**: aplicada somente quando a Solar API não fornecer `maxArrayAreaMeters2` (apenas `groundAreaMeters2`). No modo manual continua sendo `área_polígono × 0.70`.
- **Meta de compensação**: 90% padrão, ajustável 50–100%.
- **PR**: 0,80; **albedo**: 0,20.
- **kWp por m²**: 0,20 por default (config). Se painel discreto configurado, considera número inteiro de painéis.
- **Incerteza**: ±12% aplicada às estimativas.

## 7. Cálculos
1. **Solar API com energia mensal/anual:**
   - Derivar rendimento específico `Yf_mes = energia_mes / kWp_recomendado` (ou kWp calculado via área quando não informado).
   - Dimensionar `kWp_meta = consumoAlvo / média(Yf)` limitado a `kwpMax` derivado da área útil.
   - Escalar energia mensal proporcionalmente ao novo kWp.
2. **Solar API sem energia** ou **modo manual**:
   - Buscar NASA POWER (GHI/DHI/DNI).
   - Calcular `HPOA` via Liu–Jordan com β/γ (da Solar API ou sliders).
   - `Yf_mes = HPOA_mes × PR`.
   - Dimensionamento igual ao item anterior.
3. **Economia**: energia mensal × tarifa (informada ou default).
4. **Resultados**: `Summary` + `ResultMonth` com GHI/DHI/DNI/HPOA, energia, economia e faixa de incerteza.

## 8. Tratamento de erros
- **Solar API**: 404 → fallback manual automático + mensagem “Não encontramos dados…”. 403/429 → alerta de chave/limite. Outros erros → mensagem genérica e possibilidade de modo manual.
- **NASA POWER**: se falhar quando necessário, mostra aviso e tenta mock local.
- **Google Maps**: se `drawing` não carregar (restrição de key), instruir usuário a usar modo manual.
- **Validações**: gasto mensal obrigatório; tarifas/consumos negativos bloqueados; `aria-live` para mensagens.

## 9. Acessibilidade & responsividade
- Stepper com `aria-current`, barra de progresso neutra e botões das etapas navegáveis por teclado.
- SegmentPicker usa radios e descrição textual de β/γ/área/energia.
- Layout responsivo (mobile-first). Gráfico com altura fixa e overflow horizontal em telas estreitas.
- Goniômetro possui descrição e controles de teclado (setas) no modo manual.

## 10. Testes
- `solarCalculations.test.ts`: cobre `performManualComputation` (área × 70%, limites de kWp) e `performSolarSegmentComputation` (uso da Solar API, retorno de fonte).
- Execução: `npm run lint`, `npm run test`.
- Recomendações futuras: testes de integração dos Steps com React Testing Library, mocks de fetch (Solar API/NASA) para validar fallback.

## 11. Limitações e próximos passos
- Solar API não entrega polígono completo neste MVP; mapa estático só é gerado no modo manual.
- Energia mensal por segmento nem sempre presente → ainda dependemos da NASA POWER para alguns casos.
- Não avaliamos sombras, múltiplos telhados ou layout de módulos. Futuro: integrar Solar API Data Layers para visualização, layout automático, importação de tarifas regionais, exportação técnica mais detalhada, armazenamento de projetos.

## 12. Build & deploy
- Requisitos: Node 18+, npm.
- `npm install` → `npm run dev` para desenvolvimento.
- `npm run build` + `npm run preview` para validar bundle.
- `.env` precisa de `VITE_GOOGLE_MAPS_API_KEY` e `VITE_GOOGLE_SOLAR_API_KEY` (ambas restritas por HTTP referrer) e opcionais (`VITE_DEFAULT_TARIFF`, `VITE_SPECIFIC_KWP_PER_M2`).
- Deploy em host estático (Netlify, Vercel, S3). Configurar fallback SPA (`/* → /index.html`).
- Monitorar quotas/faturamento das chaves Google (Maps + Solar API).
