# Prospecção & Gestão de Leads — Guia para o Frontend

## Conceito central

**O cadastro de leads acontece exclusivamente pelo formulário de inscrição de visitantes.**

Quando alguém preenche o formulário para visitar a ExpoMultimix, esse registro é o lead. Não existe endpoint separado de "criar lead" para o público. A partir do CNPJ informado no cadastro, o time interno pode enriquecer dados e entender o perfil do público.

Fluxo geral:

```
[Formulário público]                [Painel interno]
   Visitante preenche         →    Admin vê analytics
   POST /visitors             →    e gerencia prospects B2B
   (CNPJ obrigatório)         →    (compradores de stand)
```

---

## 1. Formulário de inscrição (cadastro de lead)

### Endpoint
```
POST /visitors
Content-Type: application/json
```

### Body completo

```typescript
interface CreateVisitorPayload {
  // Identificação pessoal
  name: string;           // obrigatório
  email: string;          // obrigatório, formato e-mail
  phone: string;          // obrigatório, formato BR ex: "+55 92 99999-0000"

  // Empresa — CHAVE para o analytics de audiência
  company: string;        // obrigatório, nome da empresa
  cnpj: string;           // obrigatório, 14 dígitos sem formatação

  // Endereço
  zipCode: string;        // obrigatório, 8 dígitos sem hífen
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;          // preenchido automaticamente via CEP/CNPJ
  state?: string;         // preenchido automaticamente via CEP/CNPJ

  // Perfil da visita
  sectors: string[];      // obrigatório, array de IDs (buscar em GET /sectors/:fairId)
  howDidYouKnow: string;  // obrigatório, ID (buscar em GET /how-did-you-know/:fairId)
  category: string;       // obrigatório, ID (buscar em GET /categories/:fairId)
  fair_visitor: string;   // obrigatório, ID da feira (UUID)
}
```

### Resposta de sucesso (201)

```json
{
  "registrationCode": "uuid-gerado-automaticamente",
  "name": "João Silva",
  "company": "Distribuidora Silva Ltda",
  "email": "joao@silva.com.br",
  "cnpj": "19131243000197",
  "registrationDate": "2026-06-16T12:00:00.000Z"
}
```

> O `registrationCode` é o ID do visitante e é usado para gerar o QR code de check-in.

---

## 2. UX: auto-preencher empresa ao digitar o CNPJ

Use o endpoint de lookup de CNPJ para melhorar a experiência do formulário.
Quando o usuário terminar de digitar o CNPJ (14 dígitos), faça a busca e preencha os campos automaticamente.

```
GET /cnpj/:cnpj
Authorization: Bearer <token>
```

### Exemplo de resposta

```json
{
  "cnpj": "19131243000197",
  "razao_social": "DISTRIBUIDORA SILVA LTDA",
  "nome_fantasia": "Silva Distribuidora",
  "situacao_cadastral": "ATIVA",
  "email": "contato@silva.com.br",
  "ddd_telefone_1": "92999990000",
  "municipio": "MANAUS",
  "uf": "AM",
  "cep": "69000000",
  "cnae_fiscal": 4649408,
  "cnae_fiscal_descricao": "Comércio atacadista de produtos de higiene",
  "cnaeSector": "Comércio Atacadista",
  "isB2bPriority": true
}
```

### Mapeamento sugerido para o formulário

```typescript
async function onCnpjBlur(cnpj: string) {
  const data = await api.get(`/cnpj/${cnpj.replace(/\D/g, '')}`);
  form.setValue('company', data.nome_fantasia || data.razao_social);
  form.setValue('city', toTitleCase(data.municipio));
  form.setValue('state', data.uf);
  if (!form.getValues('email')) form.setValue('email', data.email);
  if (!form.getValues('phone')) form.setValue('phone', data.ddd_telefone_1);
}
```

> Se o CNPJ retornar `situacao_cadastral !== 'ATIVA'`, exiba um alerta ao usuário.

---

## 3. Dados de apoio para o formulário

