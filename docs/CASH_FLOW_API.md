# API de Fluxo de Caixa - Documentação

## Visão Geral

O módulo de fluxo de caixa consolida receitas e despesas para fornecer uma visão financeira completa de cada feira. Ele calcula automaticamente saldos, margens de lucro e fornece relatórios consolidados para análise de lucratividade.

## 🎯 **Funcionalidades Principais**

- **Cálculo Automático:** Receitas e despesas são calculadas automaticamente
- **Análise de Lucratividade:** Margem de lucro e saldo líquido por feira
- **Relatórios Consolidados:** Visão geral de todas as feiras
- **Análise de Tendências:** Evolução financeira ao longo do tempo
- **Comparação de Feiras:** Ranking de lucratividade entre feiras

## 🏗️ **Estrutura de Dados**

### Tabela: `finance_cash_flow`

- **id** (UUID, PK) - Identificador único
- **fairId** (UUID, FK) - Referência à feira
- **period** (date) - Período de referência (mês/ano)
- **totalRevenue** (decimal(15,2)) - Total de receitas
- **totalExpenses** (decimal(15,2)) - Total de despesas
- **netBalance** (decimal(15,2)) - Saldo líquido (receitas - despesas)
- **profitMargin** (decimal(5,2)) - Margem de lucro em porcentagem
- **notes** (text) - Observações sobre o período
- **createdAt** (timestamp) - Data de criação
- **updatedAt** (timestamp) - Data de última atualização

## 🚀 **Endpoints da API**

### **1. Operações CRUD Básicas**

#### Criar Fluxo de Caixa

```
POST /cash-flow
```

**Body:**

```json
{
  "fairId": "uuid-da-feira",
  "period": "2025-01-31",
  "totalRevenue": 15000.0,
  "totalExpenses": 8000.0,
  "notes": "Janeiro 2025 - Alta temporada"
}
```

**Resposta:**

```json
{
  "id": "uuid",
  "fairId": "uuid-da-feira",
  "period": "2025-01-31",
  "totalRevenue": 15000.0,
  "totalExpenses": 8000.0,
  "netBalance": 7000.0,
  "profitMargin": 46.67,
  "notes": "Janeiro 2025 - Alta temporada",
  "createdAt": "2025-01-31T00:00:00.000Z",
  "updatedAt": "2025-01-31T00:00:00.000Z"
}
```

#### Listar Todos os Fluxos

```
GET /cash-flow
```

#### Buscar por Feira

```
GET /cash-flow/fair/{fairId}
```

#### Buscar por Período

```
GET /cash-flow/period?startDate=2025-01-01&endDate=2025-12-31
```

#### Buscar Específico

```
GET /cash-flow/{id}
```

#### Atualizar

```
PATCH /cash-flow/{id}
```

#### Excluir

```
DELETE /cash-flow/{id}
```

### **2. Endpoints de Relatórios**

#### Relatório Consolidado por Feira

```
GET /cash-flow/report/consolidated/{fairId}
```

**Resposta:**

```json
{
  "fairId": "uuid",
  "totalRevenue": 15000.0,
  "totalExpenses": 8000.0,
  "netBalance": 7000.0,
  "profitMargin": 46.67,
  "isProfitable": true,
  "summary": "Feira lucrativa com margem de 46.67%"
}
```

#### Análise de Tendências

```
GET /cash-flow/report/trends/{fairId}?months=6
```

**Resposta:**

```json
{
  "periods": ["2024-08", "2024-09", "2024-10", "2024-11", "2024-12", "2025-01"],
  "revenues": [12000, 13500, 14200, 15800, 16800, 15000],
  "expenses": [7500, 8200, 8800, 9200, 9500, 8000],
  "balances": [4500, 5300, 5400, 6600, 7300, 7000],
  "trend": "increasing"
}
```

#### Comparação de Feiras

```
GET /cash-flow/report/compare?fairIds=uuid1,uuid2,uuid3
```

**Resposta:**

```json
[
  {
    "fairId": "uuid1",
    "totalRevenue": 15000.0,
    "totalExpenses": 8000.0,
    "netBalance": 7000.0,
    "profitMargin": 46.67,
    "rank": 1
  },
  {
    "fairId": "uuid2",
    "totalRevenue": 12000.0,
    "totalExpenses": 7500.0,
    "netBalance": 4500.0,
    "profitMargin": 37.5,
    "rank": 2
  }
]
```

### **3. Endpoints Especiais**

#### Cálculo Automático para Feira

