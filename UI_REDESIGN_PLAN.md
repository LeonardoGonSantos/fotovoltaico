# Plano de Redesenho — Fluxo em 3 etapas (Endereço → Conta → Resultados)

Este documento descreve como migrar o MVP atual para o novo layout e fluxo solicitado. Ele abrange arquitetura, alterações de componentes, comportamento esperado e considerações técnicas.

---

## 1. Visão Geral de UX
- **Layout persistente**:
  - `Navbar` fixa no topo (branding, título da etapa, botão de menu/hambúrguer opcional).
  - `BottomActions` fixa no rodapé com 1–2 botões principais (ex.: Continuar, Ver resultados, Exportar PDF).
  - Área central (`main`) exibe o conteúdo da etapa.
- **Fluxo** em três etapas:
  1. Endereço (entrada + modal opcional de mapa).
  2. Conta de luz (formulário com painel avançado colapsável).
  3. Resultados (cards, gráfico, tabela, exportação).
- **Mobile first**: todos os componentes ocupam largura total com espaçamentos consistentes, inputs grandes e botões fixos.

---

## 2. Estrutura de Componentes

### 2.1 Layout
| Componente | Responsabilidade | Observações |
|------------|------------------|-------------|
| `AppShell` | Montar layout base: `<Navbar />`, `<main>`, `<BottomActions />`. | Precisará receber título/ações por etapa via props/contexto. |
| `Navbar` (novo) | Exibir título da etapa e ícone de menu. | Props: `title: string`, `onMenuClick?`. |
| `BottomActions` (novo) | Renderizar botões de ação fixos. | Props: array de botões `{ label, variant, onClick, disabled }`. Deve aceitar múltiplos (1–2). |
| `Stepper` | Continua visível (opcionalmente dentro do conteúdo ou no topo). | Pode ser simplificado ou transformado em “etapa atual / total”. |

### 2.2 Telas
| Etapa | Componente | Principais elementos |
|-------|------------|----------------------|
| Endereço | `AddressStep` | Input autocomplete, link “Ajustar manualmente” → abre modal com `MapCanvas` + marcador. Botão “Continuar” no rodapé. |
| Conta de Luz | `BillStep` | Campo obrigatório `monthlySpendBRL`, painel “Configurações avançadas” (accordion) com tarifa, consumo, slider meta. Botão “Ver resultados”. |
| Resultados | `ResultsStep` | Cards resumo (potência, economia, retorno), gráfico, tabela expansível, nota da fonte (Solar API/manual), botão “Exportar PDF” + “Voltar”. |

### 2.3 Overlays/Modais
- **MapModal** (novo): usado apenas na etapa de endereço.
  - Props: `open`, `onClose`, `place`, `onPlaceUpdate`.
  - Conteúdo: `MapCanvas` modo marker, texto explicativo.

---

## 3. Estado Global e Hooks
- **AppStateContext**: manter estrutura, mas expor helpers para atualizar título/ações do layout (ou criar contexto específico `LayoutContext`).
- `useSolarData` e `useSolarCalc`: seguem iguais (carregam Solar API, calculam resultados).
- Ajustar `clearResults()` para ser invocado ao alterar inputs na etapa 2.

---

## 4. Alterações por Etapa

### 4.1 Endereço
- **UI**: input em destaque, botão “Ajustar localização” → abre modal com mapa.
- **Fluxo**:
  1. Usuário seleciona endereço pelo autocomplete.
  2. `setPlace` + `loadSolarInsights` automáticos.
  3. Se quiser ajustar: abre modal → arrasta marcador → fecha modal.
  4. Rodapé: botão “Continuar” (desabilitado enquanto não houver `place`).

### 4.2 Conta de Luz
- **Campos**:
  - `monthlySpendBRL` (obrigatório, currency input).
  - Painel colapsável “Configurações avançadas” com `tariffBRLkWh`, `monthlyConsumptionKWh`, `compensationTargetPct`.
- **Ações**: qualquer mudança chama `clearResults()`.
- **Rodapé**: botão “Ver resultados” (ativa `nextStep()`; ideal validar valor > 0).

### 4.3 Resultados
- **runCalculation**: disparado no `useEffect` inicial se `summary` nulo.
- **Cards**: 
  - Economia mensal média (`summary.monthlySavingsBRL`).
  - Potência dimensionada (`summary.kwp`).
  - Retorno (se desejado, calcular payback aproximado em meses usando `bill` e `summary`).
- **Gráfico**: `MonthlyGenerationChart` comparando geração X consumo (se consumo informado; do contrário, apenas geração).
- **Tabela**: exibir `monthlyResults` com toggle “Ver tabela completa”.
- **Rodapé**: botões “Voltar” (retorna à etapa 2) e “Exportar PDF”.

---

## 5. Ajustes Específicos de Componentes

### 5.1 AddressStep
- Remover `MapCanvas` inline; adicionar `MapModal`.
- Integrar `BottomActions` via props (passando `[{ label: 'Continuar', onClick: nextStep, disabled: !place }]`).

### 5.2 BillStep
- Reorganizar layout com grupos verticais.
- Adicionar `AdvancedSettings` component com `Accordion`/`Disclosure` para inputs extras.
- Rodapé: `[{ label: 'Ver resultados', onClick: nextStep, disabled: !bill.monthlySpendBRL }]`.

### 5.3 ResultsStep
- Reaproveitar `runCalculation` (já automático).
- Criar subcomponentes `SummaryCards`, `EnergyChartSection`, `DetailedTable`.
- Integrar `BottomActions` com botões `Voltar`, `Exportar PDF`.

### 5.4 Layout Components
- `Navbar`: simples header com título da etapa → título pode ser definido no step via `useLayout` hook ou `AppStateContext`.
- `BottomActions`: renderiza `<footer class="bottom-actions">` com botões (primary/secondary). Usar `position: sticky`/`fixed` + `safe-area` em mobile.

---

## 6. Fluxo de Dados (atualizado)
```
AddressStep
  └─ place selecionado → loadSolarInsights → solarInsights/solarSelection
BillStep
  └─ atualiza bill & clearResults
ResultsStep
  └─ useEffect -> runCalculation (usa solarInsights + bill)
```

---

## 7. Estilização e Responsividade
- Criar estilos em `src/styles/globals.css` para `navbar`, `bottom-actions`, `modal`.
- Garantir margens inferiores no conteúdo para não ficar escondido atrás do rodapé fixo (padding-bottom no `main`).
- Ajustar tipografia e espaçamentos conforme design minimalista.

---

## 8. Impacto em Documentação/README
- Atualizar README com novo fluxo (3 etapas, uso de modal, botões fixos).
- Ajustar `IMPLEMENTATION_DOCUMENT.md` para refletir a nova arquitetura quando implementada.

---

## 9. Checklist de Implementação
1. Criar componentes `Navbar`, `BottomActions`, `MapModal`.
2. Ajustar `AppShell` para usar os novos componentes e aceitar props de título/botões.
3. Atualizar `AddressStep` (input + modal) e remover mapa inline.
4. Refatorar `BillStep` com “Configurações avançadas”.
5. Revisar `ResultsStep` para cards/gráfico/tabela + botões fixos.
6. Atualizar estilos globais (sticky footer, spacing, responsividade).
7. Garantir que hooks `useSolarData`/`useSolarCalc` continuam operando (testes `npm run test`).
8. Ajustar documentos (README, Implementation doc) e adicionar prints novos.

---

Este plano deve orientar a refatoração para o novo fluxo, mantendo a lógica de dados existente e focando na reorganização da UI em três etapas com layout consistente.