Buscar antes de renderizar o formulário, usando o `fairId` corrente.

```
GET /sectors/:fairId          → lista de setores de atuação
GET /how-did-you-know/:fairId → lista de canais "como ficou sabendo"
GET /categories/:fairId       → lista de categorias de visitante
```

### Exemplo de uso

```typescript
const [sectors, channels, categories] = await Promise.all([
  api.get(`/sectors/${fairId}`),
  api.get(`/how-did-you-know/${fairId}`),
  api.get(`/categories/${fairId}`),
]);
```

---

## 4. Dashboard de audiência (painel interno)

### 4.1 Visitantes inscritos — métricas em tempo real

Todos os endpoints abaixo exigem autenticação JWT.

```
GET /dashboard/overview?fairId=:id
GET /dashboard/visitors/count?fairId=:id
GET /dashboard/visitors/checked-in?fairId=:id
GET /dashboard/visitors/category?fairId=:id
GET /dashboard/visitors/sectors?fairId=:id
GET /dashboard/visitors/origin?fairId=:id
GET /dashboard/conversions/how-did-you-know?fairId=:id
```

#### Cards de KPI sugeridos

```
Total inscritos  →  GET /dashboard/visitors/count
Check-ins feitos →  GET /dashboard/visitors/checked-in
Taxa de presença →  checkins.total / inscritos.total * 100
```

#### Gráficos de audiência sugeridos (ApexCharts)

| Endpoint | Tipo de gráfico | Dado retornado |
|---|---|---|
| `/dashboard/visitors/category` | Donut | `[{ category, count }]` |
| `/dashboard/visitors/sectors` | Horizontal Bar | `[{ sector, count }]` |
| `/dashboard/visitors/origin` | Mapa / Bar | `[{ state, count }]` |
| `/dashboard/conversions/how-did-you-know` | Donut / Bar | `[{ channel, count }]` |

### 4.2 Analytics de prospects B2B

Para empresas que ainda não se inscreveram mas estão na fila de prospecção:

```
GET /fairs/:fairId/prospects/analytics
Authorization: Bearer <token>
```

#### Estrutura da resposta

```typescript
interface ProspectAnalytics {
  overview: {
    total: number;
    byType: { expositores: number; visitantes: number };
    conversionRate: number;  // % convertidos
    contactRate: number;     // % contatados
    withEmail: number;       // quantos têm e-mail
    withPhone: number;       // quantos têm telefone
    enriched: number;        // quantos têm CNAE classificado
  };

  funnel: Array<{
    status: 'NOVO' | 'CONTATADO' | 'RESPONDEU' | 'INTERESSADO' | 'CONVERTIDO' | 'DESCARTADO';
    count: number;
  }>;

  sectorDistribution: Array<{
    sector: string;
    count: number;
    b2bPriority: boolean;  // true = setor relevante para ExpoMultimix
  }>;

  geographicDistribution: Array<{ state: string; count: number }>;

  topCnaes: Array<{
    code: string;
    description: string;
    sector: string;
    count: number;
  }>;

  // Prontos para ApexCharts — não precisa transformar
  charts: {
    sector: {
      labels: string[];  // nomes dos setores
      series: number[];  // contagens — type: 'donut'
    };
    funnel: {
      categories: string[];
      series: [{ name: string; data: number[] }];  // type: 'bar'
    };
    geographic: {
      categories: string[];  // UFs
      series: [{ name: string; data: number[] }];  // type: 'bar', horizontal: true
    };
  };
}
```

---

## 5. Lista de visitantes com filtros

```
GET /visitors?fairId=:id&page=1&limit=50&sortBy=name&sortOrder=asc
GET /visitors?fairId=:id&dateFrom=2026-06-09&dateTo=2026-06-11
GET /visitors?fairId=:id&search=silva
```