```
POST /cash-flow/calculate/{fairId}
```

**Body:**

```json
{
  "period": "2025-01-31",
  "notes": "Cálculo automático janeiro 2025"
}
```

#### Dashboard - Resumo Geral

```
GET /cash-flow/dashboard/summary
```

#### Análise de Lucratividade

```
GET /cash-flow/analysis/profitability
```

## 📊 **Cálculos Automáticos**

### **Saldo Líquido**

```
netBalance = totalRevenue - totalExpenses
```

### **Margem de Lucro**

```
profitMargin = (netBalance / totalRevenue) * 100
```

### **Indicadores de Lucratividade**

- **Lucrativa:** `netBalance > 0`
- **Prejuízo:** `netBalance < 0`
- **Equilibrada:** `netBalance = 0`

## 🔍 **Casos de Uso**

### **1. Análise Mensal de Feira**

```bash
# Obter fluxo de caixa de janeiro 2025
curl "http://localhost:3000/cash-flow/fair/uuid-feira"
```

### **2. Relatório Consolidado**

```bash
# Gerar relatório completo da feira
curl "http://localhost:3000/cash-flow/report/consolidated/uuid-feira"
```

### **3. Análise de Tendências**

```bash
# Analisar evolução dos últimos 12 meses
curl "http://localhost:3000/cash-flow/report/trends/uuid-feira?months=12"
```

### **4. Comparação Entre Feiras**

```bash
# Comparar lucratividade de 3 feiras
curl "http://localhost:3000/cash-flow/report/compare?fairIds=uuid1,uuid2,uuid3"
```

### **5. Cálculo Automático**

```bash
# Calcular automaticamente para uma feira
curl -X POST "http://localhost:3000/cash-flow/calculate/uuid-feira" \
  -H "Content-Type: application/json" \
  -d '{"period": "2025-01-31", "notes": "Janeiro 2025"}'
```

## 📈 **Exemplos de Respostas**

### **Feira Lucrativa**

```json
{
  "id": "uuid",
  "fairId": "uuid-feira",
  "period": "2025-01-31",
  "totalRevenue": 15000.0,
  "totalExpenses": 8000.0,
  "netBalance": 7000.0,
  "profitMargin": 46.67,
  "isProfitable": true,
  "balanceFormatted": "+R$ 7000.00",
  "profitMarginFormatted": "46.67%"
}
```

### **Feira com Prejuízo**

```json
{
  "id": "uuid",
  "fairId": "uuid-feira",
  "period": "2025-01-31",
  "totalRevenue": 8000.0,
  "totalExpenses": 12000.0,
  "netBalance": -4000.0,
  "profitMargin": -50.0,
  "isProfitable": false,
  "balanceFormatted": "-R$ 4000.00",
  "profitMarginFormatted": "-50.00%"
}
```

## ⚠️ **Validações e Regras**

### **Campos Obrigatórios**

- `fairId` - UUID válido de feira existente
- `period` - Data válida no formato YYYY-MM-DD

### **Campos Opcionais**

- `totalRevenue` - Se não fornecido, calcula automaticamente
- `totalExpenses` - Se não fornecido, calcula automaticamente
- `notes` - Observações sobre o período

### **Regras de Negócio**

1. **Cálculo Automático:** Se receitas/despesas não forem fornecidas, são calculadas automaticamente
2. **Saldo Líquido:** Sempre calculado como receitas - despesas
3. **Margem de Lucro:** Calculada automaticamente baseada no saldo e receitas
4. **Integridade:** Não é possível excluir fluxo de caixa de feira ativa

## 🚀 **Próximas Funcionalidades**

- [ ] Exportação para Excel/PDF
- [ ] Gráficos e visualizações
- [ ] Alertas de prejuízo
- [ ] Projeções financeiras
- [ ] Integração com sistemas externos
- [ ] Cache para relatórios frequentes
- [ ] Notificações de mudanças significativas

## 🔧 **Configuração**

### **Variáveis de Ambiente**

```env
# Configurações de cache (opcional)
CASH_FLOW_CACHE_TTL=3600
CASH_FLOW_CACHE_MAX_ITEMS=1000
```

### **Dependências**

- Módulo de Despesas (`ExpensesModule`)
- Módulo de Receitas (`RevenuesModule`)
- Módulo de Feiras (`Fair` entity)

---

_Esta API fornece uma visão completa e consolidada do fluxo financeiro de todas as feiras, permitindo análise de lucratividade e tomada de decisões estratégicas._
