# ✅ Relação Revenue ↔ Stand Implementada

## Mudanças Realizadas

### 1. **Entidade Revenue**

- ✅ Adicionado import `OneToOne` do TypeORM
- ✅ Adicionado import da entidade `Stand`
- ✅ Adicionada propriedade `stand?: Stand` com decorador `@OneToOne`
- ✅ Relação configurada como nullable (opcional)

### 2. **Entidade Stand** (já existia)

- ✅ Mantida propriedade `revenueId?: string`
- ✅ Mantida relação `@OneToOne(() => Revenue)`
- ✅ JoinColumn configurado corretamente

### 3. **RevenuesService**

- ✅ Atualizado método `findAll()` para incluir relação `'stand'`
- ✅ Agora as consultas incluem dados do stand vinculado

### 4. **Migração SQL**

- ✅ Adicionada constraint `UNIQUE KEY UK_revenue_id`
- ✅ Garante relação 1:1 no banco de dados
- ✅ Comentários atualizados para refletir relação bidirecional

### 5. **Documentação**

- ✅ Seção de relacionamentos adicionada
- ✅ Exemplos de consultas bidirecionais
- ✅ Benefícios da relação explicados

## Como Usar

### Buscar Receita com Stand

```typescript
const revenue = await this.revenueRepository.findOne({
  where: { id: revenueId },
  relations: ['stand', 'client', 'entryModel'],
});

// Agora você pode acessar:
console.log(revenue.stand?.standNumber); // Número do stand
console.log(revenue.stand?.fairId); // ID da feira
```

### Buscar Stand com Receita (já funcionava)

```typescript
const stand = await this.standRepository.findOne({
  where: { id: standId },
  relations: ['revenue', 'revenue.client'],
});

// Você pode acessar:
console.log(stand.revenue?.client?.name); // Nome do cliente
```

### Queries Automáticas nos Endpoints

#### GET /finance/revenues

```json
[
  {
    "id": "uuid-receita",
    "contractValue": 50000,
    "client": { "name": "João Silva" },
    "entryModel": { "name": "Premium" },
    "stand": {
      "id": 1,
      "standNumber": 15,
      "fairId": 1,
      "isAvailable": false
    }
  }
]
```

#### GET /finance/stands?fairId=1

```json
[
  {
    "id": 1,
    "standNumber": 15,
    "fairId": 1,
    "isAvailable": false,
    "revenueId": "uuid-receita",
    "clientName": "João Silva",
    "entryModelType": "Premium"
  }
]
```

## Benefícios Implementados

✅ **Navegação Bidirecional**: Revenue → Stand e Stand → Revenue  
✅ **Integridade de Dados**: Constraint UNIQUE garante relação 1:1  
✅ **Queries Otimizadas**: Uma consulta traz todos os dados relacionados  
✅ **TypeScript Type Safety**: Propriedades tipadas corretamente  
✅ **Documentação Completa**: Exemplos e casos de uso documentados

## Status: 🎯 IMPLEMENTADO COM SUCESSO

A relação bidirecional entre Revenue e Stand está completamente funcional e integrada ao sistema!
