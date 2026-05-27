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

## Como funciona o rateio

Ao lançar uma despesa overhead, o admin **seleciona quais feiras vão absorver aquele custo** e define os percentuais:

```
Despesa: Aluguel escritório — R$ 5.000

Feiras selecionadas:
  Belém 2026  → 50%  (R$ 2.500) ← ainda recebendo parcelas de contratos
  Manaus 2027 → 50%  (R$ 2.500) ← em fase de planejamento
```

Se nenhum percentual for informado, o sistema divide **igualmente** entre as feiras selecionadas.

---

## Endpoints

### Despesas Overhead

#### `POST /overhead-expenses`
Lança uma nova despesa overhead e define quais feiras compartilham o custo.

**Body:**
```json
{
  "categoria": "Aluguel",
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
- `fairs` precisa ter ao menos 1 item
- Se qualquer item tiver `percentual`, **todos** devem ter `percentual`
- A soma dos percentuais deve ser exatamente **1.0** (100%)
- `valor` deve ser maior que 0

**Response `201 Created`:**
```json
{
  "id": "uuid-da-despesa",
  "categoria": "Aluguel",
  "accountId": "uuid-conta",
  "descricao": "Aluguel escritório - junho 2026",
  "valor": "5000.00",
  "data": "2026-06-05",
  "observacoes": "Recibo nº 123",
  "createdAt": "2026-06-05T...",
  "updatedAt": "2026-06-05T...",
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
      "fair": { "id": "uuid-belem-2026", "name": "ExpoMultimix Belém 2026", ... }
    },
    {
      "id": "uuid-alloc-2",
      "overheadExpenseId": "uuid-da-despesa",
      "fairId": "uuid-manaus-2027",
      "percentual": "0.5000",
      "fair": { "id": "uuid-manaus-2027", "name": "ExpoMultimix Manaus 2027", ... }
    }
  ]
}
```

---

#### `GET /overhead-expenses`
Lista todas as despesas overhead com suas alocações.

**Response `200 OK`:** array do mesmo formato do POST acima, ordenado por `data DESC`.

---

#### `GET /overhead-expenses/:id`
Retorna uma despesa overhead pelo ID.

---

#### `PATCH /overhead-expenses/:id`
Atualiza uma despesa overhead. Todos os campos são opcionais.

Se `fairs` for enviado, **substitui completamente** as alocações anteriores (mesmo comportamento do POST).

**Body (exemplo — atualiza só o valor e redistribui para 3 feiras):**
```json
{
  "valor": 6000.00,
  "fairs": [
    { "fairId": "uuid-belem-2026", "percentual": 0.40 },
    { "fairId": "uuid-manaus-2027", "percentual": 0.40 },
    { "fairId": "uuid-fortaleza-2027", "percentual": 0.20 }
  ]
}
```

---

#### `DELETE /overhead-expenses/:id`
Remove a despesa e todas as suas alocações.

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
      "categoria": "Aluguel",
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

### Campo `allocatedOverhead` — explicação dos campos

| Campo | Descrição |
|-------|-----------|
| `id` | ID da despesa overhead original |
| `categoria` | Categoria livre (ex: "Aluguel", "Pessoal") |
| `descricao` | Descrição detalhada |
| `data` | Data do lançamento |
| `valorTotal` | Valor total da despesa (100%) |
| `percentualDesteFair` | Percentual que cabe a esta feira (ex: 0.5 = 50%) |
| `valorAlocado` | Valor calculado = `valorTotal × percentualDesteFair` |
| `account` | Conta bancária vinculada (pode ser `null`) |
| `feirasRateadas` | Todas as feiras que compartilham esta despesa |

---

### `GET /fairs/:fairId/expenses/total` — **response atualizado**

> ⚠️ **Breaking change:** antes retornava um número simples. Agora retorna um objeto com os totais separados.

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

## Campos de `categoria` — exemplos sugeridos

A categoria é texto livre, sem enum fixo. Exemplos típicos:

| Categoria | Exemplos de despesas |
|-----------|---------------------|
| `Aluguel` | Escritório, sala de reunião, depósito |
| `Pessoal` | Salários fixos, pró-labore, benefícios |
| `Infraestrutura` | Internet, telefone, luz, água |
| `Fiscal` | Contador, impostos, taxas |
| `Administrativo` | Material de escritório, correios, assinaturas |
| `TI` | Softwares, servidores, equipamentos |
| `Viagem` | Deslocamentos para reuniões multi-feira |

---

## Sugestão de UX para o frontend

### Tela de listagem de despesas de uma feira

```
┌─────────────────────────────────────────────────────────────────┐
│  DESPESAS — ExpoMultimix Belém 2026                             │
│                                                                 │
│  Despesas Diretas                               R$ 15.000,00   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Aluguel pavilhão          15/05/2026      R$ 15.000,00  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Custos Overhead Alocados                        R$ 2.500,00   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Aluguel      05/06/2026    50% de R$ 5.000     R$ 2.500 │   │
│  │ ℹ Compartilhado com: Belém 2026, Manaus 2027            │   │
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
│  Categoria  [ Aluguel ▼                         ]              │
│  Conta      [ Conta Principal PJ ▼              ]              │
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

## Resumo das alterações

| Endpoint | O que mudou |
|----------|------------|
| `POST /overhead-expenses` | **NOVO** |
| `GET /overhead-expenses` | **NOVO** |
| `GET /overhead-expenses/:id` | **NOVO** |
| `PATCH /overhead-expenses/:id` | **NOVO** |
| `DELETE /overhead-expenses/:id` | **NOVO** |
| `GET /fairs/:fairId/expenses` | ⚠️ Response alterado — agora retorna objeto com 3 seções |
| `GET /fairs/:fairId/expenses/total` | ⚠️ Response alterado — agora retorna objeto com 3 totais |
