# Fairs API — Documentação de Mudanças (Frontend)

> **Deploy:** `aef9636` → Railway  
> **Base URL:** `https://credenciamento-api-production.up.railway.app`

---

## Índice

1. [Resumo das mudanças](#1-resumo-das-mudanças)
2. [Novo campo: `status`](#2-novo-campo-status)
3. [Endereço estruturado](#3-endereço-estruturado)
4. [Coordenadas + links de transporte](#4-coordenadas--links-de-transporte)
5. [Programação por dia (`daySchedules`)](#5-programação-por-dia-dayschedules)
6. [Novos campos informativos](#6-novos-campos-informativos)
7. [Filtros na listagem](#7-filtros-na-listagem)
8. [Schema completo da resposta](#8-schema-completo-da-resposta)
9. [Exemplos de requisição](#9-exemplos-de-requisição)
10. [Compatibilidade retroativa](#10-compatibilidade-retroativa)

---

## 1. Resumo das mudanças

| Área | O que mudou |
|------|-------------|
| **Status** | Enum `upcoming / ongoing / ended / cancelled` — novo campo `status` |
| **Endereço** | Campos separados: `venueName`, `address`, `number`, `neighborhood`, `city` |
| **UF** | `state` virou 2 letras (`"AM"`, `"PA"`) — permite filtro por UF |
| **Coordenadas** | `latitude` + `longitude` agora salvos como número |
| **Links transporte** | Campo gerado automaticamente: `transportLinks` (Google Maps, Waze, Uber, 99) |
| **Horário** | `startTime` / `endTime` salvos separados da data (formato `HH:mm`) |
| **Duração** | `durationDays` — número de dias calculado automaticamente |
| **Programação diária** | Array `daySchedules[]` — horários por dia quando diferem do padrão |
| **Planejamento** | `expectedVisitors`, `expectedExhibitors`, `edition`, `description`, `bannerUrl` |
| **Filtros** | `GET /fairs?uf=AM&status=upcoming` |

---

## 2. Novo campo: `status`

Ciclo de vida de uma feira. Valor padrão: `"upcoming"`.

| Valor | Significado |
|-------|-------------|
| `upcoming` | Ainda não começou — em breve |
| `ongoing` | Acontecendo agora |
| `ended` | Encerrada |
| `cancelled` | Cancelada |

```json
{
  "status": "upcoming"
}
```

**Uso sugerido no frontend:**
- Badge colorido na listagem de feiras
- Bloquear credenciamento quando `status === "ended"` ou `"cancelled"`
- Filtrar feiras abertas: `?status=upcoming` ou `?status=ongoing`

---

## 3. Endereço estruturado

O campo `location` (texto livre) continua existindo para compatibilidade, mas agora há campos separados para o endereço completo:

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `venueName` | `string \| null` | `"Centro de Convenções Vasco Vasques"` |
| `address` | `string \| null` | `"Av. Djalma Batista"` |
| `number` | `string \| null` | `"1350"` |
| `complement` | `string \| null` | `"Bloco A"` |
| `neighborhood` | `string \| null` | `"Chapada"` |
| `city` | `string \| null` | `"Manaus"` |
| `state` | `string \| null` | `"AM"` (2 letras, sempre maiúsculo) |
| `zipCode` | `string \| null` | `"69050-010"` |
| `country` | `string \| null` | `"Brasil"` |
| `googleMapsUrl` | `string \| null` | URL do Google Maps para o local |

**Endereço formatado sugerido para exibição:**
```ts
const endereco = [
  fair.venueName,
  [fair.address, fair.number].filter(Boolean).join(', '),
  fair.neighborhood,
  `${fair.city} – ${fair.state}`,
].filter(Boolean).join('\n');
```

---

## 4. Coordenadas + links de transporte

### Coordenadas

```json
{
  "latitude": -3.1190275,
  "longitude": -60.0217314
}
```

### `transportLinks` (gerado automaticamente)

Quando `latitude` e `longitude` estão preenchidos, a API retorna links prontos para uso:

```json
{
  "transportLinks": {
    "googleMaps": "https://maps.google.com/?q=...",
    "waze": "https://waze.com/ul?ll=-3.119,-60.021&navigate=yes",
    "uber": "https://m.uber.com/ul/?action=setPickup&...",
    "taxi99": "https://99app.com/corrida?dest_lat=-3.119&dest_lng=-60.021&..."
  }
}
```

> **Nota:** se `latitude` / `longitude` não estiverem cadastrados, `transportLinks` será `{}` (objeto vazio). O campo `googleMaps` existe mesmo sem coordenadas, desde que `googleMapsUrl` esteja preenchido.

**Uso sugerido:**
```tsx
// Botões de transporte
{fair.transportLinks.googleMaps && (
  <a href={fair.transportLinks.googleMaps} target="_blank">Google Maps</a>
)}
{fair.transportLinks.waze && (
  <a href={fair.transportLinks.waze} target="_blank">Waze</a>
)}
{fair.transportLinks.uber && (
  <a href={fair.transportLinks.uber} target="_blank">Uber</a>
)}
{fair.transportLinks.taxi99 && (
  <a href={fair.transportLinks.taxi99} target="_blank">99</a>
)}
```

> Os links também aparecem no **e-mail de confirmação** automaticamente quando a feira tem coordenadas cadastradas.

---

## 5. Programação por dia (`daySchedules`)

Permite cadastrar horários diferentes para cada dia da feira.

### Formato no retorno

```json
{
  "startTime": "09:00",
  "endTime": "18:00",
  "daySchedules": [
    {
      "id": "uuid",
      "date": "2026-08-10",
      "startTime": "13:00",
      "endTime": "21:00",
      "note": "Abertura oficial — credenciamento a partir das 12h"
    },
    {
      "id": "uuid",
      "date": "2026-08-11",
      "startTime": "09:00",
      "endTime": "18:00",
      "note": null
    }
  ]
}
```

**Lógica de exibição sugerida:**

```ts
function getScheduleForDay(fair, date) {
  const specific = fair.daySchedules.find(s => s.date === date);
  return specific ?? { startTime: fair.startTime, endTime: fair.endTime };
}
```

- Se `daySchedules` estiver vazio, usar `startTime` / `endTime` da raiz como horário padrão.
- Se houver entrada para o dia específico, ela sobrescreve o padrão.

### Cadastro / atualização

Para salvar a programação, inclua `daySchedules` no corpo do `POST /fairs` ou `PUT /fairs/:id`:

```json
{
  "daySchedules": [
    { "date": "2026-08-10", "startTime": "13:00", "endTime": "21:00", "note": "Abertura" },
    { "date": "2026-08-11", "startTime": "09:00", "endTime": "18:00" },
    { "date": "2026-08-12", "startTime": "09:00", "endTime": "17:00", "note": "Último dia" }
  ]
}
```

> **Atenção:** enviar `daySchedules` num `PUT` **substitui toda a programação** anterior. Para não alterar, omita o campo.

---

## 6. Novos campos informativos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `edition` | `string \| null` | Ex: `"1ª Edição"`, `"ExpoMultimix 2026"` |
| `description` | `string \| null` | Descrição curta para exibir no site/app |
| `bannerUrl` | `string \| null` | URL da imagem de capa da feira |
| `durationDays` | `number \| null` | Dias de duração, calculado de `startDate` a `endDate` |
| `expectedVisitors` | `number \| null` | Meta de visitantes |
| `expectedExhibitors` | `number \| null` | Número de expositores/marcas |

---

## 7. Filtros na listagem

**Endpoint:** `GET /fairs`

### Parâmetros de query

| Parâmetro | Tipo | Exemplo | Descrição |
|-----------|------|---------|-----------|
| `uf` | `string` | `?uf=AM` | Filtra pelo estado (2 letras, case-insensitive) |
| `status` | `string` | `?status=upcoming` | Filtra pelo status da feira |

Podem ser combinados:
```
GET /fairs?uf=AM&status=upcoming
GET /fairs?status=ongoing
GET /fairs?uf=PA
```

**Ordenação padrão:** `startDate ASC` (mais próximas primeiro), feiras sem data vão para o final, desempate por `createdAt DESC`.

---

## 8. Schema completo da resposta

```ts
interface FairResponse {
  // Identidade
  id: string;
  name: string;
  edition: string | null;
  description: string | null;
  bannerUrl: string | null;
  status: 'upcoming' | 'ongoing' | 'ended' | 'cancelled';
  isActive: boolean;
  createdAt: string; // ISO 8601

  // Local
  location: string;       // campo legado, mantido
  venueName: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;   // "AM", "PA" etc.
  zipCode: string | null;
  country: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;

  // Links de transporte (gerados automaticamente)
  transportLinks: {
    googleMaps?: string | null;
    waze?: string | null;
    uber?: string | null;
    taxi99?: string | null;
  };

  // Datas e horários
  startDate: string | null;   // "YYYY-MM-DD"
  endDate: string | null;     // "YYYY-MM-DD"
  startTime: string | null;   // "HH:mm" — horário padrão de abertura
  endTime: string | null;     // "HH:mm" — horário padrão de encerramento
  startDateTime: string | null; // legado
  endDateTime: string | null;   // legado
  durationDays: number | null;  // calculado

  // Programação por dia
  daySchedules: Array<{
    id: string;
    date: string;      // "YYYY-MM-DD"
    startTime: string; // "HH:mm"
    endTime: string;   // "HH:mm"
    note: string | null;
  }>;

  // Planejamento
  expectedVisitors: number | null;
  expectedExhibitors: number | null;

  // Stands (existente)
  totalStands: number;
  costPerSquareMeter: number;
  setupCostPerSquareMeter: number;
  expectedRevenue: number;
  expectedProfit: number;
  expectedProfitMargin: number;
  insights: string | null;
  standConfigurations: StandConfiguration[];

  // Financeiro (calculado — existente)
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
  profitMargin: number;
  totalRevenues: number;
  totalExpensesCount: number;
}
```

---

## 9. Exemplos de requisição

### Criar feira completa

```http
POST /fairs
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "ExpoMultimix Manaus 2026",
  "edition": "5ª Edição",
  "description": "A maior feira multissetorial do Norte do Brasil.",
  "bannerUrl": "https://example.com/banner.jpg",
  "status": "upcoming",

  "location": "Centro de Convenções Vasco Vasques — Manaus, AM",
  "venueName": "Centro de Convenções Vasco Vasques",
  "address": "Av. Djalma Batista",
  "number": "1350",
  "neighborhood": "Chapada",
  "city": "Manaus",
  "state": "AM",
  "zipCode": "69050-010",
  "googleMapsUrl": "https://maps.app.goo.gl/abc123",
  "latitude": -3.1190275,
  "longitude": -60.0217314,

  "startDate": "2026-08-10",
  "endDate": "2026-08-12",
  "startTime": "09:00",
  "endTime": "18:00",

  "daySchedules": [
    { "date": "2026-08-10", "startTime": "13:00", "endTime": "21:00", "note": "Abertura oficial" },
    { "date": "2026-08-11", "startTime": "09:00", "endTime": "18:00" },
    { "date": "2026-08-12", "startTime": "09:00", "endTime": "17:00", "note": "Último dia" }
  ],

  "expectedVisitors": 5000,
  "expectedExhibitors": 120
}
```

### Atualizar status da feira

```http
PUT /fairs/:id
Authorization: Bearer <token>

{
  "status": "ongoing"
}
```

### Atualizar coordenadas + Maps de uma feira existente

```http
PUT /fairs/:id
Authorization: Bearer <token>

{
  "latitude": -1.4558,
  "longitude": -48.4902,
  "venueName": "Hangar Centro de Convenções",
  "address": "Av. Dr. Freitas",
  "number": "s/n",
  "neighborhood": "Marco",
  "city": "Belém",
  "state": "PA",
  "googleMapsUrl": "https://maps.app.goo.gl/xyz456"
}
```

### Listar feiras do Amazonas ainda não realizadas

```http
GET /fairs?uf=AM&status=upcoming
Authorization: Bearer <token>
```

---

## 10. Compatibilidade retroativa

Nenhum campo existente foi removido. As mudanças são **aditivas**:

| Campo | Status |
|-------|--------|
| `location` | ✅ Mantido — texto livre legado |
| `startDateTime` / `endDateTime` | ✅ Mantidos — deprecated, mas ainda populados |
| `state` antigo (texto longo) | ⚠️ Migrado para 2 letras — atualizar os registros existentes |
| Todos os campos financeiros | ✅ Sem mudança |
| `standConfigurations` | ✅ Sem mudança |

> **Ação recomendada:** atualizar as feiras existentes no banco para preencher `state` (UF 2 letras), `latitude`, `longitude` e `daySchedules`. Isso habilita o filtro por UF e os links de transporte no e-mail.
