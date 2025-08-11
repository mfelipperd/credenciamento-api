# Atualização da Listagem de Stands

## Resumo das Mudanças

A listagem de stands foi expandida para incluir informações detalhadas da receita associada quando o stand estiver ocupado, permitindo ao frontend exibir status de pagamento, dados do cliente e outras informações relevantes.

## Campos Adicionados ao StandResponseDto

### Dados do Cliente (quando stand está ocupado):

- `clientName`: Nome do cliente
- `clientEmail`: Email do cliente
- `clientPhone`: Telefone do cliente
- `clientCnpj`: CNPJ do cliente

### Dados da Receita (quando stand está ocupado):

- `revenueStatus`: Status do pagamento (PENDENTE, EM_ANDAMENTO, EM_ATRASO, PAGO, CANCELADO)
- `paymentMethod`: Método de pagamento (PIX, BOLETO, CARTAO, TED, DINHEIRO)
- `contractValue`: Valor do contrato em centavos
- `numberOfInstallments`: Número de parcelas
- `condition`: Condições especiais de pagamento
- `notes`: Observações da receita
- `revenueCreatedAt`: Data de criação da receita

### Dados do Entry Model:

- `entryModelName`: Nome do tipo de stand
- `entryModelBaseValue`: Valor base do entry model em centavos

## Endpoints Atualizados

### 1. `GET /finance/stands?fairId={uuid}`

**Descrição**: Lista todos os stands de uma feira com informações completas da receita

**Resposta Exemplo**:

```json
[
  {
    "id": 1,
    "standNumber": 15,
    "fairId": "123e4567-e89b-12d3-a456-426614174000",
    "isAvailable": false,
    "revenueId": "987fcdeb-51a2-43d1-b456-123456789abc",

    // Dados do cliente
    "clientName": "Empresa ABC Ltda",
    "clientEmail": "contato@empresaabc.com",
    "clientPhone": "(11) 99999-9999",
    "clientCnpj": "12.345.678/0001-90",

    // Dados da receita
    "revenueStatus": "EM_ANDAMENTO",
    "paymentMethod": "PIX",
    "contractValue": 250000,
    "numberOfInstallments": 3,
    "condition": "Desconto de 10% para pagamento à vista",
    "notes": "Cliente solicitou posição específica no evento",
    "revenueCreatedAt": "2024-01-15T10:30:00Z",

    // Dados do entry model
    "entryModelName": "Stand Premium 3x3",
    "entryModelBaseValue": 280000
  },
  {
    "id": 2,
    "standNumber": 16,
    "fairId": "123e4567-e89b-12d3-a456-426614174000",
    "isAvailable": true,
    "revenueId": null
    // Campos de receita serão null/undefined para stands disponíveis
  }
]
```

### 2. `GET /finance/stands/occupied?fairId={uuid}`

**Descrição**: Lista apenas stands ocupados com todas as informações da receita

### 3. `GET /finance/stands/{id}`

**Descrição**: Busca um stand específico com informações completas da receita

## Status de Pagamento Disponíveis

```typescript
enum RevenueStatus {
  PENDENTE = 'PENDENTE', // Aguardando pagamento
  EM_ANDAMENTO = 'EM_ANDAMENTO', // Pagamento parcial
  EM_ATRASO = 'EM_ATRASO', // Possui parcelas vencidas
  PAGO = 'PAGO', // Totalmente pago
  CANCELADO = 'CANCELADO', // Cancelado
}
```

## Métodos de Pagamento Disponíveis

```typescript
enum PaymentMethod {
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CARTAO = 'CARTAO',
  TED = 'TED',
  DINHEIRO = 'DINHEIRO',
}
```

## Casos de Uso para o Frontend

### 1. Dashboard de Stands

```javascript
// Exibir grid de stands com cores baseadas no status
const getStandColor = (stand) => {
  if (stand.isAvailable) return 'green'; // Disponível

  switch (stand.revenueStatus) {
    case 'PAGO':
      return 'blue'; // Pago
    case 'EM_ANDAMENTO':
      return 'yellow'; // Parcial
    case 'EM_ATRASO':
      return 'red'; // Atrasado
    case 'PENDENTE':
      return 'orange'; // Pendente
    case 'CANCELADO':
      return 'gray'; // Cancelado
    default:
      return 'gray';
  }
};
```

### 2. Tooltip com Informações Detalhadas

```javascript
const getStandTooltip = (stand) => {
  if (stand.isAvailable) {
    return `Stand ${stand.standNumber} - Disponível`;
  }

  return `
    Stand ${stand.standNumber} - ${stand.clientName}
    Status: ${stand.revenueStatus}
    Valor: R$ ${(stand.contractValue / 100).toFixed(2)}
    Parcelas: ${stand.numberOfInstallments}
    Contato: ${stand.clientPhone}
  `;
};
```

### 3. Lista de Stands Ocupados com Filtros

```javascript
// Filtrar por status de pagamento
const filteredStands = stands.filter(
  (stand) => !stand.isAvailable && stand.revenueStatus === 'EM_ATRASO',
);

// Filtrar por método de pagamento
const pixStands = stands.filter((stand) => stand.paymentMethod === 'PIX');
```

### 4. Relatórios e Estatísticas

```javascript
// Calcular valor total por status
const totalByStatus = stands.reduce((acc, stand) => {
  if (!stand.isAvailable) {
    const status = stand.revenueStatus;
    acc[status] = (acc[status] || 0) + stand.contractValue;
  }
  return acc;
}, {});

// Listar clientes em atraso
const clientsInDelay = stands
  .filter((stand) => stand.revenueStatus === 'EM_ATRASO')
  .map((stand) => ({
    standNumber: stand.standNumber,
    clientName: stand.clientName,
    clientPhone: stand.clientPhone,
    clientEmail: stand.clientEmail,
    contractValue: stand.contractValue,
  }));
```

## Integração com Sistema de Cobrança

Com essas informações, o frontend pode:

1. **Identificar clientes em atraso** para follow-up
2. **Exibir status visual** dos stands no mapa da feira
3. **Gerar relatórios financeiros** por status de pagamento
4. **Facilitar contato** com clientes (telefone/email disponível)
5. **Mostrar informações contratuais** completas

## Considerações de Performance

- Todos os dados são carregados em uma única consulta com JOINs otimizados
- Use cache do lado do cliente quando apropriado
- Para feiras com muitos stands (>1000), considere implementar paginação

## Próximos Passos Sugeridos

1. Implementar cache Redis para consultas frequentes
2. Adicionar filtros por status no endpoint
3. Criar endpoint de estatísticas agregadas
4. Implementar notificações para mudanças de status
