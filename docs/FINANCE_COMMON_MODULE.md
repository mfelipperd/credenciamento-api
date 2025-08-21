# Módulo Comum Financeiro - Documentação Técnica

## Visão Geral

O módulo comum financeiro (`FinanceCommonModule`) é responsável por gerenciar as entidades compartilhadas entre diferentes módulos financeiros: categorias financeiras e contas bancárias. Ele fornece funcionalidades CRUD e validações para essas entidades fundamentais.

## Estrutura do Módulo

```
src/modules/finance/common/
├── entities/
│   ├── finance-category.entity.ts
│   ├── account.entity.ts
│   └── index.ts
├── dto/
│   ├── create-finance-category.dto.ts
│   ├── update-finance-category.dto.ts
│   ├── create-account.dto.ts
│   ├── update-account.dto.ts
│   └── index.ts
├── services/
│   ├── finance-categories.service.ts
│   ├── accounts.service.ts
│   └── index.ts
├── controllers/
│   ├── finance-categories.controller.ts
│   ├── accounts.controller.ts
│   └── index.ts
└── finance-common.module.ts
```

## Entidades

### 1. FinanceCategory Entity

**Tabela:** `finance_categories`

**Campos:**

- `id` (UUID, PK) - Identificador único da categoria
- `nome` (string, 255 chars, obrigatório) - Nome da categoria
- `parentId` (UUID, opcional) - Referência à categoria pai (hierarquia)
- `global` (boolean, default: true) - Indica se é categoria global
- `fairId` (UUID, opcional) - Referência à feira específica

**Relacionamentos:**

- `parent` - Relacionamento ManyToOne com FinanceCategory (auto-referência)
- `children` - Relacionamento OneToMany com FinanceCategory (categorias filhas)

**Características:**

- Suporte a hierarquia de categorias (categoria pai/filha)
- Categorias podem ser globais ou específicas de feira
- Validação para evitar loops de referência

### 2. Account Entity

**Tabela:** `finance_accounts`

**Campos:**

- `id` (UUID, PK) - Identificador único da conta
- `nomeConta` (string, 255 chars, obrigatório) - Nome da conta bancária
- `banco` (string, 255 chars, opcional) - Nome do banco
- `tipo` (enum, obrigatório) - Tipo da conta
- `createdAt` (timestamp) - Data de criação
- `updatedAt` (timestamp) - Data de última atualização

**Enum AccountType:**

- `CORRENTE` - Conta corrente
- `POUPANCA` - Conta poupança
- `OUTRO` - Outros tipos de conta

**Características:**

- Contas são sempre globais (não vinculadas a feiras específicas)
- Suporte a diferentes tipos bancários
- Auditoria de criação e modificação

## DTOs

### Categorias Financeiras

#### CreateFinanceCategoryDto

**Campos obrigatórios:**

- `nome` - String com nome da categoria

**Campos opcionais:**

- `parentId` - UUID da categoria pai
- `global` - Boolean indicando se é global
- `fairId` - UUID da feira específica

**Validações:**

- `@IsString()` e `@IsNotEmpty()` para nome
- `@IsUUID()` para IDs
- `@IsBoolean()` para campo global

#### UpdateFinanceCategoryDto

Estende `CreateFinanceCategoryDto` usando `PartialType`, tornando todos os campos opcionais.

### Contas Bancárias

#### CreateAccountDto

**Campos obrigatórios:**

- `nomeConta` - String com nome da conta

**Campos opcionais:**

- `banco` - String com nome do banco
- `tipo` - Enum AccountType

**Validações:**

- `@IsString()` e `@IsNotEmpty()` para nomeConta
- `@IsEnum(AccountType)` para tipo

#### UpdateAccountDto

Estende `CreateAccountDto` usando `PartialType`.

## Serviços

### 1. FinanceCategoriesService

#### Métodos Principais

##### `create(createCategoryDto: CreateFinanceCategoryDto)`

- Cria nova categoria financeira
- Suporta hierarquia pai/filha
- Valida se é global ou específica de feira

##### `findAll()`

- Lista todas as categorias
- Inclui relacionamentos parent/children
- Ordena por nome

##### `findOne(id: string)`

- Busca categoria específica por ID
- Inclui relacionamentos
- Lança `NotFoundException` se não encontrar

##### `update(id: string, updateCategoryDto: UpdateFinanceCategoryDto)`

- Atualiza categoria existente
- Valida integridade da hierarquia
- Previne loops de referência

##### `remove(id: string)`

- Remove categoria
- Valida se pode ser removida (sem despesas vinculadas)

##### `findByFair(fairId: string)`

- Busca categorias disponíveis para uma feira
- Retorna categorias globais + específicas da feira
- Inclui hierarquia

#### Validações Especiais

- Prevenção de loops de referência pai/filha
- Verificação de uso antes de exclusão
- Validação de hierarquia

### 2. AccountsService

#### Métodos Principais

##### `create(createAccountDto: CreateAccountDto)`