### Parâmetros disponíveis

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `fairId` | UUID | obrigatório |
| `page` | number | padrão 1 |
| `limit` | number | padrão 20 |
| `sortBy` | `name \| email \| registrationDate` | padrão `registrationDate` |
| `sortOrder` | `asc \| desc` | padrão `desc` |
| `search` | string | filtra por nome, e-mail, empresa, CNPJ |
| `dateFrom` | `YYYY-MM-DD` | data de inscrição inicial |
| `dateTo` | `YYYY-MM-DD` | data de inscrição final (inclui até 23:59 do dia) |

### Resposta

```typescript
interface PaginatedVisitors {
  data: Visitor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## 6. Gestão interna de prospects B2B (compradores de stand)

Estes endpoints são para o time interno prospectar empresas que ainda não se inscreveram.

### Listar prospects
```
GET /fairs/:fairId/prospects?type=EXPOSITOR&status=NOVO&state=AM
```

| Filtro | Valores |
|---|---|
| `type` | `EXPOSITOR` (stand) ou `VISITANTE` (lojista) |
| `status` | `NOVO`, `CONTATADO`, `RESPONDEU`, `INTERESSADO`, `CONVERTIDO`, `DESCARTADO` |
| `state` | sigla da UF |
| `sector` | ex: `TI e Software`, `Comércio Atacadista` |
| `search` | razão social, e-mail, CNPJ |

### Importar lista de CNPJs em lote
```
POST /fairs/:fairId/prospects/import-cnpjs
```
```json
{
  "cnpjs": ["19131243000197", "00000000000191"],
  "type": "EXPOSITOR"
}
```
Cada CNPJ é consultado na Receita Federal e enriquecido automaticamente com nome, CNAE, cidade, UF.
Retorna `{ imported, skipped, errors }`. Demora ~1s por CNPJ (limite da API gratuita).

### Mover no funil
```
PATCH /fairs/:fairId/prospects/:id/status
```
```json
{
  "status": "CONTATADO",
  "notes": "Ligação feita, interesse confirmado"
}
```

### Enriquecer um prospect manualmente
```
POST /fairs/:fairId/prospects/:id/enrich
```
Consulta o CNPJ do prospect na Receita Federal e preenche os campos faltantes (nome, CNAE, setor, telefone, e-mail).

---

## 7. Exemplo de tela: Dashboard de audiência

```
┌─────────────────────────────────────────────────────────────┐
│  AUDIÊNCIA — Expo Multimix 2026                             │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Inscritos   │  Check-ins   │  Taxa presença│  B2B Priority  │
│    1.240     │    890       │    71.8%      │    43 setores  │
├──────────────┴──────────────┴──────────────┴────────────────┤
│  [Donut] Setores CNAE         [Bar] Como ficou sabendo      │
│  - Comércio Atacadista 28%    - Instagram 35%               │
│  - TI e Software 18%          - Indicação 22%               │
│  - Varejo 15% ...             - Google 18% ...              │
├─────────────────────────────────────────────────────────────┤
│  [Horizontal Bar] Origem geográfica                         │
│  AM ███████████████ 780                                     │
│  PA ████████ 220                                            │
│  RR ████ 90  ...                                            │
├─────────────────────────────────────────────────────────────┤
│  [Bar] Funil de prospects B2B (compradores de stand)        │
│  NOVO 45 │ CONTATADO 30 │ INTERESSADO 18 │ CONVERTIDO 8    │
└─────────────────────────────────────────────────────────────┘
```

**Fontes de dados para cada bloco:**

| Bloco | Endpoint |
|---|---|
| Inscritos / Check-ins / Taxa | `GET /dashboard/overview?fairId=` |
| Donut setores visitantes | `GET /dashboard/visitors/sectors?fairId=` |
| Como ficou sabendo | `GET /dashboard/conversions/how-did-you-know?fairId=` |
| Origem geográfica visitantes | `GET /dashboard/visitors/origin?fairId=` |
| Funil B2B (prospects) | `GET /fairs/:fairId/prospects/analytics` → `charts.funnel` |
| Setores prospects | `GET /fairs/:fairId/prospects/analytics` → `charts.sector` |

---

## 8. Resumo de rotas por tela

### Tela pública: Formulário de inscrição
| Ação | Endpoint |
|---|---|
| Buscar setores | `GET /sectors/:fairId` |
| Buscar canais | `GET /how-did-you-know/:fairId` |
| Buscar categorias | `GET /categories/:fairId` |
| Auto-fill CNPJ | `GET /cnpj/:cnpj` |
| **Registrar visitante** | **`POST /visitors`** |

### Tela interna: Lista de leads (visitantes)
| Ação | Endpoint |
|---|---|
| Listar com filtros/busca | `GET /visitors?fairId=&search=&dateFrom=&dateTo=` |
| Ver detalhes | `GET /visitors/:id` |

### Tela interna: Dashboard de audiência
| Ação | Endpoint |
|---|---|
| KPIs gerais | `GET /dashboard/overview?fairId=` |
| Por categoria | `GET /dashboard/visitors/category?fairId=` |
| Por setor CNAE (visitantes) | `GET /dashboard/visitors/sectors?fairId=` |
| Por estado | `GET /dashboard/visitors/origin?fairId=` |
| Por canal aquisição | `GET /dashboard/conversions/how-did-you-know?fairId=` |
| Analytics prospects B2B | `GET /fairs/:fairId/prospects/analytics` |

### Tela interna: Gestão de prospects B2B
| Ação | Endpoint |
|---|---|
| Listar | `GET /fairs/:fairId/prospects` |
| Importar CNPJs | `POST /fairs/:fairId/prospects/import-cnpjs` |
| Atualizar status | `PATCH /fairs/:fairId/prospects/:id/status` |
| Enriquecer | `POST /fairs/:fairId/prospects/:id/enrich` |
| Remover | `DELETE /fairs/:fairId/prospects/:id` |

---

## 9. Mapa geográfico — de onde vêm os lojistas

### Endpoint

```
GET /fairs/:fairId/prospects/analytics/geo
Authorization: Bearer <token>
```

### Resposta

```json
{
  "summary": {
    "totalProspects": 4120,
    "withState": 4000,
    "withCity": 3800,
    "withNeighborhood": 2900,
    "uniqueStates": 12,
    "uniqueCities": 180,
    "uniqueNeighborhoods": 420
  },
  "byState": [
    { "state": "AM", "count": 1800, "percentage": 45.0 },
    { "state": "SP", "count": 600,  "percentage": 14.6 },
    { "state": "PA", "count": 300,  "percentage": 7.3  }
  ],
  "byCity": [
    { "city": "Manaus",     "state": "AM", "count": 1200 },
    { "city": "São Paulo",  "state": "SP", "count": 400  },
    { "city": "Belém",      "state": "PA", "count": 200  }
  ],
  "byNeighborhood": [
    { "neighborhood": "Adrianópolis", "city": "Manaus", "state": "AM", "count": 89 },
    { "neighborhood": "Centro",       "city": "Manaus", "state": "AM", "count": 74 }
  ],
  "bySectorPerState": [
    {
      "state": "AM",
      "sectors": [
        { "sector": "Comércio Varejista", "count": 480 },
        { "sector": "TI e Software",      "count": 210 }
      ]
    }
  ],
  "charts": {
    "stateBar": {
      "categories": ["AM", "SP", "PA"],
      "series": [{ "name": "Prospects", "data": [1800, 600, 300] }]
    },
    "cityTreemap": [
      { "x": "Manaus/AM",    "y": 1200 },
      { "x": "São Paulo/SP", "y": 400  }
    ],
    "neighborhoodBar": {
      "categories": ["Adrianópolis, Manaus", "Centro, Manaus"],
      "series": [{ "name": "Lojas", "data": [89, 74] }]
    }
  }
}
```

> **Nota:** `byNeighborhood` é preenchido com o bairro do endereço registrado da empresa no CNPJ (via BrasilAPI). Disponível após rodar `POST /prospects/enrich-all`.

---

### Implementação do mapa no frontend

#### Opção A — Choropleth de estados (react-leaflet + GeoJSON)

Melhor para visão macro: "o AM representa 45% dos prospects".

```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

