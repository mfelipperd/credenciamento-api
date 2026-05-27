# Despesas Overhead (Custos Compartilhados entre Feiras)

## O que é?

Algumas despesas da empresa não pertencem exclusivamente a uma feira — são custos fixos do negócio que existem independentemente de qual feira está acontecendo:

- Aluguel do escritório
- Salários de funcionários fixos
- Internet, luz, telefone
- Contador / impostos
- Materiais administrativos

Esses gastos precisam ser **rateados** entre as feiras que estão financeiramente ativas no período (planejamento, execução ou pós-evento com pagamentos em andamento).

---

## Categorias de overhead

As categorias de despesas overhead são **globais** — cadastradas uma vez e reutilizadas em qualquer despesa, sem vínculo com feira específica.

São gerenciadas na tabela `finance_categories` (campo `global: true`), diferente das categorias diretas de despesas de feira (tabela `categories`, sempre vinculada a uma feira).

### Listar categorias disponíveis para overhead

```
GET /overhead-expenses/categories
```

**Response:**
```json
[
  { "id": "uuid-cat-1", "nome": "Aluguel",          "global": true, "description": "Aluguel do escritório" },
  { "id": "uuid-cat-2", "nome": "Pessoal",           "global": true, "description": "Salários e pró-labore" },
  { "id": "uuid-cat-3", "nome": "Infraestrutura",    "global": true, "description": "Internet, luz, água" },
  { "id": "uuid-cat-4", "nome": "Fiscal",            "global": true, "description": "Contador, impostos, taxas" },
  { "id": "uuid-cat-5", "nome": "Administrativo",    "global": true, "description": "Material de escritório, assinaturas" }
]
```

> **Para criar novas categorias globais:** use `POST /finance/categories` com `{ "nome": "...", "global": true }`.

---

## Como funciona o rateio

Ao lançar uma despesa overhead, o admin **seleciona quais feiras vão absorver aquele custo** e define os percentuais:

```
Despesa: Aluguel escritório (categoria: "Aluguel") — R$ 5.000

Feiras selecionadas:
  Belém 2026  → 50%  (R$ 2.500) ← ainda recebendo parcelas de contratos
  Manaus 2027 → 50%  (R$ 2.500) ← em fase de planejamento
```

Se nenhum percentual for informado, o sistema divide **igualmente** entre as feiras selecionadas.

---

## Endpoints

### `GET /overhead-expenses/categories`
Lista categorias globais disponíveis para uso no campo `categoryId`.

---

### `POST /overhead-expenses`
Lança uma nova despesa overhead e define quais feiras compartilham o custo.

**Body:**
```json
{
  "categoryId": "uuid-cat-1",
  "accountId": "uuid-da-conta-bancaria",
  "descricao": "Aluguel escritório - junho 2026",
  "valor": 5000.00,
  "data": "2026-06-05",
  "observacoes": "Recibo nº 123",
  "fairs": [
    { "fairId": "uuid-belem-2026", "percentual": 0.5 },
    { "fairId": "uuid-manaus-2027", "percentual": 0.5 }
  ]
}
```

> **Divisão igualitária automática:** se não informar `percentual` em nenhum item, o sistema divide 100% igualmente:
> ```json
> "fairs": [
>   { "fairId": "uuid-belem-2026" },
>   { "fairId": "uuid-manaus-2027" }
> ]
> ```
> Resultado: 50% para cada.

**Regras de validação:**
- `categoryId` deve ser um UUID válido de `finance_categories` com `global: true`
- `fairs` precisa ter ao menos 1 item
- Se qualquer item tiver `percentual`, **todos** devem ter `percentual`
- A soma dos percentuais deve ser exatamente **1.0** (100%)
- `valor` deve ser maior que 0

