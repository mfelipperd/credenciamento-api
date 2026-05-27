# Resposta Backend — Tipagens e Inconsistências do Módulo de Despesas

Documento de resposta à análise enviada pelo frontend. Cada ponto foi verificado diretamente no código-fonte do backend.

---

## 1. `nome` vs `name` — Duas tabelas diferentes, não um bug

**Este não é um bug nem inconsistência do mesmo endpoint. São duas entidades completamente separadas.**

| Tabela no banco | Campo | Endpoint | Usado em |
|-----------------|-------|----------|----------|
| `categories` | `name: string` | `GET /categories/fair/:fairId` | Despesas **diretas** de feira (`finance_expenses`) |
| `finance_categories` | `nome: string` | `GET /finance/categories` / `GET /overhead-expenses/categories` | Despesas **overhead** (`overhead_expenses`) |

**O que o frontend precisa fazer:**

Manter duas interfaces distintas — elas representam coisas diferentes:

```typescript
// Categorias de despesas diretas (por feira)
// Endpoint: GET /categories/fair/:fairId
interface DirectExpenseCategory {
  id: string;
  name: string;           // ← "name" (inglês) — tabela `categories`
  isRequired: boolean;
  description: string | null;
}

// Categorias de overhead (globais, entre feiras)
// Endpoint: GET /overhead-expenses/categories  ou  GET /finance/categories
interface OverheadCategory {
  id: string;
  nome: string;           // ← "nome" (português) — tabela `finance_categories`
  global: boolean;
  isRequired: boolean;
  description: string | null;
  parentId: string | null;
}
```

**Remover o fallback `(category as any).nome || (category as any).name`** nos arquivos de serviço — ele mascara qual das duas entidades está sendo recebida e vai gerar bugs silenciosos.

---

## 2. `AccountType` — Os valores do enum **são** lowercase

O enum no backend:

```typescript
export enum AccountType {
  CORRENTE = 'corrente',   // ← valor salvo no banco: "corrente"
  POUPANCA = 'poupanca',   // ← valor salvo no banco: "poupanca"
  OUTRO    = 'outro',      // ← valor salvo no banco: "outro"
}
```

- **O banco salva e retorna:** `"corrente"`, `"poupanca"`, `"outro"` (lowercase)
- **O que o backend aceita no POST/PATCH:** `"corrente"`, `"poupanca"`, `"outro"` (lowercase)

**O `.toLowerCase()` feito pelo frontend está correto**, mas é um sintoma de que a interface está errada no lado do frontend. O fix é atualizar o tipo:

```typescript
// ❌ Errado (frontend atual)
type AccountType = "CORRENTE" | "POUPANCA" | "OUTRO";

// ✅ Correto
type AccountType = "corrente" | "poupanca" | "outro";
```

Com a interface corrigida, remover a conversão `.toLowerCase()` nos serviços — passa a ser desnecessária.

---

## 3. `valor` e `percentual` retornando como `string` — Comportamento do MySQL + TypeORM

**Causa:** O driver MySQL do Node.js retorna colunas `DECIMAL` sempre como string. O TypeORM repassa esse valor sem conversão automática.

| Campo | Tipo no banco | Retorno atual (JSON) | Formato |
|-------|---------------|----------------------|---------|
| `valor` (despesas diretas) | `DECIMAL(10,2)` | `"5000.00"` | string |
| `valor` (overhead) | `DECIMAL(10,2)` | `"5000.00"` | string |
| `percentual` (alocações) | `DECIMAL(5,4)` | `"0.5000"` | string |

**Fix no backend (feito agora):** Adicionamos `transformer` nas colunas DECIMAL para que o TypeORM já converta para `number` antes de serializar o JSON. A partir do próximo deploy, esses campos retornarão como `number`:

```
valor:     5000     (não mais "5000.00")
percentual: 0.5     (não mais "0.5000")
```

**O que o frontend deve mudar após o deploy:**

```typescript
// ❌ Desnecessário após o fix
parseFloat((parseFloat(alloc.percentual.toString()) * 100).toFixed(2))

// ✅ Simples
alloc.percentual * 100  // ex: 0.5 * 100 = 50
```

Interfaces:
```typescript
// ✅ Tipar como number puro
interface OverheadExpense {
  valor: number;       // não mais number | string
}

interface OverheadAllocation {
  percentual: number;  // não mais number | string  (0.5 = 50%)
}
```

**Semântica do `percentual`:** o valor representa a fração (0–1), nunca porcentagem (0–100).
- `0.5` = 50%
- `1.0` = 100%
- Para exibir na tela: `(percentual * 100).toFixed(0) + "%"`

---

## 4. URL dos endpoints de Overhead — prefixo incorreto no frontend

O controller de overhead **não tem o prefixo `/finance/`**:

```typescript
// Backend — controller registrado como:
@Controller('overhead-expenses')
```

| ❌ URL que o frontend está usando | ✅ URL correta |
|----------------------------------|----------------|
| `/finance/overhead-expenses` | `/overhead-expenses` |
| `/finance/overhead-expenses/:id` | `/overhead-expenses/:id` |

**Todos os endpoints de overhead:**

```
GET    /overhead-expenses/categories   ← lista categorias globais
POST   /overhead-expenses
GET    /overhead-expenses
GET    /overhead-expenses/:id
PATCH  /overhead-expenses/:id
DELETE /overhead-expenses/:id
```

---

## 5. Interface `FinanceCategory` duplicada no frontend

O frontend tem duas definições conflitantes. Qual é a correta:

```typescript
// ✅ Interface correta (baseada no banco finance_categories)
interface FinanceCategory {
  id: string;
  nome: string;            // ← "nome", sempre
  global: boolean;
  fairId: string | null;
  isRequired: boolean;
  description: string | null;
  parentId: string | null;
  parent?: FinanceCategory;
  children?: FinanceCategory[];
}
```