```tsx
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import brazilGeoJson from './brazil-states.geojson.json'; // veja abaixo

function ProspectMapBrazil({ geoData }) {
  const countByState = Object.fromEntries(
    geoData.byState.map(s => [s.state, s.count])
  );
  const max = Math.max(...geoData.byState.map(s => s.count));

  function styleFeature(feature) {
    const uf = feature.properties.sigla; // campo no GeoJSON do IBGE
    const count = countByState[uf] ?? 0;
    const intensity = max > 0 ? count / max : 0;
    return {
      fillColor: `rgba(59, 130, 246, ${0.1 + intensity * 0.85})`, // azul
      weight: 1,
      color: '#1e40af',
      fillOpacity: 1,
    };
  }

  function onEachFeature(feature, layer) {
    const uf = feature.properties.sigla;
    const entry = geoData.byState.find(s => s.state === uf);
    layer.bindTooltip(
      `<b>${feature.properties.nome}</b><br>${entry?.count ?? 0} lojas (${entry?.percentage ?? 0}%)`
    );
  }

  return (
    <MapContainer center={[-14, -51]} zoom={4} style={{ height: 450 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <GeoJSON data={brazilGeoJson} style={styleFeature} onEachFeature={onEachFeature} />
    </MapContainer>
  );
}
```

