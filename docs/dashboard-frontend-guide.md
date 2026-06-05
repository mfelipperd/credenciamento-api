# Dashboard — Guia de Implementação Frontend

> Stack: React + TypeScript + ApexCharts (`react-apexcharts`)  
> Base URL: `https://credenciamento-api-production.up.railway.app`  
> Autenticação: `Authorization: Bearer <access_token>`  
> Todos os valores monetários estão em **R$ (reais)** — já convertidos pelo backend.

---

## Sumário

1. [Instalação](#1-instalação)
2. [Tipos TypeScript](#2-tipos-typescript)
3. [Hook de dados — useFairDashboard](#3-hook-de-dados--usefairdashboard)
4. [Layout da Dashboard — estrutura visual](#4-layout-da-dashboard--estrutura-visual)
5. [KPI Cards — implementação](#5-kpi-cards--implementação)
6. [Gráficos por feira](#6-gráficos-por-feira)
7. [Gráficos comparativos (home da empresa)](#7-gráficos-comparativos-home-da-empresa)
8. [Fluxo de UI recomendado](#8-fluxo-de-ui-recomendado)
9. [Estados de loading e erro](#9-estados-de-loading-e-erro)
10. [Formatação de valores](#10-formatação-de-valores)
11. [Prompt completo para IA](#11-prompt-completo-para-ia)

---

## 1. Instalação

```bash
npm install react-apexcharts apexcharts
```

---

## 2. Tipos TypeScript

```typescript
// types/charts.ts

export interface ApexDonutData {
  series: number[];
  labels: string[];
  colors: string[];
  total: number;
}

export interface ApexBarData {
  series: { name: string; data: number[] }[];
  categories: string[];
}

export interface FairKpi {
  receita: {
    totalContrato: number;     // valor total dos contratos
    totalRecebido: number;     // parcelas marcadas PAGA
    totalAReceber: number;     // totalContrato - totalRecebido
    totalVencido: number;      // parcelas VENCIDA não pagas
    inadimplencia: number;     // % (totalVencido / totalContrato × 100)
  };
  despesas: {
    total: number;             // diretas + rateadas (ambos os sistemas)
    diretas: number;           // só desta feira
    rateadas: number;          // overhead alocado para esta feira
  };
  resultado: {
    lucroProjetado: number;    // totalContrato - despesas
    lucroRealizado: number;    // totalRecebido - despesas (caixa real)
    margemProjetada: number;   // % sobre contrato
    margemRealizada: number;   // % sobre recebido
    isProfitable: boolean;     // baseado no projetado
  };
  visitantes: {
    total: number;             // inscritos
    checkins: number;          // check-ins realizados
    taxaComparecimento: number; // %
    custoPorVisitante: number;  // R$
  };
}
```

---

## 3. Hook de dados — `useFairDashboard`

Faça **uma única chamada por chart** em paralelo. Nunca waterfall.

```typescript
// hooks/useFairDashboard.ts
import { useEffect, useState } from 'react';
import { FairKpi, ApexDonutData, ApexBarData } from '../types/charts';

const API = 'https://credenciamento-api-production.up.railway.app';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

interface FairDashboardData {
  kpi: FairKpi | null;
  expensesByCategory: ApexDonutData | null;
  revenuesByStatus: ApexDonutData | null;
  revenueForecast: ApexBarData | null;
  visitorsTimeline: ApexBarData | null;
  checkinsByHour: ApexBarData | null;
}

export function useFairDashboard(fairId: string, token: string) {
  const [data, setData] = useState<FairDashboardData>({
    kpi: null,
    expensesByCategory: null,
    revenuesByStatus: null,
    revenueForecast: null,
    visitorsTimeline: null,
    checkinsByHour: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fairId || !token) return;
    setLoading(true);

    // Todas as chamadas em paralelo — nunca sequencial
    Promise.all([
      get<FairKpi>(`/charts/fair/${fairId}/kpi`, token),
      get<ApexDonutData>(`/charts/fair/${fairId}/expenses-by-category`, token),
      get<ApexDonutData>(`/charts/fair/${fairId}/revenues-by-status`, token),
      get<ApexBarData>(`/charts/fair/${fairId}/revenue-forecast`, token),
      get<ApexBarData>(`/charts/fair/${fairId}/visitors-timeline`, token),
      get<ApexBarData>(`/charts/fair/${fairId}/checkins-by-hour`, token),
    ])
      .then(([kpi, expensesByCategory, revenuesByStatus, revenueForecast, visitorsTimeline, checkinsByHour]) => {
        setData({ kpi, expensesByCategory, revenuesByStatus, revenueForecast, visitorsTimeline, checkinsByHour });
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [fairId, token]);

  return { data, loading, error };
}

// Hook separado para a home (comparativo entre feiras)
export function useCompareCharts(fairIds: string[], token: string) {
  const [data, setData] = useState<{
    revenueVsExpenses: ApexBarData | null;
    margins: ApexBarData | null;
    expensesBreakdown: ApexBarData | null;
  }>({ revenueVsExpenses: null, margins: null, expensesBreakdown: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fairIds.length || !token) return;
    const qs = fairIds.join(',');

    Promise.all([
      get<ApexBarData>(`/charts/compare?fairIds=${qs}`, token),
      get<ApexBarData>(`/charts/compare/margins?fairIds=${qs}`, token),
      get<ApexBarData>(`/charts/compare/expenses-breakdown?fairIds=${qs}`, token),
    ])
      .then(([revenueVsExpenses, margins, expensesBreakdown]) => {
        setData({ revenueVsExpenses, margins, expensesBreakdown });
      })
      .finally(() => setLoading(false));
  }, [fairIds.join(','), token]);

  return { data, loading };
}
```

---

## 4. Layout da Dashboard — estrutura visual

### Hierarquia de telas

```
HOME (visão empresa)
├── Seletor de feira ativo
├── Row: 4 KPI Cards principais
├── Row: Gráfico comparativo receita/despesa/lucro (todas as feiras)
├── Row: Margem por feira | Breakdown despesas
└── Atalhos para tela de feira específica

FEIRA SELECIONADA
├── Row: 8 KPI Cards (2 rows de 4)
├── Row: Donut receitas por status | Donut despesas por categoria
├── Row: Forecast de recebimento (bar stacked, mês a mês)
├── Row: Timeline de inscrições | Check-ins por horário
└── Link para módulos (Despesas, Receitas, Visitantes)
```

### Grid mobile-first

```
Mobile  (< 768px)  → 1 coluna, cards empilhados
Tablet  (768–1024) → 2 colunas
Desktop (> 1024px) → 3–4 colunas

KPI Cards: sempre 2 por linha em mobile, 4 em desktop
Gráficos grandes: full-width em mobile, 50% em desktop
Donuts: 100% em mobile, side-by-side em desktop
```

---

## 5. KPI Cards — implementação

### Endpoint
```
GET /charts/fair/:fairId/kpi
```

### Como montar os cards

```typescript
// components/KpiCard.tsx
interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
  color?: 'green' | 'red' | 'blue' | 'orange' | 'default';
  icon?: React.ReactNode;
}

// Mapeamento de campos → cards
function buildCards(kpi: FairKpi): KpiCardProps[] {
  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  const pct = (n: number) => `${n.toFixed(1)}%`;

  return [
    // Row 1 — Receita
    {
      label: 'Receita Total',
      value: fmt(kpi.receita.totalContrato),
      subtext: `Recebido: ${fmt(kpi.receita.totalRecebido)}`,
      color: 'blue',
    },
    {
      label: 'A Receber',
      value: fmt(kpi.receita.totalAReceber),
      subtext: 'Contratos em aberto',
      color: 'orange',
    },
    {
      label: 'Em Atraso',
      value: fmt(kpi.receita.totalVencido),
      subtext: `Inadimplência: ${pct(kpi.receita.inadimplencia)}`,
      color: kpi.receita.inadimplencia > 10 ? 'red' : 'default',
    },
    {
      label: 'Total de Despesas',
      value: fmt(kpi.despesas.total),
      subtext: `Diretas: ${fmt(kpi.despesas.diretas)} | Rateadas: ${fmt(kpi.despesas.rateadas)}`,
      color: 'default',
    },

    // Row 2 — Resultado e Visitantes
    {
      label: 'Lucro Projetado',
      value: fmt(kpi.resultado.lucroProjetado),
      subtext: `Margem: ${pct(kpi.resultado.margemProjetada)}`,
      color: kpi.resultado.isProfitable ? 'green' : 'red',
    },
    {
      label: 'Lucro Realizado',
      value: fmt(kpi.resultado.lucroRealizado),
      subtext: `Margem s/ recebido: ${pct(kpi.resultado.margemRealizada)}`,
      color: kpi.resultado.lucroRealizado > 0 ? 'green' : 'red',
    },
    {
      label: 'Visitantes',
      value: kpi.visitantes.total.toLocaleString('pt-BR'),
      subtext: `Check-ins: ${kpi.visitantes.checkins} (${pct(kpi.visitantes.taxaComparecimento)})`,
      color: 'blue',
    },
    {
      label: 'Custo por Visitante',
      value: fmt(kpi.visitantes.custoPorVisitante),
      subtext: 'Despesas ÷ inscritos',
      color: 'default',
    },
  ];
}
```

### Skeleton de loading

```typescript
// Mostrar 8 cards skeleton enquanto carrega
function KpiCardSkeleton() {
  return (
    <div className="kpi-card skeleton">
      <div className="skeleton-line w-40" />   {/* label */}
      <div className="skeleton-line w-60 h-8" /> {/* value */}
      <div className="skeleton-line w-48" />   {/* subtext */}
    </div>
  );
}
```

---

## 6. Gráficos por feira

### 6.1 Despesas por categoria — Donut

**Endpoint:** `GET /charts/fair/:fairId/expenses-by-category`

**Resposta:**
```json
{
  "series": [79028.3, 70165, 34253.17, 19944],
  "labels": ["MONTADORA", "ESPAÇO", "IMPOSTOS", "CARTÃO DE CRÉDITO"],
  "colors": ["#008FFB", "#00E396", "#FEB019", "#FF4560"],
  "total": 236938.97
}
```

**Implementação:**
```tsx
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

function ExpensesByCategoryChart({ data }: { data: ApexDonutData }) {
  const options: ApexOptions = {
    chart: { type: 'donut' },
    labels: data.labels,
    colors: data.colors,
    legend: { position: 'bottom' },
    dataLabels: {
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
    tooltip: {
      y: {
        formatter: (val) =>
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val),
      },
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: () =>
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                  .format(data.total),
            },
          },
        },
      },
    },
  };

  return (
    <div className="chart-card">
      <h3>Despesas por Categoria</h3>
      <Chart type="donut" series={data.series} options={options} height={350} />
    </div>
  );
}
```

---

### 6.2 Receitas por status — Donut

**Endpoint:** `GET /charts/fair/:fairId/revenues-by-status`

**Resposta:**
```json
{
  "series": [180000, 90000, 42000, 30000],
  "labels": ["Pago", "Em andamento", "Pendente", "Em atraso"],
  "colors": ["#00E396", "#008FFB", "#FEB019", "#FF4560"],
  "total": 342000
}
```

**Implementação:**
```tsx
function RevenuesByStatusChart({ data }: { data: ApexDonutData }) {
  const options: ApexOptions = {
    chart: { type: 'donut' },
    labels: data.labels,
    colors: data.colors,
    legend: { position: 'bottom' },
    tooltip: {
      y: {
        formatter: (val) =>
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val),
      },
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Contratos',
              formatter: () =>
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                  .format(data.total),
            },
          },
        },
      },
    },
  };

  return (
    <div className="chart-card">
      <h3>Receitas por Status</h3>
      <Chart type="donut" series={data.series} options={options} height={350} />
    </div>
  );
}
```

---

### 6.3 Forecast de recebimento — Stacked Bar por mês

**Endpoint:** `GET /charts/fair/:fairId/revenue-forecast`

**Resposta:**
```json
{
  "series": [
    { "name": "A Vencer",  "data": [45000, 32000, 15000] },
    { "name": "Em Atraso", "data": [8000, 0, 2000] }
  ],
  "categories": ["Jun/26", "Jul/26", "Ago/26"]
}
```

**Implementação:**
```tsx
function RevenueForecastChart({ data }: { data: ApexBarData }) {
  const options: ApexOptions = {
    chart: { type: 'bar', stacked: true },
    colors: ['#008FFB', '#FF4560'],
    xaxis: { categories: data.categories },
    yaxis: {
      labels: {
        formatter: (val) => `R$ ${(val / 1000).toFixed(0)}k`,
      },
    },
    tooltip: {
      y: {
        formatter: (val) =>
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val),
      },
    },
    dataLabels: { enabled: false },
    legend: { position: 'top' },
    plotOptions: {
      bar: { horizontal: false, borderRadius: 4 },
    },
  };

  return (
    <div className="chart-card">
      <h3>Forecast de Recebimento</h3>
      <p className="chart-subtitle">Parcelas em aberto por mês</p>
      <Chart type="bar" series={data.series} options={options} height={300} />
    </div>
  );
}
```

---

### 6.4 Evolução de inscrições — Line

**Endpoint:** `GET /charts/fair/:fairId/visitors-timeline`

**Resposta:**
```json
{
  "series": [
    { "name": "Acumulado", "data": [10, 35, 89, 210, 509, 1183] },
    { "name": "No dia",    "data": [10, 25, 54, 121, 299, 674] }
  ],
  "categories": ["01/03", "08/03", "15/03", "22/03", "01/04", "10/05"]
}
```

**Implementação:**
```tsx
function VisitorsTimelineChart({ data }: { data: ApexBarData }) {
  const options: ApexOptions = {
    chart: {
      type: 'line',
      zoom: { enabled: false },
      toolbar: { show: false },
    },
    colors: ['#008FFB', '#00E396'],
    stroke: { curve: 'smooth', width: [3, 2] },
    // Série 0 (Acumulado) = linha principal (eixo y1)
    // Série 1 (No dia) = barras no fundo (eixo y2)
    yaxis: [
      { title: { text: 'Acumulado' }, seriesName: 'Acumulado' },
      {
        opposite: true,
        title: { text: 'No dia' },
        seriesName: 'No dia',
      },
    ],
    xaxis: {
      categories: data.categories,
      tickAmount: 8,  // evita sobreposição de labels em mobile
    },
    markers: { size: 3 },
    legend: { position: 'top' },
    tooltip: { shared: true },
  };

  return (
    <div className="chart-card">
      <h3>Evolução de Inscrições</h3>
      <Chart type="line" series={data.series} options={options} height={280} />
    </div>
  );
}
```

---

### 6.5 Check-ins por horário — Bar

**Endpoint:** `GET /charts/fair/:fairId/checkins-by-hour`

**Resposta:**
```json
{
  "series": [{ "name": "Check-ins", "data": [0,0,0,0,0,0,2,45,120,89,67,43,...] }],
  "categories": ["00h","01h","02h",...,"23h"]
}
```

**Implementação:**
```tsx
function CheckinsByHourChart({ data }: { data: ApexBarData }) {
  // Encontrar o horário de pico para destacar
  const maxVal = Math.max(...data.series[0].data);
  const peakHour = data.categories[data.series[0].data.indexOf(maxVal)];

  const options: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    colors: ['#775DD0'],
    xaxis: {
      categories: data.categories,
      tickAmount: 12,  // mostra 1 a cada 2 horas em mobile
    },
    yaxis: { title: { text: 'Check-ins' } },
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        borderRadius: 3,
        columnWidth: '70%',
      },
    },
    tooltip: {
      y: { formatter: (val) => `${val} check-ins` },
    },
    annotations: {
      xaxis: [{
        x: peakHour,
        borderColor: '#FF4560',
        label: { text: `Pico: ${peakHour}`, style: { color: '#fff', background: '#FF4560' } },
      }],
    },
  };

  return (
    <div className="chart-card">
      <h3>Check-ins por Horário</h3>
      <Chart type="bar" series={data.series} options={options} height={260} />
    </div>
  );
}
```

---

## 7. Gráficos comparativos (home da empresa)

Todos aceitam `?fairIds=uuid1,uuid2,...`

### 7.1 Receita vs Despesas vs Lucro — Grouped Bar

**Endpoint:** `GET /charts/compare?fairIds=uuid1,uuid2`

**Resposta:**
```json
{
  "series": [
    { "name": "Receita",  "data": [342504, 214688] },
    { "name": "Despesas", "data": [236939, 161726] },
    { "name": "Lucro",    "data": [105565,  52962] }
  ],
  "categories": ["Expo MultiMix 2025 Belém", "Expo MultiMix 2025 Manaus"]
}
```

**Implementação:**
```tsx
function CompareRevenueChart({ data }: { data: ApexBarData }) {
  const options: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    colors: ['#00E396', '#FF4560', '#008FFB'],
    xaxis: {
      categories: data.categories,
      labels: {
        // Nomes de feiras são longos — rotacionar em mobile
        rotate: -20,
        style: { fontSize: '11px' },
      },
    },
    yaxis: {
      labels: {
        formatter: (val) => `R$ ${(val / 1000).toFixed(0)}k`,
      },
    },
    tooltip: {
      y: {
        formatter: (val) =>
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val),
      },
    },
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '65%' } },
    legend: { position: 'top' },
  };

  return (
    <div className="chart-card">
      <h3>Comparativo — Receita × Despesas × Lucro</h3>
      <Chart type="bar" series={data.series} options={options} height={320} />
    </div>
  );
}
```

---

### 7.2 Margem líquida por feira — Horizontal Bar

**Endpoint:** `GET /charts/compare/margins?fairIds=uuid1,uuid2`

**Resposta:**
```json
{
  "series": [{ "name": "Margem Líquida %", "data": [30.82, 24.66] }],
  "categories": ["Expo MultiMix 2025 Belém", "Expo MultiMix 2025 Manaus"]
}
```

**Implementação:**
```tsx
function MarginsChart({ data }: { data: ApexBarData }) {
  // Colorir barras: verde se > 20%, amarelo se 0–20%, vermelho se < 0
  const colors = data.series[0].data.map(v =>
    v >= 20 ? '#00E396' : v >= 0 ? '#FEB019' : '#FF4560'
  );

  const options: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    colors,
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,  // cor individual por barra
        borderRadius: 4,
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`,
      offsetX: 8,
      style: { colors: ['#fff'] },
    },
    xaxis: {
      categories: data.categories,
      labels: { formatter: (val) => `${val}%` },
      max: Math.max(...data.series[0].data) + 10,
    },
    legend: { show: false },
    tooltip: {
      y: { formatter: (val) => `${val.toFixed(2)}%` },
    },
  };

  return (
    <div className="chart-card">
      <h3>Margem Líquida por Feira</h3>
      <Chart type="bar" series={data.series} options={options} height={200} />
    </div>
  );
}
```

---

### 7.3 Overhead vs Diretas — Stacked Bar

**Endpoint:** `GET /charts/compare/expenses-breakdown?fairIds=uuid1,uuid2`

**Resposta:**
```json
{
  "series": [
    { "name": "Diretas",  "data": [213391, 138178] },
    { "name": "Rateadas", "data": [23547,   23547] }
  ],
  "categories": ["Expo MultiMix 2025 Belém", "Expo MultiMix 2025 Manaus"]
}
```

**Implementação:**
```tsx
function ExpensesBreakdownChart({ data }: { data: ApexBarData }) {
  const options: ApexOptions = {
    chart: { type: 'bar', stacked: true, toolbar: { show: false } },
    colors: ['#008FFB', '#FEB019'],
    xaxis: { categories: data.categories },
    yaxis: {
      labels: {
        formatter: (val) => `R$ ${(val / 1000).toFixed(0)}k`,
      },
    },
    tooltip: {
      y: {
        formatter: (val) =>
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val),
      },
    },
    dataLabels: { enabled: false },
    legend: { position: 'top' },
    plotOptions: { bar: { borderRadius: 4 } },
  };

  return (
    <div className="chart-card">
      <h3>Composição das Despesas</h3>
      <p className="chart-subtitle">Diretas × custos rateados entre feiras</p>
      <Chart type="bar" series={data.series} options={options} height={280} />
    </div>
  );
}
```

---

## 8. Fluxo de UI recomendado

### Tela HOME — visão empresa

```
┌─────────────────────────────────────────────────────┐
│  EXPO MULTIMIX          [Seletor de feira ▼]        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────┐ │
│  │ Receita   │ │ Despesas  │ │ Lucro     │ │Marg.│ │
│  │ Total     │ │ Total     │ │ Projetado │ │ %   │ │
│  │ R$557k    │ │ R$398k    │ │ R$158k    │ │28%  │ │
│  └───────────┘ └───────────┘ └───────────┘ └─────┘ │
│  (soma de todas as feiras ativas)                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Receita × Despesas × Lucro por Feira               │
│  [Grouped Bar — compare]              [full-width]  │
│                                                     │
├────────────────────────┬────────────────────────────┤
│  Margem por Feira      │  Composição de Despesas    │
│  [Horizontal Bar]      │  [Stacked Bar]             │
└────────────────────────┴────────────────────────────┘
```

**Como calcular os cards da home:**

Os 4 cards de topo são a **soma** dos KPIs de todas as feiras ativas. Faça um `useFairDashboard` para cada fairId ativo e some os valores:

```typescript
function sumKpis(kpis: FairKpi[]): Partial<FairKpi> {
  return {
    receita: {
      totalContrato: kpis.reduce((s, k) => s + k.receita.totalContrato, 0),
      totalRecebido: kpis.reduce((s, k) => s + k.receita.totalRecebido, 0),
      totalAReceber: kpis.reduce((s, k) => s + k.receita.totalAReceber, 0),
      totalVencido:  kpis.reduce((s, k) => s + k.receita.totalVencido, 0),
      inadimplencia: 0, // recalcular: totalVencido / totalContrato
    },
    despesas: {
      total:    kpis.reduce((s, k) => s + k.despesas.total, 0),
      diretas:  kpis.reduce((s, k) => s + k.despesas.diretas, 0),
      rateadas: kpis.reduce((s, k) => s + k.despesas.rateadas, 0),
    },
    resultado: {
      lucroProjetado: kpis.reduce((s, k) => s + k.resultado.lucroProjetado, 0),
      lucroRealizado: kpis.reduce((s, k) => s + k.resultado.lucroRealizado, 0),
      margemProjetada: 0, // recalcular: lucroProjetado / totalContrato
      margemRealizada: 0,
      isProfitable: true,
    },
    visitantes: {
      total:    kpis.reduce((s, k) => s + k.visitantes.total, 0),
      checkins: kpis.reduce((s, k) => s + k.visitantes.checkins, 0),
      taxaComparecimento: 0, // recalcular
      custoPorVisitante: 0,  // recalcular
    },
  };
}
```

---

### Tela FEIRA — detalhe completo

```
┌─────────────────────────────────────────────────────┐
│  ← Voltar   Expo MultiMix 2025 Belém   [Status]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ROW 1 — Receita (4 cards)                         │
│  ┌────────────┐ ┌────────────┐ ┌────────┐ ┌──────┐ │
│  │ Receita    │ │ A Receber  │ │Em Atr. │ │Inadim│ │
│  │ R$342.504  │ │ R$342.504  │ │ R$0    │ │ 0%   │ │
│  └────────────┘ └────────────┘ └────────┘ └──────┘ │
│                                                     │
│  ROW 2 — Resultado (4 cards)                       │
│  ┌────────────┐ ┌────────────┐ ┌────────┐ ┌──────┐ │
│  │ Despesas   │ │ Lucro Proj │ │Margem  │ │Visit.│ │
│  │ R$236.938  │ │ R$105.565  │ │ 30.8%  │ │ 1183 │ │
│  └────────────┘ └────────────┘ └────────┘ └──────┘ │
│                                                     │
├────────────────────────┬────────────────────────────┤
│  Receitas por Status   │  Despesas por Categoria    │
│  [Donut]               │  [Donut]                   │
├────────────────────────┴────────────────────────────┤
│  Forecast de Recebimento (mês a mês)                │
│  [Stacked Bar — full-width]                        │
├────────────────────────┬────────────────────────────┤
│  Inscrições ao longo   │  Check-ins por horário     │
│  do tempo [Line]       │  [Bar]                     │
└────────────────────────┴────────────────────────────┘
```

---

## 9. Estados de loading e erro

### Loading — Skeleton pattern

```tsx
// Nunca usar spinner centralizado — usar skeleton por componente
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="chart-card skeleton animate-pulse"
      style={{ height }}
    >
      <div className="skeleton-title" />
      <div className="skeleton-body" style={{ height: height - 60 }} />
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="kpi-card skeleton animate-pulse">
      <div className="h-3 w-24 bg-gray-700 rounded mb-2" />
      <div className="h-8 w-36 bg-gray-600 rounded mb-1" />
      <div className="h-3 w-28 bg-gray-700 rounded" />
    </div>
  );
}
```

### Erro — Banner de retry

```tsx
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-banner">
      <span>⚠️ Erro ao carregar dados: {message}</span>
      <button onClick={onRetry}>Tentar novamente</button>
    </div>
  );
}
```

### Gráfico sem dados

```tsx
function EmptyChart({ label }: { label: string }) {
  return (
    <div className="chart-card empty">
      <p>{label}</p>
      <p className="text-sm text-gray-400">Nenhum dado disponível ainda.</p>
    </div>
  );
}

// Uso:
{data.expensesByCategory?.series.length
  ? <ExpensesByCategoryChart data={data.expensesByCategory} />
  : <EmptyChart label="Despesas por Categoria" />
}
```

---

## 10. Formatação de valores

```typescript
// utils/format.ts

export const currency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
// → "R$ 105.565,15"

export const currencyShort = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `R$ ${(value / 1_000).toFixed(0)}k`;
  return currency(value);
};
// → "R$ 105k" | "R$ 1,5M"

export const percent = (value: number, decimals = 1) =>
  `${value.toFixed(decimals)}%`;
// → "30.8%"

export const integer = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(Math.round(value));
// → "1.183"

// Cor semântica baseada em valor
export function profitColor(value: number): string {
  if (value > 0)  return '#00E396';   // verde
  if (value === 0) return '#FEB019';  // amarelo
  return '#FF4560';                   // vermelho
}

export function marginColor(pct: number): string {
  if (pct >= 20) return '#00E396';
  if (pct >= 0)  return '#FEB019';
  return '#FF4560';
}
```

---

## 11. Prompt completo para IA

> Cole o bloco abaixo em qualquer IA assistente para implementar o dashboard completo.

---

```
Vou te passar a especificação completa de uma dashboard financeira para o sistema
Expo MultiMix (gestão de feiras). O frontend é React + TypeScript + react-apexcharts.
Implemente os componentes conforme descrito.

## BASE URL
https://credenciamento-api-production.up.railway.app
Autenticação: Authorization: Bearer <token>

## ENDPOINTS DO DASHBOARD

### KPI Cards (1 chamada = todos os cards)
GET /charts/fair/:fairId/kpi
Retorna:
{
  receita: {
    totalContrato: number,   // R$ — valor total dos contratos
    totalRecebido: number,   // R$ — parcelas já pagas
    totalAReceber: number,   // R$ — totalContrato - totalRecebido
    totalVencido: number,    // R$ — parcelas vencidas não pagas
    inadimplencia: number,   // % — totalVencido/totalContrato×100
  },
  despesas: {
    total: number,           // R$ — inclui overhead rateado
    diretas: number,         // R$ — só desta feira
    rateadas: number,        // R$ — custo compartilhado alocado
  },
  resultado: {
    lucroProjetado: number,  // R$ — totalContrato - despesas
    lucroRealizado: number,  // R$ — totalRecebido - despesas (caixa)
    margemProjetada: number, // % — projetado/contrato×100
    margemRealizada: number, // % — realizado/recebido×100
    isProfitable: boolean,
  },
  visitantes: {
    total: number,               // inscritos
    checkins: number,
    taxaComparecimento: number,  // %
    custoPorVisitante: number,   // R$
  }
}

### Gráficos por feira (ApexCharts-ready)
Todos os endpoints abaixo retornam:
- Donut/Pie: { series: number[], labels: string[], colors: string[], total: number }
- Bar/Line:  { series: [{name, data}][], categories: string[] }

GET /charts/fair/:fairId/expenses-by-category  → Donut
GET /charts/fair/:fairId/revenues-by-status    → Donut (cores: Pago=#00E396, EmAtraso=#FF4560)
GET /charts/fair/:fairId/revenue-forecast      → Stacked Bar por mês (A Vencer + Em Atraso)
GET /charts/fair/:fairId/visitors-timeline     → Line (series[0]=Acumulado, series[1]=No dia)
GET /charts/fair/:fairId/checkins-by-hour      → Bar (24 categorias: "00h".."23h")

### Gráficos comparativos (home da empresa)
GET /charts/compare?fairIds=uuid1,uuid2        → Grouped Bar (Receita/Despesas/Lucro)
GET /charts/compare/margins?fairIds=...        → Horizontal Bar (Margem Líquida %)
GET /charts/compare/expenses-breakdown?fairIds=→ Stacked Bar (Diretas vs Rateadas)

## REGRAS DE IMPLEMENTAÇÃO

### Chamadas em paralelo — OBRIGATÓRIO
Nunca fazer chamadas sequenciais. Sempre Promise.all([...]).
Os 6 endpoints de uma feira devem ser chamados juntos no mesmo useEffect.

### Loading state
- KPI: mostrar 8 cards skeleton (2 rows × 4 cols)
- Gráficos: mostrar skeleton com a mesma altura do gráfico
- NUNCA spinner centralizado bloqueando a tela

### Dados vazios
Se series.length === 0 ou series é array de zeros:
- Mostrar placeholder "Nenhum dado disponível ainda"
- NÃO renderizar o ApexChart com dados vazios (gera erro)

### Formatação monetária
Sempre usar pt-BR currency:
  new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(value)
  
Para eixos de gráficos (espaço limitado):
  value >= 1000 → "R$ Xk" | value >= 1_000_000 → "R$ XM"

### Cores semânticas
lucroProjetado/lucroRealizado: verde se > 0, vermelho se < 0
inadimplencia: verde se < 5%, amarelo se 5–15%, vermelho se > 15%
margemProjetada: verde se >= 20%, amarelo se 0–20%, vermelho se < 0

### Layout mobile-first
- KPI Cards: 2 colunas em mobile, 4 em desktop
- Donuts: 1 por linha em mobile, 2 em desktop (side-by-side)
- Bars: full-width em mobile e desktop
- Nomes de feiras longos nos eixos: rotate: -20 em mobile

### Estrutura de telas

HOME (empresa):
1. 4 cards: soma de todas as feiras (receita total, despesas, lucro, margem)
2. Grouped Bar: receita vs despesas vs lucro por feira
3. 2 colunas: Margem por feira | Breakdown despesas

FEIRA (detalhe):
1. 4 cards: Receita Total, A Receber, Em Atraso, Inadimplência
2. 4 cards: Despesas Total, Lucro Projetado, Margem %, Visitantes
3. 2 colunas: Donut status receitas | Donut categorias despesas
4. Full-width: Forecast de recebimento (bar stacked por mês)
5. 2 colunas: Timeline inscrições (line) | Check-ins por hora (bar)

## PALETA APEXCHARTS
Receita/positivo:  '#00E396'  (verde)
Despesas/negativo: '#FF4560'  (vermelho)
Neutro/projetado:  '#008FFB'  (azul)
Pendente/warning:  '#FEB019'  (laranja/amarelo)
Rateado/overhead:  '#775DD0'  (roxo)
Categorias extras: '#3F51B5', '#03A9F4', '#4CAF50'

## TIPOS TYPESCRIPT PRONTOS
[copiar da seção 2 deste documento]

## HOOK PRONTO
[copiar da seção 3 deste documento]
```

---

*Documentação gerada em 27/05/2026. Atualizar quando novos endpoints de charts forem adicionados.*