Manter **apenas uma** definição com `nome`. A definição com `name` está errada e deve ser removida.

---

## 6. `OverheadExpenseForm` — dois tipos de objeto para a prop `expense`

O frontend reportou que o componente recebe dois formatos diferentes de objeto de overhead:

| Formato | Fonte | Propriedade de alocações |
|---------|-------|--------------------------|
| `OverheadExpense` | `GET /overhead-expenses` | `allocations: Allocation[]` |
| `AllocatedOverheadExpense` | dentro de `GET /fairs/:fairId/expenses` | `feirasRateadas: FairShare[]` |

**Isso é intencional** — são duas visões do mesmo dado para contextos diferentes:

- `GET /overhead-expenses` → visão de gestão (você edita a despesa)
- `GET /fairs/:fairId/expenses → allocatedOverhead` → visão da feira (você vê quanto ela absorveu)

**Recomendação:** usar um discriminador de tipo para o componente, ou dois componentes separados (um para edição, outro para visualização dentro da feira):

```typescript
type OverheadExpenseFormProps =
  | { mode: 'edit'; expense: OverheadExpense }
  | { mode: 'view'; expense: AllocatedOverheadExpense };
```

---

---

## 7. Converter despesa direta em overhead — novo endpoint

Durante a análise dos dados da Belém 2026, identificamos despesas lançadas como **diretas** que são, na verdade, custos compartilhados da empresa (overhead):

| Despesa direta (Belém 2026) | Categoria | Natureza real |
|-----------------------------|-----------|---------------|
| ESCRITORIO CE | ALUGUEL ESCRITORIO | ⚠️ Overhead (escritório CE é da empresa, não da feira) |
| CONTADOR HONORARIOS | CONTADOR | ⚠️ Overhead (honorários da empresa) |
| SIMPLES NACIONAL | IMPOSTOS | ⚠️ Overhead (imposto da empresa) |
| PIS COFINS | IMPOSTOS | ⚠️ Overhead |
| FGTS | IMPOSTOS | ⚠️ Overhead |
| INTERNET ESCRITORIO | INTERNET | ⚠️ Overhead (internet do escritório) |
| BOMBEIRO FEIRA | BOMBEIRO | ✅ Direto da feira |
| ESTACIONAMENTO | CUSTO ESCRITÓRIO | ✅ Direto (discutível) |

Para corrigir isso sem perder o histórico, criamos um endpoint de conversão:

### `POST /expenses/:id/convert-to-overhead`

Converte uma despesa direta em overhead em uma operação atômica:
1. Cria o `overhead_expense` com os mesmos dados (valor, data, descrição, conta)
2. Registra o rateio entre as feiras informadas
3. Exclui a despesa direta original
4. Se não for informado `financeCategoryId`, o backend busca automaticamente uma `finance_category` global com o mesmo nome da categoria da despesa. Se não existir, cria.

**Exemplo — converter ESCRITORIO CE para overhead entre Belém 2026 e Manaus 2026:**

```http
POST /expenses/{expenseId}/convert-to-overhead
Content-Type: application/json

{
  "fairs": [
    { "fairId": "0299a14d-10f1-4799-bf18-a0ecfec99d62" },  // Belém 2026
    { "fairId": "outro-uuid-manaus-2026" }                   // Manaus 2026
  ]
}
```

Resposta: o `OverheadExpense` criado (com alocações 50%/50%).

**Exemplo com percentual manual:**

```http
POST /expenses/{expenseId}/convert-to-overhead
Content-Type: application/json

{
  "financeCategoryId": "uuid-da-finance-category-aluguel",
  "fairs": [
    { "fairId": "0299a14d-10f1-4799-bf18-a0ecfec99d62", "percentual": 0.6 },  // 60% Belém
    { "fairId": "outro-uuid-manaus-2026",                "percentual": 0.4 }   // 40% Manaus
  ]
}
```

**Workflow sugerido no frontend para cada despesa overhead:**
1. Listar categorias globais disponíveis: `GET /overhead-expenses/categories`
2. Fazer a conversão: `POST /expenses/:id/convert-to-overhead`
3. Recarregar `GET /fairs/:fairId/expenses` para ver o resultado

---

## Resumo das ações por responsável

### Backend (feito agora — deploy automático Railway)
- [x] Adicionar `transformer` nas colunas DECIMAL → `valor` e `percentual` passam a retornar `number`
- [x] Novo endpoint `POST /expenses/:id/convert-to-overhead`

### Frontend (refatorações necessárias)
| # | Ação | Arquivo(s) |
|---|------|-----------|
| 1 | Criar `DirectExpenseCategory` (`name`) e `OverheadCategory` (`nome`) separadas | `categories.ts` |
| 2 | Remover fallback `(category as any).nome \|\| (category as any).name` | `expenses.service.ts` |
| 3 | Atualizar `AccountType` para `"corrente" \| "poupanca" \| "outro"` e remover `.toLowerCase()` | `expenses.service.ts` |
| 4 | Tipar `valor` e `percentual` como `number` (após deploy) e remover casts numéricos | `finance.ts`, `OverheadExpenseForm.tsx` |
| 5 | Corrigir URLs de `/finance/overhead-expenses` para `/overhead-expenses` | `expenses.service.ts` |
| 6 | Manter apenas uma `FinanceCategory` com `nome` (remover a com `name`) | `finance.ts` |
| 7 | Separar prop `expense` do form com discriminador de modo (`edit` / `view`) | `OverheadExpenseForm.tsx`, `ExpenseFilters.tsx` |
| 8 | Implementar UI para converter despesas diretas em overhead (botão na listagem de despesas) | `ExpenseList.tsx` |