**GeoJSON dos estados do Brasil (IBGE):**
```
https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson
```
Salve localmente em `src/assets/brazil-states.geojson.json` para evitar dependência de rede em build.

---

#### Opção B — Treemap de cidades (ApexCharts)

Sem mapa real, mas mostra peso relativo de cada cidade — simples e eficaz.

```tsx
import ReactApexChart from 'react-apexcharts';

function CityTreemap({ geoData }) {
  const options = {
    chart: { type: 'treemap' },
    title: { text: 'Origem dos lojistas por cidade' },
    dataLabels: { enabled: true },
  };

  const series = [{ data: geoData.charts.cityTreemap }];
  // cityTreemap = [{ x: "Manaus/AM", y: 1200 }, ...]

  return <ReactApexChart type="treemap" options={options} series={series} height={400} />;
}
```

---

#### Opção C — Ranking de bairros (bar horizontal)

Para a visão de "quais bairros têm mais lojas" — dados diretos do CNPJ enriquecido.

```tsx
function NeighborhoodBar({ geoData }) {
  const options = {
    chart: { type: 'bar' },
    plotOptions: { bar: { horizontal: true } },
    xaxis: { categories: geoData.charts.neighborhoodBar.categories },
    title: { text: 'Bairros com maior concentração de lojas' },
  };

  return (
    <ReactApexChart
      type="bar"
      options={options}
      series={geoData.charts.neighborhoodBar.series}
      height={450}
    />
  );
}
```

---

#### Opção D — Marcadores no mapa por cidade (geocoding client-side)

Se precisar de pontos no mapa por cidade, use Nominatim (OpenStreetMap, gratuito) no frontend para geocodificar os nomes de cidades retornados pela API. Faça isso **uma vez** e guarde em cache no localStorage:

