# 📊 API de Gráficos para Receitas - Documentação Completa

## 📋 Visão Geral

Esta documentação descreve os endpoints necessários para gerar gráficos e relatórios visuais do módulo de receitas. Os endpoints seguem o padrão do módulo dashboard existente e fornecem dados otimizados para diferentes tipos de visualizações.

## 🚨 Status Atual: **IMPLEMENTADO** ✅

> ✅ **Importante**: Os endpoints de gráficos foram implementados e estão funcionais! O servidor está rodando e os endpoints estão disponíveis.

---

## 📈 **1. Receitas por Status**

### **Endpoint**

```
GET /finance/revenues/charts/by-status
```

### **Parâmetros**

| Parâmetro | Tipo   | Obrigatório | Descrição              |
| --------- | ------ | ----------- | ---------------------- |
| `fairId`  | string | ✅          | ID da feira específica |

### **Tipo de Gráfico Recomendado**

- 🥧 **Gráfico de Pizza** ou **Donut Chart**

### **Resposta**

```json
{
  "fairId": "feira-123",
  "data": {
    "PENDENTE": {
      "count": 15,
      "totalValue": 750000,
      "percentage": 28.3
    },
    "EM_ANDAMENTO": {
      "count": 8,
      "totalValue": 400000,
      "percentage": 15.1
    },
    "EM_ATRASO": {
      "count": 3,
      "totalValue": 150000,
      "percentage": 5.7
    },
    "PAGO": {
      "count": 25,
      "totalValue": 1250000,
      "percentage": 47.2
    },
    "CANCELADO": {
      "count": 2,
      "totalValue": 100000,
      "percentage": 3.8
    }
  },
  "summary": {
    "totalRevenues": 53,
    "totalValue": 2650000,
    "paidPercentage": 47.2,
    "overduePercentage": 5.7
  }
}
```

---

## 💳 **2. Receitas por Método de Pagamento**

### **Endpoint**

```
GET /finance/revenues/charts/by-payment-method
```

### **Parâmetros**

| Parâmetro | Tipo   | Obrigatório | Descrição              |
| --------- | ------ | ----------- | ---------------------- |
| `fairId`  | string | ✅          | ID da feira específica |

### **Tipo de Gráfico Recomendado**

- 📊 **Gráfico de Barras Verticais** ou **Gráfico de Colunas**

### **Resposta**

```json
{
  "fairId": "feira-123",
  "data": {
    "PIX": {
      "count": 20,
      "totalValue": 1500000,
      "percentage": 37.7,
      "averageValue": 75000
    },
    "BOLETO": {
      "count": 15,
      "totalValue": 2000000,
      "percentage": 28.3,
      "averageValue": 133333
    },
    "CARTAO": {
      "count": 10,
      "totalValue": 800000,
      "percentage": 18.9,
      "averageValue": 80000
    },
    "TED": {
      "count": 5,
      "totalValue": 500000,
      "percentage": 9.4,
      "averageValue": 100000
    },
    "DINHEIRO": {
      "count": 3,
      "totalValue": 300000,
      "percentage": 5.7,
      "averageValue": 100000
    }
  },
  "summary": {
    "totalRevenues": 53,
    "totalValue": 5100000,
    "mostUsedMethod": "PIX",
    "highestValueMethod": "BOLETO"
  }
}
```

---

## 📅 **3. Receitas por Período**

### **Endpoint**

```
GET /finance/revenues/charts/by-period
```

### **Parâmetros**

| Parâmetro   | Tipo   | Obrigatório | Descrição                                        |
| ----------- | ------ | ----------- | ------------------------------------------------ |
| `fairId`    | string | ✅          | ID da feira específica                           |
| `period`    | string | ❌          | `daily`, `weekly`, `monthly` (padrão: `monthly`) |
| `startDate` | string | ❌          | Data inicial (ISO format)                        |
| `endDate`   | string | ❌          | Data final (ISO format)                          |

### **Tipo de Gráfico Recomendado**

- 📈 **Gráfico de Linha** ou **Gráfico de Área** ou **Gráfico de Barras**

### **Resposta (period=monthly)**

