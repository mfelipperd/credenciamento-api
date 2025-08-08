# API Endpoints - Módulo de Receitas

## 📡 Exemplos de Requests e Responses

### Base URL: `/api/finance`

---

## 🏢 Clientes (Globais)

### 1. Autocomplete de Clientes

```http
GET /api/finance/clients/autocomplete?q=acme
```

**Response 200:**

```json
[
  {
    "id": "client_1",
    "name": "ACME S/A",
    "cnpj": "12345678000195"
  },
  {
    "id": "client_2",
    "name": "ACME Distribuidora",
    "cnpj": "98765432000123"
  }
]
```

### 2. Criar Cliente

```http
POST /api/finance/clients
Content-Type: application/json

{
  "name": "ACME Corporation S/A",
  "cnpj": "12345678000195",
  "email": "contato@acme.com.br",
  "phone": "11999887766"
}
```

**Response 201:**

```json
{
  "id": "client_abc123",
  "name": "ACME Corporation S/A",
  "cnpj": "12345678000195",
  "email": "contato@acme.com.br",
  "phone": "11999887766",
  "createdAt": "2025-08-08T10:00:00.000Z",
  "updatedAt": "2025-08-08T10:00:00.000Z"
}
```

### 3. Listar Clientes Paginado

```http
GET /api/finance/clients/paginated?page=1&pageSize=20&q=acme
```

**Response 200:**

```json
{
  "items": [
    {
      "id": "client_1",
      "name": "ACME S/A",
      "cnpj": "12345678000195",
      "email": "contato@acme.com.br",
      "phone": "11999887766"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

---

## 🏗️ Modelos de Entrada

### 1. Listar Modelos por Feira

```http
GET /api/finance/entry-models?fairId=fair_123&active=true
```

**Response 200:**

```json
[
  {
    "id": "model_1",
    "fairId": "fair_123",
    "type": "STAND",
    "name": "Stand 3x3",
    "baseValue": 1500000,
    "costCents": 700000,
    "active": true
  },
  {
    "id": "model_2",
    "fairId": "fair_123",
    "type": "PATROCINIO",
    "name": "Patrocínio Gold",
    "baseValue": 5000000,
    "costCents": 1000000,
    "active": true
  }
]
```

### 2. Criar Modelo

```http
POST /api/finance/entry-models
Content-Type: application/json