```ts
async function geocodeCity(city: string, state: string): Promise<[number, number] | null> {
  const cacheKey = `geo_${city}_${state}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const url = `https://nominatim.openstreetmap.org/search?` +
    `city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}` +
    `&country=brazil&format=json&limit=1`;

  const res = await fetch(url, { headers: { 'User-Agent': 'expomultimix-dashboard/1.0' } });
  const data = await res.json();
  if (!data.length) return null;

  const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  localStorage.setItem(cacheKey, JSON.stringify(coords));
  return coords;
}
```

> Nominatim tem rate limit de 1 req/s — geocodifique cidades de forma sequencial com 1s de delay entre cada uma.

---

### Layout sugerido para a tela de mapa

```
┌────────────────────────────────────────────────────────────────┐
│  ORIGEM DOS LOJISTAS — Expo Multimix 2026                      │
├────────────┬───────────────┬───────────────┬───────────────────┤
│  Estados   │  Cidades      │  Com bairro   │  Cobertura        │
│    12      │    180        │   2.900       │  geográfica 97%   │
├────────────┴───────────────┴───────────────┴───────────────────┤
│  [Mapa choropleth — Brasil por estado, intensidade azul]       │
│                                                                │
│   AM ████████████ 45%    PA ████ 7%                           │
│   SP ███████ 14%         RJ ███ 5%  ...                       │
├─────────────────────────┬──────────────────────────────────────┤
│  [Treemap] Top cidades  │  [Bar H] Top bairros                │
│  Manaus/AM      1200    │  Adrianópolis, Manaus     89        │
│  São Paulo/SP    400    │  Centro, Manaus           74        │
│  Belém/PA        200    │  Aleixo, Manaus           51        │
└─────────────────────────┴──────────────────────────────────────┘
```

**Endpoint único que alimenta toda a tela:**
```
GET /fairs/:fairId/prospects/analytics/geo
```

---

## 10. Backfill (uso único — apenas para dados históricos)

Estes endpoints sincronizam visitantes que já existiam na base **antes** do módulo de prospecção ser ativado. Execute **uma única vez** após o deploy.

### Passo 1 — Sincronizar toda a base de visitantes

```
POST /visitors/sync-prospects/all
Authorization: Bearer <token>
```

Processa todos os visitantes de todas as feiras em blocos de 200. Cria registros em `prospects` sem fazer chamadas externas (rápido — ~30–60s para 4000 visitantes).

**Resposta:**
```json
{
  "total": 4120,
  "created": 4100,
  "updated": 15,
  "errors": 5,
  "fairsProcessed": 8
}
```

### Passo 2 — Enriquecer CNAEs em background

```
POST /prospects/enrich-all
Authorization: Bearer <token>
```

**Retorna 202 imediatamente.** O servidor processa em background, respeitando o rate limit da BrasilAPI (1 req/s).

Deduplicação automática: se 10 feiras têm o mesmo CNPJ, a API pública é consultada 1 vez apenas.

**Resposta imediata:**
```json
{
  "message": "Enriquecimento global iniciado em background. Acompanhe os logs do servidor para o progresso..."
}
```

**Acompanhar progresso** (polling periódico, ex: a cada 5 minutos):
```
GET /fairs/:fairId/prospects/analytics
→ overview.enriched  (cresce conforme CNAEs são classificados)
→ overview.total     (total de prospects)
```

### Passo alternativo: enriquecer só uma feira

```
POST /fairs/:fairId/prospects/enrich-all
Authorization: Bearer <token>
```

Também retorna 202 imediatamente e processa em background.

---

## 10. Enums e tipos

### ProspectStatus
| Valor | Descrição | Cor sugerida |
|---|---|---|
| `NOVO` | Recém criado, não contatado | `#9CA3AF` (gray) |
| `CONTATADO` | Primeiro contato feito | `#3B82F6` (blue) |
| `RESPONDEU` | Lead respondeu | `#F59E0B` (amber) |
| `INTERESSADO` | Lead demonstrou interesse | `#F97316` (orange) |
| `CONVERTIDO` | Virou cliente / inscrito | `#10B981` (emerald) |
| `DESCARTADO` | Descartado do funil | `#EF4444` (red) |

### ProspectType
| Valor | Descrição |
|---|---|
| `VISITANTE` | Lojista que visitou a feira |
| `EXPOSITOR` | Empresa que comprou stand |

### ProspectSource
| Valor | Origem |
|---|---|
| `MANUAL` | Cadastrado pelo operador |
| `VISITANTE` | Criado automaticamente via inscrição (POST /visitors) |
| `BUSCA_CNPJ` | Importado via lista de CNPJs |
