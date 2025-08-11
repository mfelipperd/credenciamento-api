# Criação de Receita com Stand

## Endpoint atualizado

O endpoint `POST /finance/revenues` agora aceita o campo `standNumber` para vincular automaticamente a receita a um stand específico.

## Exemplo de uso

### 1. Primeiro, configure alguns stands para a feira

```bash
curl -X POST http://localhost:3000/finance/stands/configure \
  -H "Content-Type: application/json" \
  -d '{
    "fairId": 1,
    "quantity": 50,
    "price": 1500.00
  }'
```

### 2. Verificar stands disponíveis

```bash
curl -X GET "http://localhost:3000/finance/stands/available?fairId=1"
```

### 3. Criar receita com número do stand

```bash
curl -X POST http://localhost:3000/finance/revenues \
  -H "Content-Type: application/json" \
  -d '{
    "fairId": 1,
    "standNumber": 5,
    "clientId": 1,
    "description": "Venda de stand número 5",
    "totalAmount": 1500.00,
    "status": "ACTIVE",
    "paymentMethod": "CREDIT_CARD",
    "installmentCount": 3,
    "firstPaymentDate": "2025-02-15"
  }'
```

## Validações implementadas

1. **Stand existe**: Verifica se o stand com o número informado existe na feira especificada
2. **Stand disponível**: Verifica se o stand não está ocupado (`isAvailable = true`)
3. **Vinculação automática**: Ao criar a receita, o stand é automaticamente vinculado e marcado como ocupado

## Resposta esperada

```json
{
  "id": 1,
  "fairId": 1,
  "clientId": 1,
  "description": "Venda de stand número 5",
  "totalAmount": 1500.0,
  "status": "ACTIVE",
  "paymentMethod": "CREDIT_CARD",
  "installmentCount": 3,
  "firstPaymentDate": "2025-02-15T00:00:00.000Z",
  "createdAt": "2025-02-08T12:31:01.000Z",
  "updatedAt": "2025-02-08T12:31:01.000Z",
  "stand": {
    "id": 5,
    "standNumber": 5,
    "fairId": 1,
    "price": 1500.0,
    "isAvailable": false,
    "revenueId": 1,
    "createdAt": "2025-02-08T12:30:00.000Z",
    "updatedAt": "2025-02-08T12:31:01.000Z"
  },
  "installments": [
    {
      "id": 1,
      "installmentNumber": 1,
      "amount": 500.0,
      "dueDate": "2025-02-15T00:00:00.000Z",
      "status": "PENDING"
    },
    {
      "id": 2,
      "installmentNumber": 2,
      "amount": 500.0,
      "dueDate": "2025-03-15T00:00:00.000Z",
      "status": "PENDING"
    },
    {
      "id": 3,
      "installmentNumber": 3,
      "amount": 500.0,
      "dueDate": "2025-04-15T00:00:00.000Z",
      "status": "PENDING"
    }
  ]
}
```

## Erros possíveis

### Stand não encontrado

```json
{
  "statusCode": 400,
  "message": "Stand número 5 não encontrado na feira 1",
  "error": "Bad Request"
}
```

### Stand já ocupado

```json
{
  "statusCode": 400,
  "message": "Stand número 5 já está ocupado",
  "error": "Bad Request"
}
```

## Campos obrigatórios do CreateRevenueDto

- `fairId`: ID da feira
- `standNumber`: Número do stand (novo campo obrigatório)
- `clientId`: ID do cliente
- `description`: Descrição da receita
- `totalAmount`: Valor total
- `status`: Status da receita
- `paymentMethod`: Método de pagamento
- `installmentCount`: Número de parcelas
- `firstPaymentDate`: Data do primeiro pagamento