{
  "fairId": "fair_123",
  "type": "STAND",
  "name": "Stand 3x3 Premium",
  "baseValue": 1800000,
  "costCents": 800000
}
```

**Response 201:**

```json
{
  "id": "model_new",
  "fairId": "fair_123",
  "type": "STAND",
  "name": "Stand 3x3 Premium",
  "baseValue": 1800000,
  "costCents": 800000,
  "active": true,
  "createdAt": "2025-08-08T10:00:00.000Z"
}
```

---

## 💰 Receitas (Contratos)

### 1. Listar Receitas Paginadas

```http
GET /api/finance/receitas?fairId=fair_123&page=1&pageSize=20&type=all&status=all&sortBy=status
```

**Response 200:**

```json
{
  "items": [
    {
      "id": "revenue_1",
      "type": "STAND",
      "status": "PENDENTE",
      "fairId": "fair_123",
      "client": {
        "id": "client_1",
        "name": "ACME S/A"
      },
      "entryModel": {
        "id": "model_1",
        "name": "Stand 3x3"
      },
      "baseValue": 1500000,
      "discountCents": 100000,
      "contractValue": 1400000,
      "paidCents": 0,
      "openCents": 1400000,
      "paymentMethod": "BOLETO",
      "nextDueDate": "2025-09-10T00:00:00-03:00",
      "createdAt": "2025-08-08T10:00:00-03:00"
    },
    {
      "id": "revenue_2",
      "type": "STAND",
      "status": "EM_ANDAMENTO",
      "fairId": "fair_123",
      "client": {
        "id": "client_2",
        "name": "Beta Distribuidora"
      },
      "entryModel": {
        "id": "model_1",
        "name": "Stand 3x3"
      },
      "baseValue": 1500000,
      "discountCents": 0,
      "contractValue": 1500000,
      "paidCents": 500000,
      "openCents": 1000000,
      "paymentMethod": "PIX",
      "nextDueDate": "2025-09-15T00:00:00-03:00",
      "createdAt": "2025-08-05T10:00:00-03:00"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 25,
  "totalPages": 2
}
```

### 2. Criar Receita (Contrato)

```http
POST /api/finance/receitas
Content-Type: application/json

{
  "fairId": "fair_123",
  "type": "STAND",
  "entryModelId": "model_1",
  "clientId": "client_1",
  "baseValue": 1500000,
  "discountCents": 100000,
  "contractValue": 1400000,
  "paymentMethod": "BOLETO",
  "condition": "parcelado",
  "notes": "Desconto promocional",
  "installments": {
    "count": 3,
    "firstDueDate": "2025-09-10",
    "periodicity": "MENSAL"
  }
}
```

**Response 201:**

```json
{
  "id": "revenue_new",
  "status": "PENDENTE",
  "fairId": "fair_123",
  "type": "STAND",
  "contractValue": 1400000,
  "installments": [
    {
      "id": "inst_1",
      "n": 1,
      "dueDate": "2025-09-10T00:00:00-03:00",
      "valueCents": 466666,
      "status": "A_VENCER"
    },
    {
      "id": "inst_2",
      "n": 2,
      "dueDate": "2025-10-10T00:00:00-03:00",
      "valueCents": 466667,
      "status": "A_VENCER"
    },
    {
      "id": "inst_3",
      "n": 3,
      "dueDate": "2025-11-10T00:00:00-03:00",
      "valueCents": 466667,
      "status": "A_VENCER"
    }
  ],
  "createdAt": "2025-08-08T10:00:00-03:00"
}
```

### 3. Detalhar Receita

```http
GET /api/finance/receitas/revenue_1
```

**Response 200:**

```json
{
  "id": "revenue_1",
  "fairId": "fair_123",
  "type": "STAND",
  "status": "EM_ANDAMENTO",
  "baseValue": 1500000,
  "discountCents": 100000,
  "contractValue": 1400000,
  "paymentMethod": "BOLETO",
  "condition": "parcelado",
  "notes": "Desconto promocional",
  "createdAt": "2025-08-08T10:00:00-03:00",
  "client": {
    "id": "client_1",
    "name": "ACME S/A",
    "cnpj": "12345678000195",
    "email": "contato@acme.com.br"
  },
  "entryModel": {
    "id": "model_1",
    "name": "Stand 3x3",
    "type": "STAND"
  },
  "installments": [
    {
      "id": "inst_1",
      "n": 1,
      "dueDate": "2025-09-10T00:00:00-03:00",
      "valueCents": 466666,
      "status": "PAGA",
      "paidAt": "2025-09-09T14:30:00-03:00",
      "proofUrl": "https://storage.example.com/comprovante1.pdf"
    },
    {
      "id": "inst_2",
      "n": 2,
      "dueDate": "2025-10-10T00:00:00-03:00",
      "valueCents": 466667,
      "status": "A_VENCER",
      "paidAt": null,
      "proofUrl": null
    },
    {
      "id": "inst_3",
      "n": 3,
      "dueDate": "2025-11-10T00:00:00-03:00",
      "valueCents": 466667,
      "status": "A_VENCER",
      "paidAt": null,
      "proofUrl": null
    }
  ],
  "attachments": [
    {
      "id": "att_1",
      "filename": "contrato_assinado.pdf",
      "url": "https://storage.example.com/contrato1.pdf",
      "mime": "application/pdf",
      "sizeBytes": 245760,
      "uploadedAt": "2025-08-08T10:05:00-03:00"
    }
  ]
}
```

### 4. KPIs (Cards da Tela)

```http
GET /api/finance/receitas/kpis?fairId=fair_123&from=2025-08-01&to=2025-08-31
```

**Response 200:**

```json
{
  "totalStandsVendidos": 15600000,
  "totalPatrocinios": 8500000,
  "totalPago": 7200000,
  "totalEstimado": 24100000
}
```

---

## 📊 Analytics (Gráficos ApexCharts)

### 1. Contratos por Período

```http
GET /api/finance/receitas/analytics/contratos-por-periodo?fairId=fair_123&from=2025-06-01&to=2025-08-31&granularity=month
```

**Response 200:**

```json
[
  {
    "period": "2025-06-01",
    "qtd": 8,
    "totalContrato": 12800000
  },
  {
    "period": "2025-07-01",
    "qtd": 12,
    "totalContrato": 19200000
  },
  {
    "period": "2025-08-01",
    "qtd": 6,
    "totalContrato": 9600000
  }
]
```

**Para ApexCharts:**

```javascript
// Transformar para ApexCharts
const chartData = {
  series: [
    {
      name: 'Quantidade',
      data: [8, 12, 6],
    },
    {
      name: 'Valor (R$)',
      data: [128000, 192000, 96000], // convertido para reais
    },
  ],
  categories: ['Jun 2025', 'Jul 2025', 'Ago 2025'],
};
```

### 2. Recebido por Período

```http
GET /api/finance/receitas/analytics/recebido-por-periodo?fairId=fair_123&from=2025-06-01&to=2025-08-31&granularity=month
```

**Response 200:**

```json
[
  {
    "period": "2025-06-01",
    "totalRecebido": 4200000
  },
  {
    "period": "2025-07-01",
    "totalRecebido": 7800000
  },
  {
    "period": "2025-08-01",
    "totalRecebido": 3200000
  }
]
```

### 3. Top Empresas

```http
GET /api/finance/receitas/analytics/top-empresas?fairId=fair_123&metric=contratado&limit=5
```

**Response 200:**

```json
[
  {
    "clientId": "client_1",
    "client": "ACME S/A",
    "totalContrato": 8500000
  },
  {
    "clientId": "client_2",
    "client": "Beta Distribuidora",
    "totalContrato": 6200000
  },
  {
    "clientId": "client_3",
    "client": "Gamma Corporation",
    "totalContrato": 4800000
  }
]
```

**Para ApexCharts (Horizontal Bar):**

```javascript
const topEmpresasChart = {
  series: [
    {
      name: 'Valor Contratado',
      data: [85000, 62000, 48000], // em reais
    },
  ],
  categories: ['ACME S/A', 'Beta Distribuidora', 'Gamma Corporation'],
};
```

### 4. Distribuição por Tipo (Pizza)

```http
GET /api/finance/receitas/analytics/por-tipo?fairId=fair_123&from=2025-06-01&to=2025-08-31
```

**Response 200:**

```json
[
  {
    "tipo": "STAND",
    "totalContrato": 28600000
  },
  {
    "tipo": "PATROCINIO",
    "totalContrato": 12400000
  }
]
```

**Para ApexCharts (Pie/Donut):**

```javascript
const tipoChart = {
  series: [286000, 124000], // em reais
  labels: ['Stands', 'Patrocínios'],
};
```

### 5. Distribuição por Modelo

```http
GET /api/finance/receitas/analytics/por-modelo?fairId=fair_123&tipo=STAND
```

**Response 200:**

```json
[
  {
    "modeloId": "model_1",
    "nome": "Stand 3x3",
    "totalContrato": 18200000
  },
  {
    "modeloId": "model_2",
    "nome": "Stand 4x4",
    "totalContrato": 10400000
  },
  {
    "modeloId": "model_3",
    "nome": "Stand 6x6",
    "totalContrato": 8500000
  }
]
```

---

## 💳 Operações de Parcelas

### 1. Baixar Parcela (Marcar como Paga)

```http
PATCH /api/finance/parcelas/inst_2/baixa
Content-Type: application/json

{
  "paidAt": "2025-08-08T15:30:00-03:00",
  "proofUrl": "https://storage.example.com/comprovante2.pdf"
}
```

**Response 200:**

```json
{
  "id": "inst_2",
  "n": 2,
  "revenueId": "revenue_1",
  "valueCents": 466667,
  "dueDate": "2025-10-10T00:00:00-03:00",
  "status": "PAGA",
  "paidAt": "2025-08-08T15:30:00-03:00",
  "proofUrl": "https://storage.example.com/comprovante2.pdf",
  "revenue": {
    "id": "revenue_1",
    "status": "EM_ANDAMENTO"
  }
}
```

### 2. Editar Parcela

```http
PUT /api/finance/parcelas/inst_3
Content-Type: application/json

{
  "dueDate": "2025-11-15T00:00:00-03:00",
  "valueCents": 500000
}
```

**Response 200:**

```json
{
  "id": "inst_3",
  "n": 3,
  "dueDate": "2025-11-15T00:00:00-03:00",
  "valueCents": 500000,
  "status": "A_VENCER"
}
```

### 3. Regenerar Parcelas

```http
POST /api/finance/receitas/revenue_1/parcelas/generate
Content-Type: application/json

{
  "count": 4,
  "firstDueDate": "2025-09-15",
  "periodicity": "MENSAL"
}
```

**Response 200:**

```json
{
  "message": "Parcelas regeneradas com sucesso",
  "installments": [
    {
      "id": "inst_new_1",
      "n": 1,
      "dueDate": "2025-09-15T00:00:00-03:00",
      "valueCents": 350000,
      "status": "A_VENCER"
    },
    {
      "id": "inst_new_2",
      "n": 2,
      "dueDate": "2025-10-15T00:00:00-03:00",
      "valueCents": 350000,
      "status": "A_VENCER"
    },
    {
      "id": "inst_new_3",
      "n": 3,
      "dueDate": "2025-11-15T00:00:00-03:00",
      "valueCents": 350000,
      "status": "A_VENCER"
    },
    {
      "id": "inst_new_4",
      "n": 4,
      "dueDate": "2025-12-15T00:00:00-03:00",
      "valueCents": 350000,
      "status": "A_VENCER"
    }
  ]
}
```

---

## 📎 Upload de Anexos

### 1. Upload de Anexo para Contrato

```http
POST /api/finance/receitas/revenue_1/attachments
Content-Type: multipart/form-data

file: [arquivo PDF ou imagem]
filename: "contrato_assinado.pdf"
```

**Response 201:**

```json
{
  "id": "att_new",
  "entityType": "revenue",
  "entityId": "revenue_1",
  "filename": "contrato_assinado.pdf",
  "url": "https://storage.example.com/finance/revenue_1/contrato_assinado.pdf",
  "mime": "application/pdf",
  "sizeBytes": 245760,
  "uploadedAt": "2025-08-08T16:00:00-03:00"
}
```

### 2. Upload de Anexo para Parcela

```http
POST /api/finance/parcelas/inst_1/attachments
Content-Type: multipart/form-data

file: [arquivo de comprovante]
filename: "comprovante_pagamento.jpg"
```

**Response 201:**

```json
{
  "id": "att_inst_1",
  "entityType": "installment",
  "entityId": "inst_1",
  "filename": "comprovante_pagamento.jpg",
  "url": "https://storage.example.com/finance/installments/inst_1/comprovante_pagamento.jpg",
  "mime": "image/jpeg",
  "sizeBytes": 1024000,
  "uploadedAt": "2025-08-08T16:05:00-03:00"
}
```

---

## ❌ Exemplos de Erros

### 1. Erro de Validação

```http
POST /api/finance/receitas
Content-Type: application/json

{
  "fairId": "fair_123",
  "baseValue": 1000000,
  "discountCents": 1500000,  // desconto maior que base
  "contractValue": -500000
}
```

**Response 400:**

```json
{
  "statusCode": 400,
  "message": "Desconto não pode ser maior que o valor base",
  "error": "Bad Request"
}
```

### 2. Não Autorizado

```http
GET /api/finance/receitas
Authorization: Bearer invalid_token
```

**Response 401:**

```json
{
  "statusCode": 401,
  "message": "Token inválido ou expirado",
  "error": "Unauthorized"
}
```

### 3. Permissão Negada

```http
GET /api/finance/receitas
Authorization: Bearer valid_token_but_not_admin
```

**Response 403:**

```json
{
  "statusCode": 403,
  "message": "Acesso negado. Apenas administradores podem acessar este recurso",
  "error": "Forbidden"
}
```

### 4. Recurso Não Encontrado

```http
GET /api/finance/receitas/invalid_id
```

**Response 404:**

```json
{
  "statusCode": 404,
  "message": "Receita não encontrada",
  "error": "Not Found"
}
```

---

## 🔄 Filtros e Ordenação

### Filtros Disponíveis na Listagem de Receitas:

- **fairId** (obrigatório): ID da feira
- **type**: `stand`, `patrocinio`, `all` (default: `all`)
- **status**: `pendente`, `em_andamento`, `em_atraso`, `pago`, `cancelado`, `all` (default: `all` mas oculta cancelados)
- **q**: Busca por nome da empresa (LIKE)
- **dateField**: `contrato`, `vencimento`, `pagamento` (default: `contrato`)
- **from/to**: Filtro de data no formato ISO (2025-08-01)
- **page**: Página (1-based, default: 1)
- **pageSize**: Itens por página (default: 20, max: 100)

### Ordenação FIXA:

1. Status (Pendente → Em andamento → Em atraso → Pago → Cancelado)
2. Próximo vencimento (ASC)
3. Nome da empresa (A-Z)

---

Estes exemplos cobrem todos os principais endpoints do módulo de receitas e podem ser usados como referência durante o desenvolvimento e testes da API.
