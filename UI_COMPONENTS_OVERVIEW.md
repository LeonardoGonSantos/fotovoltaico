# Documentação de Telas e Componentes

Este documento descreve a organização das telas do assistente "Economia Solar", os componentes React envolvidos em cada etapa e os dados esperados/emergentes.

## 1. Estrutura Geral
- **`AppShell` (`src/components/layout/AppShell.tsx`)**
  - Define cabeçalho, rodapé e área central (`main`).
  - Renderiza o `Stepper` com os rótulos das etapas.
  - Filhos: qualquer página (no MVP apenas `HomePage`).
- **`Stepper` (`src/components/layout/Stepper.tsx`)**
  - Exibe as etapas definidas em `AppStateContext`. Cada item é um botão.
  - Props: `steps` (`StepDefinition[]`). Seleciona etapa via `useAppState().setStep`.
- **`HomePage` (`src/routes/HomePage.tsx`)**
  - Seleciona dinamicamente o componente de etapa com base em `currentStepIndex`.

O estado global (`AppStateContext`) armazena: endereço (`place`), dados da Solar API (`solarInsights`, `solarSelection`), polígono (`roof`), ângulos (`angles`), conta de luz (`bill`), fonte (`dataSource`), resultados (`summary`, `monthlyResults`) e flags de carregamento/erro.

## 2. Etapa 1 — Endereço (`AddressStep.tsx`)
### Componentes chave
- **`MapCanvas`** (modo `marker`) com marcador arrastável.
- Input de endereço (autocomplete Places).

### Funções principais
- Inicializa `google.maps.places.Autocomplete` no input.
- Ao selecionar endereço, chama `setPlace` e `loadSolarInsights` (via `useSolarData`).
- Drag do marcador atualiza `place` e recarrega Solar API.
- Botão *Continuar* avança para o passo 2 se houver endereço válido.

### Dados esperados
- **Input**: texto de endereço; usuário escolhe opção do autocomplete.
- **Saída**: `PlaceSelection` contendo `formattedAddress`, `placeId`, `location` (lat/lng). Dispara busca na Solar API.

## 3. Etapa 2 — Telhado (`RoofSelectStep.tsx`)
### Comportamento condicional
- **Modo Solar API (`dataSource === 'SOLAR_API'`):**
  - Renderiza lista de segmentos via `SolarSegmentPicker`.
  - Seleção define `solarSelection.segmentId` e atualiza ângulos (`setAngles`).
  - Botão *Prosseguir* habilitado quando há segmento selecionado.
- **Modo manual (`dataSource === 'MANUAL'`):**
  - Renderiza `MapCanvas` em modo `polygon`, thumbnails (`StaticThumbnails`), e painel com áreas calculadas.
  - Botão *Prosseguir* requer polígono válido (`roof.hasPolygon`).

### `SolarSegmentPicker`
- Props: `segments` (`SolarSegment[]`), `selectedId`, `onSelect`.
- Cada cartão exibe: nome, miniatura satélite (Static Maps), área útil, inclinação, azimute, energia.
- Espera `segment.center` (lat/lng) para gerar miniatura; se ausente, omite imagem.

### Dados esperados
- **Solar API:** `solarInsights.segments` com área, ângulos, energia (opcional) e coordenadas.
- **Manual:** sequência de cliques no mapa produz `roofSelection.polygon` -> área e centro calculados.

## 4. Etapa 3 — Ângulos (`TiltAzimuthStep.tsx`)
### Componentes
- Modo Solar API: miniatura estática (`Static Maps`) + cartão explicativo (segmento, inclinação, azimute, área).
- Modo manual: `MapCanvas` + sliders numéricos + `GoniometerOverlay`.

### Funções
- `handleTiltChange` / `handleAzimuthChange` atualizam `angles` no modo manual e limpam resultados.
- Texto explica termos (direção cardinal e significado da área útil).

### Dados esperados
- **Solar API:** leitura de `solarSelection.segmentId` → ângulos imutáveis.
- **Manual:** sliders numéricos 14–22° (β) e 0–360° (γ).

## 5. Etapa 4 — Conta de Luz (`BillStep.tsx`)
### Componentes
- Inputs numéricos (gasto mensal, tarifa, consumo opcional).
- Slider `compensationTargetPct` (50–100%).

### Funções
- `updateBillField` analisa valores em formato locale pt-BR (`parseLocaleNumber`).
- Ajustar qualquer campo limpa resultados anteriores.
- Botão *Ver resultados* habilitado se `monthlySpendBRL > 0`.

### Dados esperados
- `monthlySpendBRL`: obrigatório (R$/mês).
- `tariffBRLkWh` ou `monthlyConsumptionKWh`: opcionais (ajudam na precisão).
- `compensationTargetPct`: meta de compensação (default 90%).

## 6. Etapa 5 — Resultados (`ResultsStep.tsx`)
### Componentes
- Painéis de resumo (`summary-card`), gráfico (`MonthlyGenerationChart`), tabela detalhada, alerta de fonte.
- `PdfExportButton` para gerar relatório do bloco de resultados.

### Funções
- `useEffect` chama `runCalculation()` automaticamente quando a tela carrega (se ainda não houver resultados).
- `runCalculation` (via `useSolarCalc`) decide entre `performSolarSegmentComputation` (Solar API) ou `performManualComputation` (manual).
- Exibe aviso se `dimensioningCapped` (kWp limitado pela área).
- Botões: *Voltar*, *Refinar telhado*, *Voltar ao endereço*, *Exportar PDF*.

### Dados esperados
- Dados de entrada consolidados (`place`, `solarSelection` ou `roof`, `angles`, `bill`).
- API NASA POWER é chamada se precisarmos de irradiância (falta energia da Solar API ou modo manual).

## 7. Hooks e Serviços
- **`useSolarData`**: encapsula fetch para Solar API, atualiza `solarInsights`, `solarSelection`, `angles` e `dataSource` (cai para manual quando necessário).
- **`useSolarCalc`**: valida inputs; se Solar API forneceu energia, usa diretamente, senão busca NASA POWER e aplica Liu–Jordan.
- **`solarCalculations`**: funções puras para dimensionamento manual e com segmento.
- **`pdfExport`**: captura DOM via `html2canvas` + `jsPDF` (nota com a fonte dos dados).

## 8. Entradas e Fluxo de Dados (resumo)
1. **Endereço** → `PlaceSelection` e `solarInsights` (quando disponível).
2. **Telhado** → `SolarSelection.segmentId` ou `RoofSelection.polygon/area`.
3. **Ângulos** → `Angles` (manual) ou leitura dos segmentos.
4. **Conta de Luz** → `BillInput` (valores monetários e meta).
5. **Resultados** → `Summary` + `ResultMonth[]` (usados em UI e PDF).

## 9. Estados e Tratamento de Erros
- `solarStatus`: `idle | loading | success | error`; determina se mostramos lista ou mensagem.
- `nasaError`: exibe alertas em Results quando NASA POWER falha ou inputs faltam.
- `isCalculating`: controla botão de cálculo/disable + loader.

## 10. Observações de UI
- Layout utiliza util classes CSS em `src/styles/globals.css` (cards, botões, inputs).
- Responsividade: grids transformam-se em colunas no mobile; imagens/static maps se ajustam ao container.
- Acessibilidade: `aria-labels`, `visually-hidden` para mensagens, botões com estados e navegação por teclado no stepper.

Essa visão deve ajudar a localizar cada componente, entender suas dependências e quais dados entram/saem em cada etapa do assistente.
