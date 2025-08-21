# Módulo de Despesas - Documentação Técnica

## Visão Geral

O módulo de despesas é responsável por gerenciar todas as despesas relacionadas às feiras da plataforma Expo MultiMix. Ele permite o controle financeiro detalhado com categorização, controle por conta bancária e relatórios consolidados.

## Estrutura do Módulo

```
src/modules/finance/expenses/
├── entities/
│   └── expense.entity.ts
├── dto/
│   ├── create-expense.dto.ts
│   └── update-expense.dto.ts
├── expenses.service.ts
├── expenses.controller.ts
└── expenses.module.ts
```

## Entidades

### Expense Entity

**Tabela:** `finance_expenses`

**Campos:**

- `id` (UUID, PK) - Identificador único da despesa
- `fairId` (UUID, obrigatório) - Referência à feira
- `categoryId` (UUID, obrigatório) - Referência à categoria financeira
- `accountId` (UUID, obrigatório) - Referência à conta bancária
- `descricao` (string, 500 chars, opcional) - Descrição da despesa
- `valor` (decimal(10,2), obrigatório) - Valor da despesa
- `data` (date, obrigatório) - Data da despesa
- `observacoes` (text, opcional) - Observações adicionais
- `createdAt` (timestamp) - Data de criação
- `updatedAt` (timestamp) - Data de última atualização

**Relacionamentos:**

- `fair` - Relacionamento ManyToOne com Fair
- `category` - Relacionamento ManyToOne com FinanceCategory
- `account` - Relacionamento ManyToOne com Account

**Índices:**

- `IDX_finance_expenses_fairId_data` - Otimiza consultas por feira e data
- `IDX_finance_expenses_categoryId` - Otimiza consultas por categoria
- `IDX_finance_expenses_accountId` - Otimiza consultas por conta

## DTOs

### CreateExpenseDto

**Campos obrigatórios:**

- `categoryId` - UUID da categoria
- `accountId` - UUID da conta bancária
- `valor` - Número positivo (mínimo 0.01)
- `data` - Data no formato ISO 8601

**Campos opcionais:**

- `descricao` - String com descrição
- `observacoes` - String com observações

**Validações:**

- `@IsUUID()` para IDs
- `@IsNumber()` e `@Min(0.01)` para valor
- `@IsDateString()` para data
- `@IsString()` para campos de texto

### UpdateExpenseDto

Estende `CreateExpenseDto` usando `PartialType`, tornando todos os campos opcionais para atualizações.

## Serviço (ExpensesService)

### Métodos Principais

#### `create(createExpenseDto: CreateExpenseDto)`

- Cria uma nova despesa
- Retorna a despesa criada com todos os campos

#### `findAllByFair(fairId: string)`

- Lista todas as despesas de uma feira específica
- Inclui relacionamentos com categoria e conta
- Ordena por data (mais recente primeiro)

#### `findOne(id: string)`

- Busca uma despesa específica por ID
- Inclui todos os relacionamentos
- Lança `NotFoundException` se não encontrar

#### `update(id: string, updateExpenseDto: UpdateExpenseDto)`

- Atualiza uma despesa existente
- Valida se a despesa existe antes de atualizar
- Permite atualização parcial dos campos

#### `remove(id: string)`

- Remove uma despesa permanentemente
- Valida se a despesa existe antes de remover

### Métodos de Relatório

#### `getTotalByFair(fairId: string)`

- Calcula o total de despesas de uma feira
- Retorna número decimal

#### `getTotalByCategory(fairId: string)`

- Agrupa despesas por categoria
- Retorna array com `categoryId` e `total`

#### `getTotalByAccount(fairId: string)`

- Agrupa despesas por conta bancária
- Retorna array com `accountId` e `total`

## Controlador (ExpensesController)

### Endpoints

#### **POST** `/fairs/{fairId}/expenses`

- Cria nova despesa vinculada à feira
- `fairId` é definido automaticamente pela URL
- Retorna despesa criada

#### **GET** `/fairs/{fairId}/expenses`

- Lista todas as despesas de uma feira
- Retorna array com relacionamentos

#### **GET** `/expenses/{id}`

- Busca despesa específica por ID
- Retorna despesa com todos os relacionamentos

#### **PATCH** `/expenses/{id}`

- Atualiza despesa existente
- Permite atualização parcial

#### **DELETE** `/expenses/{id}`

- Remove despesa permanentemente

### Endpoints de Relatório

#### **GET** `/fairs/{fairId}/expenses/total`

- Total de despesas da feira

#### **GET** `/fairs/{fairId}/expenses/total-by-category`

- Total agrupado por categoria

#### **GET** `/fairs/{fairId}/expenses/total-by-account`

- Total agrupado por conta bancária

## Módulo (ExpensesModule)

**Imports:**

- `TypeOrmModule.forFeature([Expense, Fair, FinanceCategory, Account])`

**Controllers:**

- `ExpensesController`

**Providers:**

- `ExpensesService`

**Exports:**

- `ExpensesService` (para uso em outros módulos)

## Regras de Negócio

1. **Vinculação com Feira:** Toda despesa deve estar vinculada a uma feira válida
2. **Valor Positivo:** O valor deve ser sempre positivo (mínimo 0.01)
3. **Data Válida:** A data deve estar no formato correto
4. **Categoria e Conta:** Devem existir no sistema antes de criar a despesa
5. **Integridade:** Não é possível excluir categorias ou contas em uso

## Validações

### Backend

- Validação de UUIDs
- Validação de valores numéricos
- Validação de formato de data
- Validação de campos obrigatórios

### Banco de Dados

- Constraints de chave estrangeira
- Índices para performance
- Tipos de dados específicos

## Tratamento de Erros

- `NotFoundException` - Recurso não encontrado
- `BadRequestException` - Dados inválidos
- Validação automática via class-validator
- Respostas HTTP apropriadas

## Performance

- Índices otimizados para consultas frequentes
- Relacionamentos carregados sob demanda
- Consultas SQL otimizadas para relatórios
- Paginação pode ser implementada no futuro

## Segurança

- Validação de entrada em todos os endpoints
- Sanitização de dados
- Proteção contra SQL injection via TypeORM
- Autenticação e autorização (implementar conforme necessário)

## Exemplos de Uso

### Criar Despesa

```typescript
const expense = await expensesService.create({
  categoryId: 'uuid-categoria',
  accountId: 'uuid-conta',
  descricao: 'Almoço da equipe',
  valor: 85.5,
  data: '2025-01-31',
  observacoes: 'Almoço para 5 pessoas',
});
```

### Listar por Feira

```typescript
const expenses = await expensesService.findAllByFair('uuid-feira');
```

### Relatório de Total

```typescript
const total = await expensesService.getTotalByFair('uuid-feira');
```

## Próximas Implementações

- [ ] Paginação para listagens grandes
- [ ] Filtros por período
- [ ] Exportação para CSV/Excel
- [ ] Soft delete para auditoria
- [ ] Cache para relatórios frequentes
- [ ] Validação de orçamento vs. despesas
