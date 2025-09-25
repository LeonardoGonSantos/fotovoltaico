# Economia Solar — MVP Front-end

Aplicação React + TypeScript (Vite) que estima área útil do telhado, potencial fotovoltaico e economia mensal em cinco etapas. Agora o fluxo tenta primeiro a **Google Solar API (Building Insights)** para preencher automaticamente inclinação, azimute e área útil; caso não haja cobertura, o usuário pode voltar ao modo manual original (desenho de polígono + sliders).

## Pré-requisitos
- Node.js 18+ e npm.
- Chave da **Google Maps JavaScript API** com bibliotecas `places`, `geometry`, `drawing` habilitadas e cobrança ativa.
- Chave da **Google Solar API** (Building Insights). Ambas devem estar restritas por HTTP referrer.

## Configuração rápida
1. Instale dependências:
   ```bash
   npm install
   ```
2. Crie o `.env` na raiz com as chaves:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=SEU_TOKEN_MAPS
   VITE_GOOGLE_SOLAR_API_KEY=SEU_TOKEN_SOLAR
   # opcionais (fallbacks / ajustes)
   VITE_DEFAULT_TARIFF=1.0
   VITE_SPECIFIC_KWP_PER_M2=0.2
   ```
3. Execute em modo desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse `http://localhost:5173`.

## Scripts disponíveis
- `npm run dev` — servidor local com HMR.
- `npm run lint` — checagem ESLint.
- `npm run test` / `npm run test:watch` / `npm run test:coverage` — testes unitários (Vitest + jsdom).
- `npm run build` — build de produção (`dist/`) com `tsc -b`.
- `npm run preview` — serve o build compilado.

## Variáveis ajustáveis
Valores padrão definidos em `src/context/appConfig.ts`, mas sobrepostos via `.env`:
- `VITE_DEFAULT_TARIFF` — tarifa padrão (R$/kWh) quando usuário não informa.
- `VITE_SPECIFIC_KWP_PER_M2` — densidade de potência (kWp/m²) usada para calcular kWp máximo.

## Fluxo de UX
1. **Endereço:** Autocomplete (Places). Ao confirmar o ponto, o app tenta consultar a Solar API e mostra “Buscando dados do seu telhado…”.
2. **Telhado:**
   - Se a Solar API retornar segmentos, eles são listados com inclinação, azimute, área e energia. O usuário escolhe um e pode optar por migrar para o modo manual.
   - Se não houver dados (404/sem cobertura), o modo manual original é habilitado (polígono + thumbnails com Static Maps).
3. **Ângulos:**
   - Solar API: exibe β/γ identificados (somente leitura).
   - Manual: sliders β (14–22°) e γ (0–360°) com goniômetro interativo.
4. **Conta de Luz:** gasto mensal obrigatório, tarifa ou consumo opcionais, meta de compensação 50–100% (default 90%).
5. **Resultados:**
   - Solar API: usa energia mensal/anual da API quando disponível; caso contrário, calcula via NASA POWER + Liu–Jordan usando β/γ fornecidos.
   - Manual: NASA POWER + Liu–Jordan, área útil = polígono × 70%.
   Gráfico (Chart.js), tabela mensal, alertas de incerteza e exportação PDF (html2canvas + jsPDF) permanecem.

## Integração Solar API
- Endpoint usado: `buildingInsights:findClosest` com `requiredQuality=BASE`.
- Campos aproveitados: `pitchDegrees`, `azimuthDegrees`, `groundAreaMeters2`, `maxArrayAreaMeters2`, `monthlyEnergyKwh`/`annualEnergyKwh`, `recommendedSystemKw`.
- Erros tratados: 404 → fallback manual automático; 403/429 → mensagem de quota/chave inválida; demais → aviso e opção manual.

## NASA POWER
- Continua disponível para reforçar cálculos quando não há energia mensal da Solar API ou em modo manual.
- Endpoint mensal (`temporal/monthly/point`) consumido no browser; respostas são cacheadas por coordenada e há mock em `src/mock/nasaPowerResponse.json` para fallback offline.

## Testes
- Testes unitários cobrem dimensionamento manual e via Solar API (`src/services/__tests__/solarCalculations.test.ts`).
- Execute:
  ```bash
  npm run test
  ```

## Build & deploy
- `npm run build` gera `dist/`; hospede em CDN (Netlify, Vercel, S3 etc.).
- Configure fallback SPA (`/* -> /index.html`).
- Restrinja as chaves do Maps e Solar API por referrer/quotas e acompanhe faturamento.

## Avisos e limitações
- MVP 100% front-end; não há persistência.
- Quando a Solar API fornece `maxArrayAreaMeters2`, não aplicamos novamente o fator 70%; se apenas `groundAreaMeters2` estiver disponível, aplicamos 70% conservador.
- Fallback manual mantém defaults β=18°, γ=0° (ajustáveis).
- Estimativas possuem incerteza ±12% e não substituem projeto elétrico homologado.
- Controle de desenho do mapa depende da biblioteca `drawing`; restrições incorretas da key podem exigir o modo manual.

## Licença de dados
- Mapas e imagens: © Google — observar ToS e manter atribuições visíveis.
- Solar API: sujeito às quotas e pricing do Google Maps Platform.
- Irradiação solar: NASA POWER (uso público), sujeito a limites de requisições.
