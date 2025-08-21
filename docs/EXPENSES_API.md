# API de Despesas - Documentação

## Visão Geral

O módulo de despesas permite gerenciar todas as despesas relacionadas às feiras, com categorização e controle por conta bancária.

## Estrutura de Dados

### Tabelas Principais

1. **`finance_expenses`** - Despesas principais
2. **`finance_categories`** - Categorias de despesas
3. **`finance_accounts`** - Contas bancárias

## Endpoints

### 1. Categorias Financeiras

#### Listar todas as categorias

```
GET /categories
```

**Resposta:**

```json
[
  {
    "id": "uuid",
    "nome": "Alimentação",
    "parentId": null,
    "global": true,
    "fairId": null,
    "parent": null,
    "children": []
  }
]
```

#### Criar nova categoria

```
POST /categories
```

**Body:**

```json
{
  "nome": "Nova Categoria",
  "parentId": "uuid-opcional",
  "global": true,
  "fairId": "uuid-opcional"
}
```

#### Atualizar categoria

```
PATCH /categories/{id}
```

#### Excluir categoria

```
DELETE /categories/{id}
```

#### Buscar categorias por feira

```
GET /categories/fair/{fairId}
```

### 2. Contas Bancárias

#### Listar todas as contas

```
GET /accounts
```

**Resposta:**

```json
[
  {
    "id": "uuid",
    "nomeConta": "Conta Corrente Principal",
    "banco": "Banco Principal",
    "tipo": "corrente",
    "createdAt": "2025-01-31T00:00:00.000Z",
    "updatedAt": "2025-01-31T00:00:00.000Z"
  }
]
```

#### Criar nova conta

```
POST /accounts
```

**Body:**

```json
{
  "nomeConta": "Nova Conta",
  "banco": "Banco",
  "tipo": "corrente"
}
```

**Tipos disponíveis:** `corrente`, `poupanca`, `outro`

#### Atualizar conta

```
PATCH /accounts/{id}
```

#### Excluir conta

```
DELETE /accounts/{id}
```

### 3. Despesas

#### Criar despesa

```
POST /fairs/{fairId}/expenses
```

**Body:**

```json
{
  "categoryId": "uuid",
  "accountId": "uuid",
  "descricao": "Descrição da despesa",
  "valor": 150.5,
  "data": "2025-01-31",
  "observacoes": "Observações opcionais"
}
```

**Nota:** O `fairId` é automaticamente definido pela URL.

#### Listar despesas de uma feira

```
GET /fairs/{fairId}/expenses
```

**Resposta:**

```json
[
  {
    "id": "uuid",
    "fairId": "uuid",
    "categoryId": "uuid",
    "accountId": "uuid",
    "descricao": "Descrição",
    "valor": 150.5,
    "data": "2025-01-31",
    "observacoes": "Observações",
    "createdAt": "2025-01-31T00:00:00.000Z",
    "updatedAt": "2025-01-31T00:00:00.000Z",
    "category": {
      "id": "uuid",
      "nome": "Alimentação"
    },
    "account": {
      "id": "uuid",
      "nomeConta": "Conta Principal"
    }
  }
]
```

#### Buscar despesa específica

```
GET /expenses/{id}
```

#### Atualizar despesa

```
PATCH /expenses/{id}
```

#### Excluir despesa

```
DELETE /expenses/{id}
```

### 4. Relatórios

#### Total de despesas por feira

```
GET /fairs/{fairId}/expenses/total
```

**Resposta:**

```json
{
  "total": 1250.75
}
```

#### Total por categoria

```
GET /fairs/{fairId}/expenses/total-by-category
```

**Resposta:**

```json
[
  {
    "categoryId": "uuid",
    "total": "450.25"
  }
]
```

#### Total por conta

```
GET /fairs/{fairId}/expenses/total-by-account
```

**Resposta:**

```json
[
  {
    "accountId": "uuid",
    "total": "800.50"
  }
]
```

## Validações

### Campos Obrigatórios

- `fairId` (UUID válido)
- `categoryId` (UUID válido)
- `accountId` (UUID válido)
- `valor` (número positivo, mínimo 0.01)
- `data` (formato ISO 8601)

### Regras de Negócio

1. Toda despesa deve estar vinculada a uma feira válida
2. Categorias são globais por padrão, mas podem ser específicas de feira
3. Contas bancárias são sempre globais
4. Não é possível excluir categorias ou contas que estejam sendo usadas por despesas
5. O valor deve ser sempre positivo

## Exemplos de Uso

### Criar uma despesa de alimentação

```bash
curl -X POST http://localhost:3000/fairs/123e4567-e89b-12d3-a456-426614174000/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "456e7890-e89b-12d3-a456-426614174001",
    "accountId": "789e0123-e89b-12d3-a456-426614174002",
    "descricao": "Almoço da equipe",
    "valor": 85.50,
    "data": "2025-01-31",
    "observacoes": "Almoço para 5 pessoas"
  }'
```

### Listar despesas de uma feira

```bash
curl http://localhost:3000/fairs/123e4567-e89b-12d3-a456-426614174000/expenses
```

### Obter total de despesas

```bash
curl http://localhost:3000/fairs/123e4567-e89b-12d3-a456-426614174000/expenses/total
```

## Códigos de Erro

- `400 Bad Request` - Dados inválidos ou campos obrigatórios ausentes
- `404 Not Found` - Recurso não encontrado
- `409 Conflict` - Conflito de dados (ex: tentativa de excluir categoria em uso)
- `422 Unprocessable Entity` - Validação falhou

## Notas de Implementação

- Todas as operações são protegidas por autenticação
- Validações são feitas tanto no frontend quanto no backend
- Relacionamentos são carregados automaticamente quando necessário
- Índices de banco otimizam consultas por feira e data
- Soft delete pode ser implementado no futuro se necessário