```json
{
  "fairId": "feira-123",
  "period": "monthly",
  "data": [
    {
      "period": "2025-01",
      "periodLabel": "Janeiro 2025",
      "count": 5,
      "totalValue": 500000,
      "paidValue": 300000,
      "pendingValue": 200000,
      "overdueValue": 0,
      "revenueGrowth": 15.2
    },
    {
      "period": "2025-02",
      "periodLabel": "Fevereiro 2025",
      "count": 8,
      "totalValue": 750000,
      "paidValue": 450000,
      "pendingValue": 250000,
      "overdueValue": 50000,
      "revenueGrowth": 50.0
    },
    {
      "period": "2025-03",
      "periodLabel": "Março 2025",
      "count": 12,
      "totalValue": 1200000,
      "paidValue": 800000,
      "pendingValue": 300000,
      "overdueValue": 100000,
      "revenueGrowth": 60.0
    }
  ],
  "summary": {
    "totalPeriods": 3,
    "averageRevenuePerPeriod": 816667,
    "bestPeriod": {
      "period": "2025-03",
      "value": 1200000
    },
    "overallGrowth": 140.0
  }
}
```

---

## ⏰ **4. Análise de Parcelas em Atraso**

### **Endpoint**

```
GET /finance/revenues/charts/overdue-installments
```

### **Parâmetros**

| Parâmetro | Tipo   | Obrigatório | Descrição              |
| --------- | ------ | ----------- | ---------------------- |
| `fairId`  | string | ✅          | ID da feira específica |

### **Tipo de Gráfico Recomendado**

- ⚠️ **Gráfico de Área** ou **Gráfico de Barras Empilhadas**

### **Resposta**

```json
{
  "fairId": "feira-123",
  "data": {
    "overview": {
      "totalInstallments": 125,
      "overdueInstallments": 15,
      "overduePercentage": 12.0,
      "totalOverdueValue": 850000
    },
    "byAgeRange": {
      "1-30_days": {
        "count": 8,
        "value": 450000,
        "percentage": 52.9,
        "avgDaysOverdue": 15
      },
      "31-60_days": {
        "count": 5,
        "value": 300000,
        "percentage": 35.3,
        "avgDaysOverdue": 45
      },
      "61-90_days": {
        "count": 2,
        "value": 100000,
        "percentage": 11.8,
        "avgDaysOverdue": 75
      },
      "90+_days": {
        "count": 0,
        "value": 0,
        "percentage": 0,
        "avgDaysOverdue": 0
      }
    },
    "byPaymentMethod": {
      "BOLETO": {
        "count": 8,
        "value": 500000,
        "percentage": 58.8
      },
      "PIX": {
        "count": 4,
        "value": 250000,
        "percentage": 29.4
      },
      "CARTAO": {
        "count": 3,
        "value": 100000,
        "percentage": 11.8
      }
    }
  },
  "trends": {
    "averageDaysToOverdue": 32,
    "criticalInstallments": 2,
    "recoveryRate": 85.5
  }
}
```

---

## 👥 **5. Top Clientes por Receita**

### **Endpoint**

```
GET /finance/revenues/charts/top-clients
```

### **Parâmetros**

| Parâmetro | Tipo   | Obrigatório | Descrição                                |
| --------- | ------ | ----------- | ---------------------------------------- |
| `fairId`  | string | ✅          | ID da feira específica                   |
| `limit`   | number | ❌          | Número de clientes (padrão: 10, máx: 50) |

### **Tipo de Gráfico Recomendado**

- 📊 **Gráfico de Barras Horizontais** ou **Ranking List**

### **Resposta**

```json
{
  "fairId": "feira-123",
  "limit": 10,
  "data": [
    {
      "rank": 1,
      "clientId": "client-1",
      "clientName": "Empresa Alpha Ltda",
      "clientCnpj": "12.345.678/0001-90",
      "totalValue": 2500000,
      "revenueCount": 5,
      "averageRevenueValue": 500000,
      "paidPercentage": 80.0,
      "lastRevenueDate": "2025-08-01T10:30:00Z"
    },
    {
      "rank": 2,
      "clientId": "client-2",
      "clientName": "Beta Corporation",
      "clientCnpj": "98.765.432/0001-10",
      "totalValue": 1800000,
      "revenueCount": 3,
      "averageRevenueValue": 600000,
      "paidPercentage": 100.0,
      "lastRevenueDate": "2025-07-25T14:15:00Z"
    }
  ],
  "summary": {
    "totalClients": 45,
    "topClientsValue": 12500000,
    "topClientsPercentage": 78.5,
    "averageClientValue": 278888
  }
}
```

