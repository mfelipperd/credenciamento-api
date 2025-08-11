# Documentação - Melhorias na Entidade de Feiras

## 📋 Visão Geral

Esta documentação descreve as melhorias implementadas na entidade `Fair` para incluir informações detalhadas de endereço, data e hora, mantendo total compatibilidade com a estrutura existente.

## 🎯 Objetivos

- Manter compatibilidade total com dados existentes
- Adicionar campos de endereço detalhado
- Incluir informações de horário de início e fim
- Permitir flexibilidade entre data simples e data/hora completa

## 🗂️ Estrutura da Entidade Atualizada

### Fair Entity (`src/modules/fairs/entity/fair.entity.ts`)

#### Campos Existentes (Mantidos)

```typescript
id: string; // UUID primário
name: string; // Nome da feira (até 255 caracteres)
location: string; // Localização geral (até 255 caracteres)
date: Date; // Data da feira
createdAt: Date; // Data de criação automática
```

#### Novos Campos de Endereço

```typescript
address: string; // Endereço completo (até 255 caracteres, opcional)
city: string; // Cidade (até 100 caracteres, opcional)
state: string; // Estado/Província (até 50 caracteres, opcional)
zipCode: string; // CEP/Código Postal (até 20 caracteres, opcional)
country: string; // País (até 100 caracteres, opcional)
```

#### Novos Campos de Hora

```typescript
startTime: string; // Hora de início (formato HH:mm, opcional)
endTime: string; // Hora de término (formato HH:mm, opcional)
startDateTime: Date; // Data e hora de início completa (opcional)
endDateTime: Date; // Data e hora de término completa (opcional)
```

## 📝 DTO Atualizado

### CreateInputFairDto (`src/modules/fairs/fair.dto.ts`)

#### Campos Obrigatórios

```typescript
name: string; // Nome da feira
location: string; // Localização geral
date: Date; // Data da feira (ISO8601)
```

#### Campos Opcionais de Endereço

```typescript
address?: string      // Endereço detalhado
city?: string        // Cidade
state?: string       // Estado
zipCode?: string     // CEP
country?: string     // País
```

#### Campos Opcionais de Horário

```typescript
startTime?: string       // Hora de início (HH:mm)
endTime?: string        // Hora de término (HH:mm)
startDateTime?: Date    // Data/hora de início completa
endDateTime?: Date      // Data/hora de término completa
```

## 🔧 Validações Implementadas

### Validações Obrigatórias

- `name`: String de 1-255 caracteres
- `location`: String de 1-255 caracteres
- `date`: Data em formato ISO8601

### Validações Opcionais

- `address`: String de 1-255 caracteres (se fornecido)
- `city`: String de 1-100 caracteres (se fornecido)
- `state`: String de 1-50 caracteres (se fornecido)
- `zipCode`: String de 1-20 caracteres (se fornecido)
- `country`: String de 1-100 caracteres (se fornecido)
- `startTime/endTime`: String no formato HH:mm (se fornecido)
- `startDateTime/endDateTime`: Data válida (se fornecido)

## 🚀 Exemplos de Uso

### Criação de Feira - Formato Simples (Compatível)

```json
{
  "name": "Feira de Tecnologia 2025",
  "location": "Centro de Convenções",
  "date": "2025-12-15"
}
```

### Criação de Feira - Formato Completo

```json
{
  "name": "Feira de Tecnologia 2025",
  "location": "Centro de Convenções São Paulo",
  "date": "2025-12-15",
  "address": "Rua das Flores, 123",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01234-567",
  "country": "Brasil",
  "startTime": "09:00",
  "endTime": "18:00",
  "startDateTime": "2025-12-15T09:00:00.000Z",
  "endDateTime": "2025-12-15T18:00:00.000Z"
}
```

### Criação de Feira - Formato Híbrido