**Response `201 Created`:**
```json
{
  "id": "uuid-da-despesa",
  "categoryId": "uuid-cat-1",
  "accountId": "uuid-conta",
  "descricao": "Aluguel escritório - junho 2026",
  "valor": "5000.00",
  "data": "2026-06-05",
  "observacoes": "Recibo nº 123",
  "createdAt": "2026-06-05T...",
  "updatedAt": "2026-06-05T...",
  "category": {
    "id": "uuid-cat-1",
    "nome": "Aluguel",
    "global": true
  },
  "account": {
    "id": "uuid-conta",
    "nomeConta": "Conta Principal PJ",
    "banco": "Itaú",
    "tipo": "corrente"
  },
  "allocations": [
    {
      "id": "uuid-alloc-1",
      "overheadExpenseId": "uuid-da-despesa",
      "fairId": "uuid-belem-2026",
      "percentual": "0.5000",
      "fair": { "id": "uuid-belem-2026", "name": "ExpoMultimix Belém 2026" }
    },
    {
      "id": "uuid-alloc-2",
      "overheadExpenseId": "uuid-da-despesa",
      "fairId": "uuid-manaus-2027",
      "percentual": "0.5000",
      "fair": { "id": "uuid-manaus-2027", "name": "ExpoMultimix Manaus 2027" }
    }
  ]
}
```

---

### `GET /overhead-expenses`
Lista todas as despesas overhead com suas alocações. Response: array do mesmo formato do POST.

---

### `GET /overhead-expenses/:id`
Retorna uma despesa overhead pelo ID.

---

### `PATCH /overhead-expenses/:id`
Atualiza uma despesa overhead. Todos os campos são opcionais.

Se `fairs` for enviado, **substitui completamente** as alocações anteriores.

**Exemplo — atualiza só o valor e redistribui para 3 feiras:**
```json
{
  "valor": 6000.00,
  "fairs": [
    { "fairId": "uuid-belem-2026",     "percentual": 0.40 },
    { "fairId": "uuid-manaus-2027",    "percentual": 0.40 },
    { "fairId": "uuid-fortaleza-2027", "percentual": 0.20 }
  ]
}
```

---

### `DELETE /overhead-expenses/:id`
Remove a despesa e todas as suas alocações (CASCADE automático).

**Response `200 OK`:**
```json
{ "message": "Overhead expense removida com sucesso" }
```

---

## Mudança no endpoint de despesas por feira

### `GET /fairs/:fairId/expenses` — **response atualizado**

> ⚠️ **Breaking change:** o endpoint agora retorna um **objeto** em vez de um array simples.

**Antes:**
```json
[ { "id": "...", "descricao": "...", "valor": "..." }, ... ]
```

**Agora:**
```json
{
  "directExpenses": [
    {
      "id": "uuid",
      "fairId": "uuid-belem-2026",
      "descricao": "Aluguel pavilhão",
      "valor": "15000.00",
      "data": "2026-05-10",
      "category": { "id": "uuid", "name": "Estrutura", "isRequired": true },
      "account": { "id": "uuid", "nomeConta": "Conta Principal PJ", "banco": "Itaú", "tipo": "corrente" }
    }
  ],
  "allocatedOverhead": [
    {
      "id": "uuid-da-despesa-overhead",
      "category": { "id": "uuid-cat-1", "nome": "Aluguel" },
      "descricao": "Aluguel escritório - junho 2026",
      "data": "2026-06-05",
      "valorTotal": 5000.00,
      "percentualDesteFair": 0.5,
      "valorAlocado": 2500.00,
      "account": { "id": "uuid", "nomeConta": "Conta Principal PJ", "banco": "Itaú" },
      "feirasRateadas": [
        { "fairId": "uuid-belem-2026",  "fairName": "ExpoMultimix Belém 2026",  "percentual": 0.5 },
        { "fairId": "uuid-manaus-2027", "fairName": "ExpoMultimix Manaus 2027", "percentual": 0.5 }
      ]
    }
  ],
  "summary": {
    "totalDireto": 15000.00,
    "totalRateado": 2500.00,
    "totalGeral": 17500.00
  }
}
```

### `GET /fairs/:fairId/expenses/total` — **response atualizado**

> ⚠️ **Breaking change:** antes retornava um número simples. Agora retorna um objeto.