---

## 🎯 **6. Análise de Conversão de Parcelas**

### **Endpoint**

```
GET /finance/revenues/charts/installment-conversion
```

### **Parâmetros**

| Parâmetro | Tipo   | Obrigatório | Descrição              |
| --------- | ------ | ----------- | ---------------------- |
| `fairId`  | string | ✅          | ID da feira específica |

### **Tipo de Gráfico Recomendado**

- 🌊 **Gráfico de Funil** ou **Gráfico de Barras Empilhadas**

### **Resposta**

```json
{
  "fairId": "feira-123",
  "data": {
    "funnel": {
      "totalInstallments": 150,
      "paidInstallments": 95,
      "pendingInstallments": 30,
      "overdueInstallments": 25,
      "canceledInstallments": 0
    },
    "conversionRates": {
      "paidRate": 63.33,
      "pendingRate": 20.0,
      "overdueRate": 16.67,
      "canceledRate": 0.0,
      "onTimePaymentRate": 75.8
    },
    "byInstallmentNumber": [
      {
        "installmentNumber": 1,
        "total": 50,
        "paid": 40,
        "pending": 5,
        "overdue": 5,
        "conversionRate": 80.0
      },
      {
        "installmentNumber": 2,
        "total": 45,
        "paid": 30,
        "pending": 10,
        "overdue": 5,
        "conversionRate": 66.7
      },
      {
        "installmentNumber": 3,
        "total": 35,
        "paid": 20,
        "pending": 10,
        "overdue": 5,
        "conversionRate": 57.1
      }
    ]
  },
  "insights": {
    "bestInstallmentRate": 1,
    "worstInstallmentRate": 3,
    "averageConversionRate": 68.0,
    "recommendedActions": [
      "Foco em cobrança da 3ª parcela",
      "Incentivos para pagamento antecipado",
      "Revisão de estratégia para parcelas maiores"
    ]
  }
}
```

---

## 📊 **7. Dashboard Resumo Executivo**

### **Endpoint**

```
GET /finance/revenues/charts/executive-summary
```

### **Parâmetros**

| Parâmetro | Tipo   | Obrigatório | Descrição              |
| --------- | ------ | ----------- | ---------------------- |
| `fairId`  | string | ✅          | ID da feira específica |

### **Tipo de Gráfico Recomendado**

- 📋 **Cards de KPIs** + **Mini Charts**

### **Resposta**

```json
{
  "fairId": "feira-123",
  "generatedAt": "2025-08-08T10:30:00Z",
  "data": {
    "kpis": {
      "totalRevenues": {
        "value": 53,
        "change": 15.2,
        "changeType": "increase",
        "period": "vs_last_month"
      },
      "totalValue": {
        "value": 5100000,
        "formatted": "R$ 51.000,00",
        "change": 22.5,
        "changeType": "increase",
        "period": "vs_last_month"
      },
      "averageRevenueValue": {
        "value": 96226,
        "formatted": "R$ 962,26",
        "change": 5.8,
        "changeType": "increase",
        "period": "vs_last_month"
      },
      "conversionRate": {
        "value": 47.2,
        "formatted": "47,2%",
        "change": -2.1,
        "changeType": "decrease",
        "period": "vs_last_month"
      }
    },
    "quickStats": {
      "paidRevenues": 25,
      "pendingRevenues": 15,
      "overdueRevenues": 3,
      "totalInstallments": 150,
      "paidInstallments": 95,
      "overdueInstallments": 25,
      "averageInstallments": 2.8
    },
    "alerts": [
      {
        "type": "warning",
        "title": "Parcelas em Atraso",
        "message": "15 parcelas estão em atraso (R$ 85.000,00)",
        "priority": "high"
      },
      {
        "type": "info",
        "title": "Meta Mensal",
        "message": "Faltam R$ 150.000,00 para atingir a meta",
        "priority": "medium"
      }
    ]
  }
}
```