```json
{
  "name": "Workshop de Inovação",
  "location": "Auditório Principal",
  "date": "2025-11-20",
  "city": "Rio de Janeiro",
  "state": "RJ",
  "startTime": "14:00",
  "endTime": "17:00"
}
```

## 📊 Resposta da API

### Estrutura de Resposta

```json
{
  "id": "uuid-da-feira",
  "name": "Feira de Tecnologia 2025",
  "location": "Centro de Convenções São Paulo",
  "address": "Rua das Flores, 123",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01234-567",
  "country": "Brasil",
  "date": "2025-12-15",
  "startTime": "09:00",
  "endTime": "18:00",
  "startDateTime": "2025-12-15T09:00:00.000Z",
  "endDateTime": "2025-12-15T18:00:00.000Z",
  "createdAt": "2025-11-08T15:30:00.000Z",
  "fair_visitor": [],
  "categories": [],
  "sectors": [],
  "howDidYouKnow": []
}
```

## 🔄 Migração e Compatibilidade

### Retrocompatibilidade

- ✅ Todos os campos existentes permanecem inalterados
- ✅ APIs existentes continuam funcionando
- ✅ Dados existentes no banco permanecem válidos
- ✅ Campos novos são opcionais (nullable)

### Estratégia de Migração

1. **Campos Existentes**: Nenhuma alteração necessária
2. **Novos Campos**: Adicionados como `nullable` para compatibilidade
3. **Frontend**: Pode ser atualizado gradualmente
4. **Banco de Dados**: Migration automática do TypeORM

## 🗄️ Impacto no Banco de Dados

### Alterações na Tabela `fairs`

```sql
-- Novos campos adicionados (nullable para compatibilidade)
ALTER TABLE fairs ADD COLUMN address VARCHAR(255) NULL;
ALTER TABLE fairs ADD COLUMN city VARCHAR(100) NULL;
ALTER TABLE fairs ADD COLUMN state VARCHAR(50) NULL;
ALTER TABLE fairs ADD COLUMN zipCode VARCHAR(20) NULL;
ALTER TABLE fairs ADD COLUMN country VARCHAR(100) NULL;
ALTER TABLE fairs ADD COLUMN startTime TIME NULL;
ALTER TABLE fairs ADD COLUMN endTime TIME NULL;
ALTER TABLE fairs ADD COLUMN startDateTime DATETIME NULL;
ALTER TABLE fairs ADD COLUMN endDateTime DATETIME NULL;
```

## 🔍 Casos de Uso

### Caso 1: Feira Simples

- Usar apenas `name`, `location` e `date`
- Ideal para eventos básicos

### Caso 2: Feira com Endereço Detalhado

- Incluir `address`, `city`, `state`, `zipCode`, `country`
- Útil para navegação e localização precisa

### Caso 3: Feira com Horários

- Usar `startTime` e `endTime` para horários simples
- Usar `startDateTime` e `endDateTime` para controle completo

### Caso 4: Feira Completa

- Todos os campos preenchidos
- Máximo controle e informação

## ✅ Checklist de Implementação

- ✅ Entidade `Fair` atualizada com novos campos
- ✅ DTO `CreateInputFairDto` atualizado com validações
- ✅ Compatibilidade com service e controller existentes
- ✅ Campos opcionais para retrocompatibilidade
- ✅ Validações apropriadas implementadas
- ✅ Compilação sem erros
- ✅ Documentação completa criada

## 🚨 Notas Importantes

1. **Flexibilidade**: Os campos de data/hora oferecem flexibilidade - pode usar apenas data, apenas horários, ou ambos
2. **Validação**: Horários devem estar no formato HH:mm (24 horas)
3. **Timezone**: Data/hora completa deve incluir timezone apropriado
4. **Migração**: Dados existentes não são afetados - novos campos são opcionais

---

**Data da Implementação**: 08/11/2025  
**Status**: ✅ IMPLEMENTADO  
**Compatibilidade**: ✅ TOTAL RETROCOMPATIBILIDADE