**Antes:**
```json
15000
```

**Agora:**
```json
{
  "totalDireto": 15000.00,
  "totalRateado": 2500.00,
  "totalGeral": 17500.00
}
```

---

## Diferença entre categorias diretas e categorias de overhead

| | Despesas Diretas | Despesas Overhead |
|---|---|---|
| **Tabela de categorias** | `categories` | `finance_categories` |
| **Escopo** | Por feira (cada feira tem as suas) | Global (compartilhada entre todas) |
| **Endpoint de listagem** | `GET /categories/fair/:fairId` | `GET /overhead-expenses/categories` |
| **Criação** | `POST /categories` com `fairId` | `POST /finance/categories` com `global: true` |
| **fairId obrigatório?** | Sim | Não |

---

## Fluxo completo de uso

```
1. Criar categorias globais (uma vez):
   POST /finance/categories
   { "nome": "Aluguel", "global": true, "description": "Aluguel escritório" }
   { "nome": "Pessoal", "global": true, "description": "Salários fixos" }

2. Buscar IDs das categorias:
   GET /overhead-expenses/categories

3. Lançar despesa overhead:
   POST /overhead-expenses
   { "categoryId": "uuid-aluguel", "valor": 5000, "data": "2026-06", "fairs": [...] }

4. Frontend consulta despesas da feira:
   GET /fairs/uuid-belem-2026/expenses
   → recebe directExpenses + allocatedOverhead + summary
```

---

## Sugestão de UX para o frontend

### Tela de listagem de despesas

```
┌─────────────────────────────────────────────────────────────────┐
│  DESPESAS — ExpoMultimix Belém 2026                             │
│                                                                 │
│  Despesas Diretas                               R$ 15.000,00   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Estrutura] Aluguel pavilhão   15/05   R$ 15.000,00    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Custos Overhead Alocados                        R$ 2.500,00   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Aluguel] Escritório jun/26    05/06   50% → R$ 2.500  │   │
│  │   ℹ Compartilhado: Belém 2026 (50%), Manaus 2027 (50%) │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│  Total Geral                                    R$ 17.500,00   │
└─────────────────────────────────────────────────────────────────┘
```

### Tela de lançamento de despesa overhead

```
┌─────────────────────────────────────────────────────────────────┐
│  Nova Despesa Overhead                                          │
│                                                                 │
│  Categoria  [ Aluguel ▼                         ]  ← GET /overhead-expenses/categories
│  Conta      [ Conta Principal PJ ▼              ]  ← GET /accounts
│  Descrição  [ Aluguel escritório - junho 2026   ]              │
│  Valor      [ R$ 5.000,00                       ]              │
│  Data       [ 05/06/2026                        ]              │
│                                                                 │
│  Feiras que compartilham este custo:                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ☑ ExpoMultimix Belém 2026     [  50 %  ]               │  │
│  │ ☑ ExpoMultimix Manaus 2027    [  50 %  ]               │  │
│  │ ☐ ExpoMultimix Manaus 2026    (encerrada)              │  │
│  │                                    Soma: 100% ✓         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Dividir igualmente]                     [Salvar]             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resumo de todos os endpoints

| Endpoint | Método | O que faz |
|----------|--------|-----------|
| `/overhead-expenses/categories` | GET | Lista categorias globais disponíveis |
| `/overhead-expenses` | POST | Cria despesa overhead com alocação entre feiras |
| `/overhead-expenses` | GET | Lista todas as despesas overhead |
| `/overhead-expenses/:id` | GET | Busca despesa por ID |
| `/overhead-expenses/:id` | PATCH | Atualiza (fairs substitui alocações) |
| `/overhead-expenses/:id` | DELETE | Remove despesa e alocações |
| `/fairs/:fairId/expenses` | GET | ⚠️ Agora retorna objeto com 3 seções |
| `/fairs/:fairId/expenses/total` | GET | ⚠️ Agora retorna objeto com 3 totais |
| `/finance/categories` | POST | Criar categoria global (use `global: true`) |