- Cria nova conta bancária
- Define tipo padrão como 'corrente'

##### `findAll()`

- Lista todas as contas
- Ordena por nome

##### `findOne(id: string)`

- Busca conta específica por ID
- Lança `NotFoundException` se não encontrar

##### `update(id: string, updateAccountDto: UpdateAccountDto)`

- Atualiza conta existente
- Permite atualização parcial

##### `remove(id: string)`

- Remove conta
- Valida se pode ser removida (sem despesas vinculadas)

## Controladores

### 1. FinanceCategoriesController

**Base Path:** `/categories`

#### Endpoints

##### **POST** `/`

- Cria nova categoria
- Aceita `CreateFinanceCategoryDto`
- Retorna categoria criada

##### **GET** `/`

- Lista todas as categorias
- Retorna array com hierarquia

##### **GET** `/fair/{fairId}`

- Lista categorias disponíveis para uma feira
- Retorna categorias globais + específicas

##### **GET** `/{id}`

- Busca categoria específica
- Retorna com relacionamentos

##### **PATCH** `/{id}`

- Atualiza categoria existente
- Aceita `UpdateFinanceCategoryDto`

##### **DELETE** `/{id}`

- Remove categoria
- Valida integridade antes de remover

### 2. AccountsController

**Base Path:** `/accounts`

#### Endpoints

##### **POST** `/`

- Cria nova conta bancária
- Aceita `CreateAccountDto`
- Retorna conta criada

##### **GET** `/`

- Lista todas as contas
- Retorna array ordenado

##### **GET** `/{id}`

- Busca conta específica
- Retorna conta completa

##### **PATCH** `/{id}`

- Atualiza conta existente
- Aceita `UpdateAccountDto`

##### **DELETE** `/{id}`

- Remove conta
- Valida integridade antes de remover

## Módulo (FinanceCommonModule)

**Imports:**

- `TypeOrmModule.forFeature([FinanceCategory, Account])`

**Controllers:**

- `FinanceCategoriesController`
- `AccountsController`

**Providers:**

- `FinanceCategoriesService`
- `AccountsService`

**Exports:**

- `FinanceCategoriesService`
- `AccountsService`

## Regras de Negócio

### Categorias Financeiras

1. **Hierarquia:** Suporte a categorias pai/filha
2. **Escopo:** Globais por padrão, podem ser específicas de feira
3. **Integridade:** Não pode excluir categoria em uso
4. **Validação:** Prevenção de loops de referência
5. **Nomenclatura:** Nomes únicos por escopo

### Contas Bancárias

1. **Globalidade:** Sempre globais (não vinculadas a feiras)
2. **Tipos:** Suporte a corrente, poupança e outros
3. **Integridade:** Não pode excluir conta em uso
4. **Nomenclatura:** Nomes únicos

## Validações

### Backend

- Validação de UUIDs
- Validação de campos obrigatórios
- Validação de enum AccountType
- Validação de hierarquia de categorias

### Banco de Dados

- Constraints de chave estrangeira
- Índices para performance
- Validação de integridade referencial

## Tratamento de Erros

- `NotFoundException` - Recurso não encontrado
- `BadRequestException` - Dados inválidos
- Validação automática via class-validator
- Validação customizada para hierarquia
- Respostas HTTP apropriadas

## Performance

- Índices otimizados para consultas
- Relacionamentos carregados sob demanda
- Consultas SQL otimizadas
- Suporte a paginação futura

## Segurança

- Validação de entrada em todos os endpoints
- Sanitização de dados
- Proteção contra SQL injection
- Validação de hierarquia para prevenir loops

## Exemplos de Uso

### Criar Categoria Hierárquica

```typescript
const parentCategory = await categoriesService.create({
  nome: 'Alimentação',
  global: true,
});

const subCategory = await categoriesService.create({
  nome: 'Restaurantes',
  parentId: parentCategory.id,
  global: true,
});
```

### Criar Conta Bancária

```typescript
const account = await accountsService.create({
  nomeConta: 'Conta Corrente Principal',
  banco: 'Banco do Brasil',
  tipo: AccountType.CORRENTE,
});
```

### Buscar Categorias por Feira

```typescript
const categories = await categoriesService.findByFair('uuid-feira');
```

## Casos de Uso

### 1. Categorização de Despesas

- Categorias padrão para todas as feiras
- Categorias específicas para feiras particulares
- Hierarquia para organização lógica

### 2. Controle de Contas

- Múltiplas contas bancárias
- Diferentes tipos de conta
- Rastreamento de movimentações

### 3. Relatórios Financeiros

- Agrupamento por categoria
- Agrupamento por conta
- Análise de gastos por feira

## Próximas Implementações

- [ ] Cache para categorias e contas
- [ ] Validação de orçamento por categoria
- [ ] Histórico de mudanças
- [ ] Soft delete para auditoria
- [ ] Importação/exportação de dados
- [ ] Validação de limites por conta
- [ ] Categorias padrão por tipo de feira
