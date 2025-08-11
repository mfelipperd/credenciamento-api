# 📋 API de Stands - Módulo Finance (ATUALIZADO)

## 🎯 Visão Geral

O módulo de Stands permite gerenciar os stands de uma feira, controlando sua disponibilidade e vinculação com receitas (vendas). Cada stand tem um número único dentro da feira e pode estar disponível para venda ou já vendido (vinculado a uma receita).

**Data da última atualização: 11 de agosto de 2025**

## 🚀 Funcionalidades Principais

### ✨ Novidades desta atualização:

- **Integração automática** com criação de receitas
- **Endpoints expandidos** para melhor gestão
- **Estatísticas detalhadas** para dashboards
- **Vinculação/desvinculação manual** de stands

### 1. Configuração de Stands da Feira

- **Endpoint**: `POST /finance/stands/configure`
- **Descrição**: Define a quantidade total de stands de uma feira
- **Comportamento**:
  - Cria stands automaticamente se não existirem
  - Não permite reduzir o número se já existem stands cadastrados
  - Exemplo: Configurar 74 stands criará stands numerados de 1 a 74

### 2. Listagem de Stands

- **Todos os stands**: `GET /finance/stands?fairId=1`
- **Stands disponíveis**: `GET /finance/stands/available?fairId=1`
- **Stands ocupados**: `GET /finance/stands/occupied?fairId=1`
- **Estatísticas**: `GET /finance/stands/stats?fairId=1`

### 3. Gestão Individual de Stands

- **Buscar por ID**: `GET /finance/stands/:id`
- **Vincular à receita**: `PATCH /finance/stands/:id/link-revenue?revenueId=uuid`
- **Desvincular**: `PATCH /finance/stands/:id/unlink-revenue`

## Relacionamentos

### Relação Revenue ↔ Stand (OneToOne)

A implementação agora inclui uma **relação bidirecional OneToOne** entre Revenue e Stand:

#### Na entidade Revenue:

```typescript
@OneToOne(() => Stand, (stand) => stand.revenue, { nullable: true })
stand?: Stand;
```

#### Na entidade Stand:

```typescript
@OneToOne(() => Revenue, { nullable: true })
@JoinColumn({ name: 'revenue_id' })
revenue?: Revenue;
```

### Benefícios da Relação Bidirecional:

1. **Consultas Otimizadas**: Pode navegar da receita para o stand e vice-versa
2. **Validações Automáticas**: TypeORM garante a integridade da relação 1:1
3. **Queries Simplificadas**:
   - `revenue.stand.standNumber`
   - `stand.revenue.client.name`
4. **Relatórios Integrados**: Facilita análises que envolvem receitas e stands

### Constraints de Banco:

- `UNIQUE KEY UK_revenue_id` garante que uma receita só pode ter um stand
- `FOREIGN KEY FK_stands_revenue` mantém integridade referencial
- `ON DELETE SET NULL` preserva stands se receita for removida

### Stand Entity

```typescript
{
  id: number;           // ID único do stand
  standNumber: number;  // Número do stand na feira (1, 2, 3...)
  fairId: number;       // ID da feira
  revenueId?: string;   // ID da receita vinculada (UUID)
  isAvailable: boolean; // Se está disponível para venda
  createdAt: Date;
  updatedAt: Date;
}
```

### Resposta dos Endpoints

```typescript
{
  id: number;
  standNumber: number;
  fairId: number;
  isAvailable: boolean;
  revenueId?: string;
  clientName?: string;      // Nome do cliente (quando vendido)
  entryModelType?: string;  // Tipo do stand (quando vendido)
}
```

## Exemplos de Uso

### 1. Configurar 74 stands para uma feira

```json
POST /finance/stands/configure
{
  "fairId": 1,
  "totalStands": 74
}

Resposta:
{
  "message": "Feira configurada com 74 stands",
  "totalStands": 74
}
```

### 2. Listar todos os stands de uma feira

```json
GET /finance/stands?fairId=1

Resposta:
[
  {
    "id": 1,
    "standNumber": 1,
    "fairId": 1,
    "isAvailable": false,
    "revenueId": "uuid-da-receita",
    "clientName": "João Silva",
    "entryModelType": "Premium"
  },
  {
    "id": 2,
    "standNumber": 2,
    "fairId": 1,
    "isAvailable": true
  },
  // ... mais 72 stands
]
```