---

## 🛠️ **Implementação Técnica**

### **Controller Sugerido**

```typescript
@Controller('finance/revenues/charts')
@ApiTags('Gráficos de Receitas')
export class RevenueChartsController {
  constructor(private readonly revenueChartsService: RevenueChartsService) {}

  @Get('by-status')
  async getRevenuesByStatus(@Query('fairId') fairId: string) {}

  @Get('by-payment-method')
  async getRevenuesByPaymentMethod(@Query('fairId') fairId: string) {}

  @Get('by-period')
  async getRevenuesByPeriod(
    @Query('fairId') fairId: string,
    @Query('period') period: string = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {}

  @Get('overdue-installments')
  async getOverdueInstallments(@Query('fairId') fairId: string) {}

  @Get('top-clients')
  async getTopClients(
    @Query('fairId') fairId: string,
    @Query('limit') limit: number = 10,
  ) {}

  @Get('installment-conversion')
  async getInstallmentConversion(@Query('fairId') fairId: string) {}

  @Get('executive-summary')
  async getExecutiveSummary(@Query('fairId') fairId: string) {}
}
```

### **Service Sugerido**

```typescript
@Injectable()
export class RevenueChartsService {
  constructor(
    @InjectRepository(Revenue)
    private revenueRepository: Repository<Revenue>,
    @InjectRepository(RevenueInstallment)
    private installmentRepository: Repository<RevenueInstallment>,
  ) {}

  async getRevenuesByStatus(fairId: string) {
    // Implementação com TypeORM query builder
  }

  // ... outros métodos
}
```

---

## 🎨 **Tipos de Gráficos Frontend**

### **Biblioteca Recomendada: Chart.js ou Recharts**

#### **1. Gráfico de Pizza (Status)**

```typescript
import { Pie } from 'react-chartjs-2';

const statusData = {
  labels: ['Pendente', 'Em Andamento', 'Pago', 'Em Atraso', 'Cancelado'],
  datasets: [
    {
      data: [15, 8, 25, 3, 2],
      backgroundColor: ['#fbbf24', '#3b82f6', '#10b981', '#ef4444', '#6b7280'],
    },
  ],
};
```

#### **2. Gráfico de Barras (Métodos de Pagamento)**

```typescript
import { Bar } from 'react-chartjs-2';

const paymentMethodData = {
  labels: ['PIX', 'Boleto', 'Cartão', 'TED', 'Dinheiro'],
  datasets: [
    {
      label: 'Receitas',
      data: [20, 15, 10, 5, 3],
      backgroundColor: '#3b82f6',
    },
  ],
};
```

#### **3. Gráfico de Linha (Período)**

```typescript
import { Line } from 'react-chartjs-2';

const periodData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
  datasets: [
    {
      label: 'Receitas por Mês',
      data: [5, 8, 12, 15, 18],
      borderColor: '#10b981',
      tension: 0.4,
    },
  ],
};
```

---

## 🔄 **Próximos Passos**

### **Para Implementar:**

1. **Criar RevenueChartsController**
2. **Criar RevenueChartsService**
3. **Implementar queries TypeORM otimizadas**
4. **Adicionar DTOs de resposta**
5. **Implementar validações**
6. **Adicionar documentação Swagger**
7. **Criar testes unitários**
8. **Implementar cache para performance**

### **Para Frontend:**

1. **Instalar biblioteca de gráficos**
2. **Criar componentes de gráfico**
3. **Implementar hooks para dados**
4. **Adicionar responsividade**
5. **Implementar exportação de gráficos**

---

## 🎯 **Prioridade Recomendada**

### **Implementação em Fases:**

**Fase 1 (Essencial):**

- ✅ Receitas por Status
- ✅ Executive Summary
- ✅ Top Clientes

**Fase 2 (Importante):**

- ✅ Receitas por Método de Pagamento
- ✅ Parcelas em Atraso

**Fase 3 (Avançado):**

- ✅ Receitas por Período
- ✅ Análise de Conversão

---

**Esta documentação serve como guia completo para implementação dos endpoints de gráficos do módulo de receitas. Todos os endpoints seguem o padrão REST e fornecem dados estruturados para diferentes tipos de visualizações.**
