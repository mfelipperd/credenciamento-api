# 📊 Guia Completo — Módulo de Despesas

> **Versão:** pós-refatoração `isOverhead` (maio 2026)  
> **Stack:** NestJS 11 + TypeORM + MySQL · Deploy: Railway (auto-deploy via push no master)  
> **Base URL produção:** `https://credenciamento-api-production.up.railway.app`

---

## Sumário

1. [Modelo de dados](#1-modelo-de-dados)
2. [Endpoints — Despesas Diretas](#2-endpoints--despesas-diretas)
3. [Endpoints — Rateio (isOverhead)](#3-endpoints--rateio-isoverhead)
4. [Endpoints — Overhead Legado](#4-endpoints--overhead-legado)
5. [Estrutura completa da resposta GET /fairs/:fairId/expenses](#5-estrutura-completa-da-resposta-get-fairsfairidexpenses)
6. [Tipos TypeScript para o Frontend](#6-tipos-typescript-para-o-frontend)
7. [Guia de UX — Mobile First](#7-guia-de-ux--mobile-first)
8. [Componentes de Interface](#8-componentes-de-interface)
9. [Fluxos de Usuário](#9-fluxos-de-usuário)
10. [Regras de Negócio](#10-regras-de-negócio)
11. [Prompt completo para o desenvolvedor frontend](#11-prompt-completo-para-o-desenvolvedor-frontend)

---

## 1. Modelo de Dados

### Tabelas envolvidas

```
finance_expenses             ← despesas diretas de uma feira
  └─ expense_fair_allocations  ← rateio quando isOverhead=true

overhead_expenses            ← despesas globais (sistema legado)
  └─ overhead_expense_allocations

finance_accounts             ← contas bancárias
finance_categories           ← categorias globais (overhead)
categories                   ← categorias por feira (despesas diretas)
```

### `finance_expenses`

| Coluna       | Tipo          | Descrição |
|-------------|---------------|-----------|
| `id`        | UUID          | PK |
| `fairId`    | UUID          | Feira dona da despesa |
| `categoryId`| UUID          | FK → `categories` (por feira) |
| `accountId` | UUID          | FK → `finance_accounts` |
| `descricao` | VARCHAR(500)  | Texto livre |
| `valor`     | DECIMAL(10,2) | Valor total da despesa |
| `data`      | DATE          | Data do lançamento |
| `observacoes`| TEXT         | Campo livre |
| `isOverhead`| BOOLEAN       | `false` = despesa direta · `true` = custo compartilhado |
| `createdAt` | DATETIME      | Auto |
| `updatedAt` | DATETIME      | Auto |

### `expense_fair_allocations`

Criada automaticamente quando `isOverhead = true`. Soma de `percentual` de todos os registros de um mesmo `expenseId` deve ser **exatamente 1.0**.

| Coluna      | Tipo          | Descrição |
|------------|---------------|-----------|
| `id`       | UUID          | PK |
| `expenseId`| UUID          | FK → `finance_expenses` (CASCADE delete) |
| `fairId`   | UUID          | FK → fairs |
| `percentual`| DECIMAL(5,4) | Fração `0.0001–1.0000` (ex: `0.5` = 50%) |
| `createdAt`| DATETIME      | Auto |

**Unique:** `(expenseId, fairId)`

### `overhead_expenses` (legado)

Tabela separada para custos globais que existiam antes da refatoração. Mantida em paralelo.

| Coluna       | Tipo          | Descrição |
|-------------|---------------|-----------|
| `id`        | UUID          | PK |
| `categoryId`| UUID          | FK → `finance_categories` (global: true) |
| `accountId` | UUID (nullable)| FK → `finance_accounts` |
| `descricao` | VARCHAR(500)  | |
| `valor`     | DECIMAL(10,2) | |
| `data`      | DATE          | |
| `observacoes`| TEXT         | |

### `overhead_expense_allocations`

| Coluna               | Tipo         | Descrição |
|---------------------|--------------|-----------|
| `overheadExpenseId` | UUID         | FK → `overhead_expenses` (CASCADE) |
| `fairId`            | UUID         | |
| `percentual`        | DECIMAL(5,4) | |

---

## 2. Endpoints — Despesas Diretas

### `POST /fairs/:fairId/expenses`
Cria uma despesa direta vinculada à feira. Sempre `isOverhead = false` na criação.

**Body:**
```json
{
  "categoryId": "uuid-da-categoria-desta-feira",
  "accountId":  "uuid-da-conta-bancaria",
  "descricao":  "ALUGUEL GERADOR",
  "valor":      3500.00,
  "data":       "2025-09-10",
  "observacoes": "NF 1234"
}
```

**Resposta 201:**
```json
{
  "id":         "uuid",
  "fairId":     "uuid",
  "categoryId": "uuid",
  "accountId":  "uuid",
  "descricao":  "ALUGUEL GERADOR",
  "valor":      3500,
  "data":       "2025-09-10",
  "isOverhead": false,
  "createdAt":  "2026-05-27T...",
  "updatedAt":  "2026-05-27T..."
}
```

**Erros comuns:**
- `400` — `categoryId` não pertence a esta feira, `accountId` inválido, `valor <= 0`
- `400` — `categoryId` ou `accountId` obrigatórios

---

### `GET /fairs/:fairId/expenses`
> Endpoint principal de listagem. Retorna as 3 fontes de custo + sumário.

Ver [seção 5](#5-estrutura-completa-da-resposta-get-fairsfairidexpenses) para o shape completo.

---

### `GET /expenses/:id`
Retorna uma despesa por ID com todas as relações.

**Resposta:**
```json
{
  "id": "uuid",
  "fairId": "uuid",
  "categoryId": "uuid",
  "accountId": "uuid",
  "descricao": "...",
  "valor": 1234,
  "data": "2025-09-10",
  "isOverhead": true,
  "category": { "id": "uuid", "name": "TARIFAS BANCARIAS", ... },
  "account":   { "id": "uuid", "nomeConta": "...", "banco": "...", "tipo": "corrente" },
  "fair":      { "id": "uuid", "name": "Expo MultiMix 2025 Belém", ... },
  "fairAllocations": [
    { "id": "uuid", "fairId": "uuid", "percentual": 0.5, "fair": { "name": "..." } },
    { "id": "uuid", "fairId": "uuid", "percentual": 0.5, "fair": { "name": "..." } }
  ]
}
```

---

### `PATCH /expenses/:id`
Atualiza campos da despesa. Enviar apenas os campos que mudaram.

**Body (todos opcionais):**
```json
{
  "descricao":   "novo texto",
  "valor":       999.99,
  "data":        "2025-10-01",
  "categoryId":  "uuid",
  "accountId":   "uuid",
  "observacoes": "nota"
}
```

> ⚠️ `PATCH` **não** altera o rateio. Para mudar rateio use `POST /expenses/:id/set-overhead`.

---

### `DELETE /expenses/:id`
Remove a despesa e todas as suas alocações (CASCADE).

**Resposta 200:** `{ "message": "Despesa removida com sucesso" }`

---

### `GET /fairs/:fairId/expenses/total`
Retorna os totais consolidados da feira.

**Resposta:**
```json
{
  "totalDireto":  213391.47,
  "totalRateado":  23547.50,
  "totalGeral":  236938.97
}
```

- `totalDireto` — soma de `finance_expenses` com `isOverhead=false`
- `totalRateado` — soma de `overhead_expenses` (legado) + `expense_fair_allocations` (novo)
- `totalGeral` — totalDireto + totalRateado

---

### `GET /fairs/:fairId/expenses/total-by-category`
**Resposta:** `[ { "categoryId": "uuid", "total": "3500.00" }, ... ]`

---

### `GET /fairs/:fairId/expenses/total-by-account`
**Resposta:** `[ { "accountId": "uuid", "total": "3500.00" }, ... ]`

---

## 3. Endpoints — Rateio (isOverhead)

Estes endpoints operam sobre despesas diretas existentes em `finance_expenses`, marcando-as como custo compartilhado entre feiras.

### `POST /expenses/:id/set-overhead`
Marca uma despesa como overhead e define o rateio entre feiras.  
Pode ser chamado várias vezes — cada chamada **substitui** o rateio anterior.

**Body:**
```json
{
  "fairs": [
    { "fairId": "uuid-belem-2025",  "percentual": 0.5 },
    { "fairId": "uuid-manaus-2025", "percentual": 0.5 }
  ]
}
```

**Regras de percentual:**
- Se **nenhum** item tiver `percentual` → divisão igualitária automática
- Se **qualquer** item tiver `percentual` → **todos** devem ter e a soma deve ser exatamente `1.0` (tolerância `0.001`)
- `percentual` aceita até 4 casas decimais, mínimo `0.0001`, máximo `1.0`

**Resposta 201:** Objeto `Expense` completo com `isOverhead: true` e `fairAllocations` preenchido.

```json
{
  "id": "uuid",
  "isOverhead": true,
  "valor": 2354,
  "fairAllocations": [
    { "fairId": "uuid-belem",  "percentual": 0.5, "fair": { "name": "Expo MultiMix 2025 Belém" } },
    { "fairId": "uuid-manaus", "percentual": 0.5, "fair": { "name": "Expo MultiMix 2025 Manaus" } }
  ]
}
```

---

### `DELETE /expenses/:id/set-overhead`
Remove o flag de overhead — a despesa volta a aparecer como despesa direta (`directExpenses`).  
Remove também todas as alocações.

**Resposta 200:** Objeto `Expense` com `isOverhead: false` e `fairAllocations: []`.

---

## 4. Endpoints — Overhead Legado

Sistema anterior, mantido para compatibilidade. Usa tabela própria (`overhead_expenses`).

### `GET /overhead-expenses/categories`
Lista categorias globais disponíveis para uso no overhead legado.

**Resposta:** `[ { "id": "uuid", "nome": "TARIFAS BANCARIAS", "global": true, ... } ]`

---

### `POST /overhead-expenses`
Cria uma despesa overhead no sistema legado.

**Body:**
```json
{
  "categoryId":  "uuid-finance-category-global",
  "accountId":   "uuid-opcional",
  "descricao":   "SEGURO MULTIRISCOS",
  "valor":       5000.00,
  "data":        "2025-09-10",
  "fairs": [
    { "fairId": "uuid-belem-2025",  "percentual": 0.6 },
    { "fairId": "uuid-manaus-2025", "percentual": 0.4 }
  ]
}
```

> **Diferença do `isOverhead` novo:** o overhead legado tem sua **própria tabela** e usa `finance_categories` (globais). O `isOverhead` novo mantém a despesa na tabela `finance_expenses` e usa `categories` (por feira).

---

### `GET /overhead-expenses`
Lista todos os overheads (globais, não filtrado por feira).

---

### `GET /overhead-expenses/:id`
Retorna um overhead por ID com alocações.

---

### `PATCH /overhead-expenses/:id`
Atualiza overhead. Se `fairs` for enviado, substitui as alocações.

---

### `DELETE /overhead-expenses/:id`
Remove overhead e alocações (CASCADE).

---

### `POST /expenses/:id/convert-to-overhead` *(legado)*
Converte uma despesa direta para o sistema legado (`overhead_expenses`).  
Remove a despesa original e cria um registro em `overhead_expenses`.

**Body:**
```json
{
  "financeCategoryId": "uuid-opcional",
  "fairs": [
    { "fairId": "uuid-belem",  "percentual": 0.5 },
    { "fairId": "uuid-manaus", "percentual": 0.5 }
  ]
}
```

> ⚠️ Prefira o `POST /expenses/:id/set-overhead` que **não remove** a despesa original.

---

## 5. Estrutura completa da resposta `GET /fairs/:fairId/expenses`

```typescript
{
  directExpenses: DirectExpense[];     // isOverhead = false
  allocatedOverhead: AllocatedLegacy[]; // tabela overhead_expenses
  allocatedDirect: AllocatedDirect[];   // finance_expenses com isOverhead = true
  summary: {
    totalDireto:  number;  // soma de directExpenses.valor
    totalRateado: number;  // soma de allocatedOverhead.valorAlocado + allocatedDirect.valorAlocado
    totalGeral:   number;  // totalDireto + totalRateado
  };
}
```

### `DirectExpense` (isOverhead = false)

```typescript
{
  id:         string;
  fairId:     string;
  categoryId: string;
  accountId:  string;
  descricao:  string | null;
  valor:      number;
  data:       string;          // "YYYY-MM-DD"
  isOverhead: false;
  observacoes: string | null;
  createdAt:  string;
  updatedAt:  string;
  category: {
    id:   string;
    name: string;              // ex: "LOCAÇÃO"
    // + outros campos de categories
  } | null;
  account: {
    id:        string;
    nomeConta: string;
    banco:     string;
    tipo:      "corrente" | "poupanca" | "outro";
  } | null;
  fair: { id: string; name: string; } | null;
  fairAllocations: [];         // sempre vazio quando isOverhead=false
}
```

### `AllocatedDirect` (isOverhead = true — sistema novo)

```typescript
{
  id:                  string;
  category: {
    id:   string;
    name: string;              // campo "name" (tabela categories)
  } | null;
  descricao:           string | null;
  data:                string;
  valorTotal:          number;   // valor original da despesa
  percentualDesteFair: number;   // ex: 0.5 (50%)
  valorAlocado:        number;   // valorTotal * percentualDesteFair
  account: {
    id:        string;
    nomeConta: string;
    banco:     string;
  } | null;
  feirasRateadas: Array<{
    fairId:    string;
    fairName:  string;
    percentual: number;
  }>;
  source: "direct_overhead";     // discriminador de tipo
}
```

### `AllocatedLegacy` (sistema legado overhead_expenses)

```typescript
{
  id:                  string;
  category: {
    id:   string;
    nome: string;              // ⚠️ campo "nome" (tabela finance_categories, não "name")
  } | null;
  descricao:           string | null;
  data:                string;
  valorTotal:          number;
  percentualDesteFair: number;
  valorAlocado:        number;
  account: {
    id:        string;
    nomeConta: string;
    banco:     string;
  } | null;
  feirasRateadas: Array<{
    fairId:    string;
    fairName:  string;
    percentual: number;
  }>;
  // Sem campo "source"
}
```

> ⚠️ **Atenção:** `AllocatedDirect.category.name` vs `AllocatedLegacy.category.nome` — a diferença vem das tabelas distintas (`categories` usa `name`, `finance_categories` usa `nome`).

---

## 6. Tipos TypeScript para o Frontend

```typescript
// ─── Contas ──────────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  nomeConta: string;
  banco: string;
  tipo: 'corrente' | 'poupanca' | 'outro';
}

// ─── Categorias (por feira) ───────────────────────────────────────────────────

export interface FairCategory {
  id: string;
  name: string;
  fairId: string;
}

// ─── Despesa direta ───────────────────────────────────────────────────────────

export interface DirectExpense {
  id: string;
  fairId: string;
  categoryId: string;
  accountId: string;
  descricao: string | null;
  valor: number;
  data: string;
  isOverhead: boolean;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
  category: FairCategory | null;
  account: Account | null;
  fair: { id: string; name: string } | null;
  fairAllocations: FairAllocation[];
}

export interface FairAllocation {
  id: string;
  fairId: string;
  percentual: number;
  fair: { id: string; name: string };
}

// ─── Overhead direto (isOverhead=true) ───────────────────────────────────────

export interface AllocatedDirect {
  id: string;
  category: { id: string; name: string } | null;   // "name"
  descricao: string | null;
  data: string;
  valorTotal: number;
  percentualDesteFair: number;
  valorAlocado: number;
  account: { id: string; nomeConta: string; banco: string } | null;
  feirasRateadas: Array<{ fairId: string; fairName: string; percentual: number }>;
  source: 'direct_overhead';
}

// ─── Overhead legado ──────────────────────────────────────────────────────────

export interface AllocatedLegacy {
  id: string;
  category: { id: string; nome: string } | null;   // "nome"
  descricao: string | null;
  data: string;
  valorTotal: number;
  percentualDesteFair: number;
  valorAlocado: number;
  account: { id: string; nomeConta: string; banco: string } | null;
  feirasRateadas: Array<{ fairId: string; fairName: string; percentual: number }>;
}

// ─── Resposta principal ───────────────────────────────────────────────────────

export interface FairExpensesResponse {
  directExpenses: DirectExpense[];
  allocatedOverhead: AllocatedLegacy[];
  allocatedDirect: AllocatedDirect[];
  summary: {
    totalDireto: number;
    totalRateado: number;
    totalGeral: number;
  };
}

export interface FairExpensesTotal {
  totalDireto: number;
  totalRateado: number;
  totalGeral: number;
}

// ─── DTOs de criação ──────────────────────────────────────────────────────────

export interface CreateExpenseDto {
  categoryId: string;
  accountId: string;
  descricao?: string;
  valor: number;
  data: string;         // "YYYY-MM-DD"
  observacoes?: string;
}

export interface SetOverheadDto {
  fairs: Array<{
    fairId: string;
    percentual?: number;   // omitir em todos para divisão igualitária
  }>;
}
```

---

## 7. Guia de UX — Mobile First

### Princípios gerais

- **Mobile first:** toda tela deve ser utilizável em 375px (iPhone SE) antes de escalar para tablet/desktop
- **Touch targets:** mínimo 44×44px para botões e ações
- **Sticky header com totais:** o card de resumo financeiro fica fixo no topo ao rolar a lista
- **Skeleton loading:** usar placeholders animados enquanto carrega (nunca spinner centralizado)
- **Pull-to-refresh:** na listagem de despesas
- **Ações destrutivas:** sempre pedir confirmação com bottom sheet (não `confirm()` nativo)
- **Feedback visual imediato:** otimistic UI ao criar/editar, reverter em caso de erro

### Hierarquia visual de informação

```
1. Summary Card (totais — sempre visível)
2. Abas: Diretas | Rateadas | Tudo
3. Lista agrupada por categoria
4. Item individual expansível
5. Ações contextuais (editar, ratear, remover)
```

---

## 8. Componentes de Interface

### 8.1 `<ExpenseSummaryCard>` — Topo da tela

Exibe os 3 totais sempre visíveis. Sticky no scroll.

```
┌─────────────────────────────────────────┐
│  💰 TOTAL GERAL         R$ 236.938,97  │
│  ─────────────────────────────────────  │
│  Diretas    R$ 213.391,47              │
│  Rateadas   R$  23.547,50             │
└─────────────────────────────────────────┘
```

**Props:**
```typescript
interface ExpenseSummaryCardProps {
  totalDireto: number;
  totalRateado: number;
  totalGeral: number;
  loading?: boolean;
}
```

**Comportamento:**
- Valores formatados como `R$ 1.234,56` (pt-BR)
- Toque em "Rateadas" → abre modal com detalhamento do rateio
- Loading state: 3 linhas skeleton de largura variada

---

### 8.2 `<ExpenseTabBar>` — Filtro de listagem

```
┌──────────────────────────────────────────┐
│ [Diretas (22)] [Rateadas (15)] [Todas]   │
└──────────────────────────────────────────┘
```

- `Diretas` → mostra apenas `directExpenses`
- `Rateadas` → mostra `allocatedOverhead` + `allocatedDirect` mesclados
- `Todas` → tudo junto ordenado por data

---

### 8.3 `<ExpenseList>` — Lista principal

Agrupada por categoria, com header colapsável.

```
▼ TARIFAS BANCARIAS                R$ 2.373,00
  ├─ TARIFAS BANCARIAS   R$ 2.354  10/09/2025  🔀
  └─ TARIFA BANCARIA     R$    19  10/09/2025  🔀

▼ SEGURO                           R$   379,00
  └─ SEGURO FEIRA BELEM  R$   758  10/09/2025  🔀
```

- Ícone 🔀 indica despesa rateada (`isOverhead=true`)
- Valor exibido no item = `valorAlocado` (já ajustado pelo percentual desta feira)
- Swipe left → ações: Editar | Ratear | Remover

---

### 8.4 `<ExpenseListItem>` — Item da lista

**Variante: Despesa Direta**
```
┌────────────────────────────────────────────┐
│ [ícone categoria]  ALUGUEL GERADOR         │
│                    Caixa Econômica         │
│ 10/09/2025                    R$ 3.500,00  │
└────────────────────────────────────────────┘
```

**Variante: Despesa Rateada**
```
┌────────────────────────────────────────────┐
│ [🔀]  TARIFAS BANCARIAS                   │
│       Bradesco · 50% desta feira           │
│ 10/09/2025  Total: R$ 2.354    Você: R$ 1.177 │
└────────────────────────────────────────────┘
```

**Props:**
```typescript
interface ExpenseListItemProps {
  type: 'direct' | 'allocated-direct' | 'allocated-legacy';
  id: string;
  descricao: string | null;
  categoryName: string;
  accountName: string;
  data: string;
  valor: number;              // se direct: valor cheio; se rateado: valorAlocado
  valorTotal?: number;        // só quando rateado
  percentual?: number;        // só quando rateado
  isOverhead: boolean;
  onEdit: (id: string) => void;
  onSetOverhead: (id: string) => void;
  onDelete: (id: string) => void;
}
```

---

### 8.5 `<ExpenseFormModal>` — Criar / Editar despesa

Bottom sheet em mobile, modal centralizado em desktop.

**Campos:**
```
Valor *           [R$] [__________]
Categoria *       [Dropdown por feira]
Data *            [Date Picker]
Conta bancária *  [Dropdown]
Descrição         [Input texto]
Observações       [Textarea]
```

**Comportamento:**
- Valor: máscara monetária (`, ` como separador decimal)
- Categoria: carregada de `GET /categories/fair/:fairId`
- Conta: carregada de `GET /finance/accounts`
- Data: default = hoje
- Submit: `POST /fairs/:fairId/expenses`
- Edit: preenche campos e usa `PATCH /expenses/:id`

---

### 8.6 `<SetOverheadModal>` — Configurar rateio

Exibido quando usuário marca uma despesa como "custo compartilhado".

```
┌─────────────────────────────────────────────┐
│  🔀 Configurar Rateio                       │
│  ─────────────────────────────────────────  │
│  TARIFAS BANCARIAS · R$ 2.354,00           │
│                                             │
│  Feiras participantes:                      │
│  ┌────────────────────────────────────────┐ │
│  │ ✓ Expo MultiMix 2025 Belém    [50%]   │ │
│  │ ✓ Expo MultiMix 2025 Manaus   [50%]   │ │
│  │ + Adicionar feira                      │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  Divisão automática ◉  Manual ○            │
│                                             │
│  Soma: 100% ✓                              │
│                                             │
│  [Cancelar]          [Salvar Rateio]        │
└─────────────────────────────────────────────┘
```

**Comportamento:**
- Divisão automática: omite `percentual` no body → backend divide igualmente
- Manual: campos numéricos por feira, validação em tempo real de soma = 100%
- Visualização ao vivo: "Belém receberá R$ 1.177,00"
- Submit: `POST /expenses/:id/set-overhead`
- Remover rateio: `DELETE /expenses/:id/set-overhead`

---

### 8.7 `<AllocatedExpenseDetail>` — Detalhe de item rateado

Expandido ao tocar em item com `🔀`.

```
┌─────────────────────────────────────────────┐
│  🔀 TARIFAS BANCARIAS                       │
│  Valor total da despesa: R$ 2.354,00        │
│                                             │
│  Rateio entre feiras:                       │
│  • Expo MultiMix 2025 Belém   50% → R$ 1.177│
│  • Expo MultiMix 2025 Manaus  50% → R$ 1.177│
│                                             │
│  Conta: Bradesco · Conta Corrente           │
│  Data: 10/09/2025                           │
│                                             │
│  [Editar Rateio]  [Desfazer Rateio]         │
└─────────────────────────────────────────────┘
```

---

### 8.8 `<ExpenseTotalsChart>` — Gráfico de categorias

Gráfico de pizza ou barras horizontais com os dados de `GET /fairs/:fairId/expenses/total-by-category`.

**Layout mobile:**
```
Por Categoria                    Por Conta
┌──────────────┐               ┌──────────────┐
│  ◕ LOCAÇÃO   │               │  ◕ Bradesco  │
│    42%       │               │    67%       │
│  ◑ SEGURO    │               │  ◑ Caixa    │
│    18%       │               │    33%       │
└──────────────┘               └──────────────┘
```

---

### 8.9 `<ExpenseBalanceSection>` — Balanço Receitas vs Despesas

Combina dados do módulo de receitas com despesas.

```
┌─────────────────────────────────────────────┐
│  BALANÇO DA FEIRA                           │
│  ─────────────────────────────────────────  │
│  Receitas      R$ 450.000,00  ↑            │
│  Despesas      R$ 236.938,97  ↓            │
│  ─────────────────────────────────────────  │
│  RESULTADO     R$ 213.061,03  ✓ LUCRO      │
│                                             │
│  [Ver detalhes das receitas]               │
└─────────────────────────────────────────────┘
```

---

## 9. Fluxos de Usuário

### Fluxo 1: Lançar nova despesa

```
Tela de despesas
  └─ [+] Adicionar despesa
       └─ <ExpenseFormModal> abre
            ├─ Preencher valor, categoria, data, conta
            └─ [Salvar]
                 ├─ POST /fairs/:fairId/expenses
                 ├─ Sucesso → toast "Despesa adicionada" + lista atualiza
                 └─ Erro → toast com mensagem do backend
```

### Fluxo 2: Ratear uma despesa entre feiras

```
<ExpenseListItem> (swipe left ou menu ⋮)
  └─ [Ratear entre feiras]
       └─ <SetOverheadModal> abre com dados da despesa
            ├─ Selecionar feiras (mínimo 1)
            ├─ Escolher divisão automática ou manual
            └─ [Salvar Rateio]
                 ├─ POST /expenses/:id/set-overhead
                 ├─ Sucesso → item some de "Diretas", aparece em "Rateadas"
                 └─ Erro → validação de percentuais (soma ≠ 100%)
```

### Fluxo 3: Editar rateio existente

```
<ExpenseListItem> (item com 🔀)
  └─ Expandir → <AllocatedExpenseDetail>
       └─ [Editar Rateio]
            └─ <SetOverheadModal> abre com valores pré-preenchidos
                 └─ POST /expenses/:id/set-overhead (substitui alocações)
```

### Fluxo 4: Desfazer rateio

```
<AllocatedExpenseDetail>
  └─ [Desfazer Rateio]
       └─ Bottom sheet confirmação:
          "Remover rateio? A despesa voltará para Diretas."
          [Cancelar] [Confirmar]
               └─ DELETE /expenses/:id/set-overhead
                    └─ Item volta para aba "Diretas"
```

### Fluxo 5: Remover despesa

```
Swipe left → [Remover]
  └─ Bottom sheet confirmação (sempre!)
       └─ DELETE /expenses/:id
            └─ Animação de saída + totais recalculados
```

---

## 10. Regras de Negócio

### Sobre `isOverhead`

| Estado | `isOverhead` | Aparece em | Valor mostrado |
|--------|-------------|------------|----------------|
| Despesa direta | `false` | `directExpenses` | `valor` cheio |
| Rateada (novo) | `true` | `allocatedDirect` | `valorAlocado` (parcial) |
| Overhead legado | — (tabela separada) | `allocatedOverhead` | `valorAlocado` (parcial) |

### Sobre percentuais

- **Decimais:** `0.5` = 50%, `0.3333` = 33,33%, `0.25` = 25%
- **Soma obrigatória:** todos os percentuais de um mesmo `expenseId` devem somar `1.0` (tolerância `0.001`)
- **Divisão automática:** omitir `percentual` em todos os itens do array `fairs`
- **Parcial não permitido:** se qualquer item tiver `percentual`, todos devem ter

### Sobre categorias

- `directExpenses` usam categorias da tabela `categories` (por feira) → campo `name`
- `allocatedOverhead` (legado) usa `finance_categories` (globais) → campo `nome`
- `allocatedDirect` usa `categories` da feira original da despesa → campo `name`

### Sobre o `totalRateado`

O `totalRateado` no `summary` é calculado somando:
- `allocatedOverhead[].valorAlocado` (legado)
- `allocatedDirect[].valorAlocado` (novo)

Isso significa que se a mesma despesa de R$2.354 for rateada 50%/50%, cada feira verá `valorAlocado = R$1.177` — o total global da despesa **não** é duplicado.

---

## 11. Prompt Completo para o Desenvolvedor Frontend

> Use este prompt ao iniciar o desenvolvimento do módulo de despesas com qualquer IA assistente.

---

```
Vou te passar toda a especificação do backend de Despesas de um sistema de gestão de feiras (Expo MultiMix). Você deve implementar o frontend completo em [sua stack: React Native / Next.js / etc], seguindo mobile-first, com os componentes e fluxos descritos.

## BASE URL
https://credenciamento-api-production.up.railway.app

## AUTENTICAÇÃO
JWT Bearer. Login: POST /auth/login → { email, password } → { access_token }
Enviar header: Authorization: Bearer <token>

## MODELO DE DADOS

### Três fontes de custo por feira:

1. **directExpenses** — despesas 100% desta feira (isOverhead = false)
2. **allocatedDirect** — despesas marcadas como rateadas (isOverhead = true) com alocação para esta feira
3. **allocatedOverhead** — sistema legado de overheads globais (tabela separada)

### Campos distintos por fonte:
- directExpenses: category.name (string "name")
- allocatedDirect: category.name (string "name"), source = "direct_overhead"
- allocatedOverhead: category.nome (string "nome" — diferente!)

## ENDPOINTS NECESSÁRIOS

### Listagem principal
GET /fairs/:fairId/expenses
Retorna:
{
  directExpenses: DirectExpense[],
  allocatedOverhead: AllocatedLegacy[],
  allocatedDirect: AllocatedDirect[],
  summary: { totalDireto: number, totalRateado: number, totalGeral: number }
}

### Totais rápidos (para cards de dashboard)
GET /fairs/:fairId/expenses/total
Retorna: { totalDireto, totalRateado, totalGeral }

### Totais por categoria (para gráficos)
GET /fairs/:fairId/expenses/total-by-category
Retorna: [{ categoryId: string, total: string }]

### Criar despesa
POST /fairs/:fairId/expenses
Body: { categoryId, accountId, descricao?, valor, data: "YYYY-MM-DD", observacoes? }

### Editar despesa
PATCH /expenses/:id
Body (parcial): { descricao?, valor?, data?, categoryId?, accountId?, observacoes? }

### Remover despesa
DELETE /expenses/:id → { message }

### Marcar como rateada (pode chamar múltiplas vezes — substitui rateio anterior)
POST /expenses/:id/set-overhead
Body: {
  "fairs": [
    { "fairId": "uuid", "percentual": 0.5 },  // percentual opcional
    { "fairId": "uuid", "percentual": 0.5 }
  ]
}
Regras de percentual:
- Omitir em TODOS → backend divide igualmente
- Se um tem, todos devem ter, soma deve ser 1.0
- Formato decimal: 0.5 = 50%, 0.3333 = 33,33%

### Remover rateio (volta para directExpenses)
DELETE /expenses/:id/set-overhead

### Dados de apoio
GET /categories/fair/:fairId → categorias desta feira (para dropdown na criação)
GET /finance/accounts → contas bancárias (para dropdown na criação)
GET /fairs → lista de feiras (para seletor no rateio)

## TIPOS TYPESCRIPT

interface DirectExpense {
  id: string;
  fairId: string;
  categoryId: string;
  accountId: string;
  descricao: string | null;
  valor: number;
  data: string;
  isOverhead: boolean;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string } | null;
  account: { id: string; nomeConta: string; banco: string; tipo: string } | null;
  fair: { id: string; name: string } | null;
  fairAllocations: Array<{
    id: string;
    fairId: string;
    percentual: number;
    fair: { id: string; name: string };
  }>;
}

interface AllocatedDirect {
  id: string;
  category: { id: string; name: string } | null;   // "name"
  descricao: string | null;
  data: string;
  valorTotal: number;
  percentualDesteFair: number;
  valorAlocado: number;
  account: { id: string; nomeConta: string; banco: string } | null;
  feirasRateadas: Array<{ fairId: string; fairName: string; percentual: number }>;
  source: 'direct_overhead';
}

interface AllocatedLegacy {
  id: string;
  category: { id: string; nome: string } | null;   // "nome" — atenção!
  descricao: string | null;
  data: string;
  valorTotal: number;
  percentualDesteFair: number;
  valorAlocado: number;
  account: { id: string; nomeConta: string; banco: string } | null;
  feirasRateadas: Array<{ fairId: string; fairName: string; percentual: number }>;
}

interface FairExpensesResponse {
  directExpenses: DirectExpense[];
  allocatedOverhead: AllocatedLegacy[];
  allocatedDirect: AllocatedDirect[];
  summary: { totalDireto: number; totalRateado: number; totalGeral: number };
}

## COMPONENTES A IMPLEMENTAR (mobile-first, 375px base)

### 1. ExpenseSummaryCard (sticky no topo)
- Mostra: totalGeral em destaque, totalDireto e totalRateado menores abaixo
- Formato: R$ 1.234,56 (pt-BR)
- Loading: skeleton de 3 linhas
- Touch em "Rateadas" → detalha breakdown

### 2. ExpenseTabBar
- 3 abas: "Diretas (N)" | "Rateadas (N)" | "Todas"
- N = quantidade de itens em cada grupo
- Rateadas = allocatedDirect.length + allocatedOverhead.length

### 3. ExpenseList
- Agrupada por categoria (group by category.name ou category.nome)
- Header colapsável de cada grupo com subtotal
- Ordenação: alfabética por categoria, depois por data DESC

### 4. ExpenseListItem
- Variante direct: descricao, categoryName, accountName, data, valor
- Variante rateada: ícone 🔀, descricao, "X% desta feira", valor = valorAlocado
- Swipe left (mobile) ou menu ⋮ (desktop): Editar | Ratear | Remover
- Touch para expandir detalhes

### 5. ExpenseFormModal (bottom sheet mobile / modal desktop)
- Campos: valor (obrigatório), categoria (obrigatório), data (obrigatório), conta (obrigatório), descrição, observações
- Valor: máscara R$ com vírgula decimal
- Categoria: lista da GET /categories/fair/:fairId
- Conta: lista da GET /finance/accounts
- Data: date picker, default = hoje

### 6. SetOverheadModal (bottom sheet mobile / modal desktop)
- Mostra a despesa que será rateada (nome + valor total)
- Lista de feiras selecionáveis (GET /fairs)
- Modo automático (sem percentuais) ou manual (inputs por feira)
- Validação em tempo real: soma dos percentuais deve ser 100%
- Preview: "Belém receberá R$ 1.177,00"
- Botão "Salvar": POST /expenses/:id/set-overhead

### 7. AllocatedExpenseDetail (expande ao tocar item rateado)
- Valor total da despesa original
- Lista de feiras com percentual e valor alocado
- Botões: [Editar Rateio] → abre SetOverheadModal | [Desfazer Rateio] → confirmação + DELETE

### 8. ConfirmationBottomSheet
- Para todas ações destrutivas (remover, desfazer rateio)
- Nunca usar confirm() nativo
- Mensagem clara + [Cancelar] + [Confirmar vermelho]

## LÓGICA DE DISPLAY

### Valor a exibir por tipo:
- directExpense → e.valor (valor cheio)
- allocatedDirect → e.valorAlocado (já calculado pelo backend)
- allocatedLegacy → e.valorAlocado (já calculado pelo backend)

### Nome da categoria por tipo:
- directExpense → e.category?.name
- allocatedDirect → e.category?.name
- allocatedLegacy → e.category?.nome  (campo diferente!)

### Identificar se item é rateado:
- directExpense.isOverhead === true → rateado (mostrar 🔀)
- Todos os itens de allocatedDirect → rateados
- Todos os itens de allocatedOverhead → rateados

### Summary card:
totalGeral = summary.totalGeral
totalDireto = summary.totalDireto
totalRateado = summary.totalRateado

### Merging para aba "Todas":
const allItems = [
  ...directExpenses.map(e => ({ ...e, _type: 'direct', valor: e.valor })),
  ...allocatedDirect.map(e => ({ ...e, _type: 'alloc-direct', valor: e.valorAlocado })),
  ...allocatedOverhead.map(e => ({ ...e, _type: 'alloc-legacy', valor: e.valorAlocado })),
].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

## ESTADOS DE UI

- Loading inicial: skeleton nos cards e lista
- Lista vazia: ilustração + "Nenhuma despesa lançada. Toque em + para adicionar."
- Erro de rede: banner de retry no topo
- Criando/editando: botão com spinner, campos desabilitados
- Otimistic UI: adicionar item na lista imediatamente, reverter em erro

## REGRAS DE NEGÓCIO PARA VALIDAÇÃO NO FRONT

1. Valor > 0 e com no máximo 2 casas decimais
2. Data obrigatória no formato YYYY-MM-DD
3. categoryId e accountId obrigatórios na criação
4. No rateio: se qualquer fair tem percentual, todos devem ter
5. No rateio: soma de percentuais deve ser 1.0 (100%) com tolerância de 0.001
6. No rateio: mínimo 1 feira
7. Remover item rateado: sempre confirmar antes

## FORMATAÇÃO

// Moeda
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
// → "R$ 1.234,56"

// Data
const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
// → "10/09/2025"

// Percentual
const formatPercent = (decimal: number) =>
  `${(decimal * 100).toFixed(0)}%`;
// → "50%"

## ORDEM DE IMPLEMENTAÇÃO SUGERIDA

1. Hook useFairExpenses(fairId) → GET + cache
2. ExpenseSummaryCard com dados do summary
3. ExpenseList com ExpenseListItem (apenas diretas primeiro)
4. ExpenseFormModal — criar
5. ExpenseFormModal — editar
6. Delete com ConfirmationBottomSheet
7. SetOverheadModal + hook useSetOverhead
8. AllocatedExpenseDetail com detalhes de rateio
9. Aba "Rateadas" mostrando allocatedDirect + allocatedOverhead
10. Aba "Todas" com merge
11. ExpenseTotalsChart por categoria
```

---

*Documentação gerada em 27/05/2026. Atualizar após cada refatoração do módulo de despesas.*