### 3. Vincular stand a uma receita (venda)

```json
PATCH /finance/stands/1/link-revenue?revenueId=uuid-da-receita

Resposta:
{
  "id": 1,
  "standNumber": 1,
  "fairId": 1,
  "isAvailable": false,
  "revenueId": "uuid-da-receita",
  "clientName": "João Silva",
  "entryModelType": "Premium"
}
```

### 4. Estatísticas dos stands

```json
GET /finance/stands/stats?fairId=1

Resposta:
{
  "total": 74,
  "available": 45,
  "occupied": 29,
  "occupancyRate": 39.19
}
```

## Consultas com Relacionamentos

### 1. Buscar receita com informações do stand

```typescript
// No RevenuesService
async findRevenueWithStand(revenueId: string) {
  return await this.revenueRepository.findOne({
    where: { id: revenueId },
    relations: ['stand', 'client', 'entryModel']
  });
}

// Resposta inclui:
{
  "id": "uuid-receita",
  "clientId": "client-id",
  "contractValue": 50000,
  "stand": {
    "id": 1,
    "standNumber": 15,
    "fairId": 1
  },
  "client": { "name": "João Silva" },
  "entryModel": { "name": "Premium" }
}
```

### 2. Listar stands com dados das receitas (já implementado)

```typescript
// No StandsService - getFairStands()
const stands = await this.standRepository
  .createQueryBuilder('stand')
  .leftJoinAndSelect('stand.revenue', 'revenue')
  .leftJoinAndSelect('revenue.client', 'client')
  .leftJoinAndSelect('revenue.entryModel', 'entryModel')
  .where('stand.fairId = :fairId', { fairId })
  .getMany();
```

## Regras de Negócio

### Configuração de Stands

1. **Não permite redução**: Se já existem stands cadastrados, não é possível reduzir o número total
2. **Criação automática**: Novos stands são criados automaticamente com `isAvailable: true`
3. **Numeração sequencial**: Stands são numerados sequencialmente (1, 2, 3...)

### Vinculação de Receitas

1. **Unicidade**: Um stand só pode ter uma receita vinculada
2. **Exclusividade**: Uma receita só pode estar vinculada a um stand
3. **Status automático**: Ao vincular, `isAvailable` vira `false`
4. **Reversibilidade**: Pode desvincular e o stand volta a ficar disponível

### Dados Relacionados

- **Cliente**: Nome extraído da receita vinculada
- **Tipo de Stand**: Extraído do `entryModel` da receita
- **Disponibilidade**: Calculada automaticamente com base na vinculação

## Integração com Frontend

### Cenário de Uso Típico

1. **Configuração inicial**: Admin configura quantos stands a feira terá
2. **Visualização**: Frontend faz GET e mostra grid com todos os stands
3. **Status visual**:
   - Verde: Disponível
   - Vermelho: Vendido (mostra cliente e tipo)
4. **Processo de venda**:
   - Criar receita
   - Vincular ao stand
   - Stand fica "vendido" automaticamente

### Endpoints para Frontend

```typescript
// Configurar feira (admin)
POST /finance/stands/configure

// Listar todos os stands (grid principal)
GET /finance/stands?fairId=1

// Apenas disponíveis (filtro)
GET /finance/stands/available?fairId=1

// Estatísticas (dashboard)
GET /finance/stands/stats?fairId=1

// Vincular venda a stand
PATCH /finance/stands/:id/link-revenue?revenueId=uuid
```

## Casos de Erro

### 400 - Bad Request

- Tentar reduzir número de stands
- Stand já ocupado ao tentar vincular
- Receita já vinculada a outro stand
- Tentar desvincular stand já disponível

### 404 - Not Found

- Stand não encontrado
- Receita não encontrada

## Status da Implementação

✅ **Implementado**

- Entidade Stand com relacionamentos
- Service completo com todas as funcionalidades
- Controller com todos os endpoints
- DTOs com validações
- Módulo integrado ao sistema
- Documentação Swagger completa

📋 **Próximos Passos**

- Testes unitários
- Migração do banco de dados
- Testes de integração
