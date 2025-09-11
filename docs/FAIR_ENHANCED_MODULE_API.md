# 📊 Módulo de Feiras Aprimorado - API Documentation

## Visão Geral

O módulo de feiras foi completamente reformulado para incluir análise de margem de lucro, configuração dinâmica de stands e insights de negócio. Agora é possível configurar diferentes tipos de stands, analisar lucratividade e receber recomendações automáticas para maximizar o lucro.

## 🏗️ Estrutura do Módulo

### Entidades Principais

#### 1. **Fair (Feira)**
```typescript
{
  id: string;                    // UUID da feira
  name: string;                  // Nome da feira
  location: string;              // Local da feira
  address?: string;              // Endereço completo
  city?: string;                 // Cidade
  state?: string;                // Estado
  zipCode?: string;              // CEP
  country?: string;              // País
  date: Date;                    // Data de início
  endDate?: Date;                // Data de fim (para feiras de múltiplos dias)
  startTime?: string;            // Horário de início (HH:mm)
  endTime?: string;              // Horário de fim (HH:mm)
  startDateTime?: Date;          // Data/hora de início
  endDateTime?: Date;            // Data/hora de fim
  
  // Configurações de stands
  totalStands: number;           // Quantidade total de stands
  costPerSquareMeter: number;    // Custo base por m²
  setupCostPerSquareMeter: number; // Custo de montagem por m²
  
  // Análise de margem
  expectedRevenue: number;       // Receita esperada
  expectedProfit: number;        // Lucro esperado
  expectedProfitMargin: number;  // Margem de lucro esperada (%)
  insights: string;              // JSON com insights de negócio
  isActive: boolean;             // Status ativo/inativo
  createdAt: Date;               // Data de criação
}
```

#### 2. **StandConfiguration (Configuração de Stand)**
```typescript
{
  id: string;                    // UUID da configuração
  fairId: string;                // ID da feira
  name: string;                  // Nome (ex: "Stand 2x3")
  width: number;                 // Largura em metros
  height: number;                // Altura em metros
  quantity: number;              // Quantidade disponível
  pricePerSquareMeter: number;   // Preço por m²
  setupCostPerSquareMeter: number; // Custo de montagem por m²
  
  // Campos calculados automaticamente
  totalPrice: number;            // Preço total (área × preço/m²)
  totalSetupCost: number;        // Custo total de montagem
  profitPerStand: number;        // Lucro por stand
  profitMargin: number;          // Margem de lucro (%)
  
  description?: string;          // Descrição do stand
  isActive: boolean;             // Status ativo/inativo
  createdAt: Date;               // Data de criação
  updatedAt: Date;               // Data de atualização
}
```

## 🚀 Endpoints da API

### **Configurações de Stands**

#### 1. Criar Configuração de Stand
```http
POST /stand-configurations/fair/:fairId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Stand 2x3",
  "width": 2,
  "height": 3,
  "quantity": 10,
  "pricePerSquareMeter": 150.00,
  "setupCostPerSquareMeter": 50.00,
  "description": "Stand padrão 2x3 metros, ideal para pequenas empresas",
  "isActive": true
}
```

**Resposta:**
```json
{
  "id": "uuid-configuracao",
  "fairId": "uuid-feira",
  "name": "Stand 2x3",
  "width": 2,
  "height": 3,
  "quantity": 10,
  "pricePerSquareMeter": 150.00,
  "setupCostPerSquareMeter": 50.00,
  "totalPrice": 900.00,
  "totalSetupCost": 300.00,
  "profitPerStand": 600.00,
  "profitMargin": 66.67,
  "description": "Stand padrão 2x3 metros, ideal para pequenas empresas",
  "isActive": true,
  "createdAt": "2024-01-31T10:00:00.000Z",
  "updatedAt": "2024-01-31T10:00:00.000Z"
}
```

#### 2. Listar Configurações de uma Feira
```http
GET /stand-configurations/fair/:fairId
Authorization: Bearer <token>
```

**Resposta:**
```json
[
  {
    "id": "uuid-config-1",
    "fairId": "uuid-feira",
    "name": "Stand 2x3",
    "width": 2,
    "height": 3,
    "quantity": 10,
    "pricePerSquareMeter": 150.00,
    "setupCostPerSquareMeter": 50.00,
    "totalPrice": 900.00,
    "totalSetupCost": 300.00,
    "profitPerStand": 600.00,
    "profitMargin": 66.67,
    "isActive": true,
    "createdAt": "2024-01-31T10:00:00.000Z",
    "updatedAt": "2024-01-31T10:00:00.000Z"
  },
  {
    "id": "uuid-config-2",
    "fairId": "uuid-feira",
    "name": "Stand 3x3",
    "width": 3,
    "height": 3,
    "quantity": 5,
    "pricePerSquareMeter": 140.00,
    "setupCostPerSquareMeter": 45.00,
    "totalPrice": 1260.00,
    "totalSetupCost": 405.00,
    "profitPerStand": 855.00,
    "profitMargin": 67.86,
    "isActive": true,
    "createdAt": "2024-01-31T10:05:00.000Z",
    "updatedAt": "2024-01-31T10:05:00.000Z"
  }
]
```

#### 3. Obter Estatísticas das Configurações
```http
GET /stand-configurations/fair/:fairId/statistics
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "totalConfigurations": 2,
  "totalStands": 15,
  "totalArea": 135,
  "averagePricePerSquareMeter": 145.00,
  "averageProfitMargin": 67.27,
  "mostProfitable": {
    "id": "uuid-config-2",
    "name": "Stand 3x3",
    "profitMargin": 67.86
  },
  "leastProfitable": {
    "id": "uuid-config-1",
    "name": "Stand 2x3",
    "profitMargin": 66.67
  }
}
```

#### 4. Atualizar Configuração
```http
PATCH /stand-configurations/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 15,
  "pricePerSquareMeter": 160.00
}
```

#### 5. Ativar/Desativar Configuração
```http
PATCH /stand-configurations/:id/toggle-active
Authorization: Bearer <token>
```

#### 6. Remover Configuração
```http
DELETE /stand-configurations/:id
Authorization: Bearer <token>
```

### **Análise de Feiras**

#### 1. Análise Completa da Feira
```http
GET /fair-analysis/fair/:fairId
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "fairId": "uuid-feira",
  "totalStands": 15,
  "totalArea": 135,
  "totalRevenue": 18900.00,
  "totalCosts": 6300.00,
  "totalProfit": 12600.00,
  "profitMargin": 66.67,
  "averagePricePerSquareMeter": 145.00,
  "averageSetupCostPerSquareMeter": 47.50,
  "standConfigurations": [
    {
      "id": "uuid-config-1",
      "name": "Stand 2x3",
      "dimensions": "2x3",
      "area": 6,
      "quantity": 10,
      "pricePerSquareMeter": 150.00,
      "setupCostPerSquareMeter": 50.00,
      "totalPrice": 900.00,
      "totalSetupCost": 300.00,
      "profitPerStand": 600.00,
      "profitMargin": 66.67,
      "totalRevenue": 9000.00,
      "totalCost": 3000.00,
      "totalProfit": 6000.00,
      "efficiency": 100.00,
      "recommendation": "recommended"
    }
  ],
  "insights": [
    {
      "type": "profit_optimization",
      "title": "Excelente Margem de Lucro",
      "description": "Margem de lucro de 66.67% está excelente!",
      "impact": "low",
      "potentialIncrease": 0,
      "action": "Mantenha a estratégia atual ou considere expandir com mais stands."
    },
    {
      "type": "stand_efficiency",
      "title": "Oportunidade de Otimização",
      "description": "O stand Stand 3x3 é 1.1x mais eficiente que o Stand 2x3.",
      "impact": "medium",
      "potentialIncrease": 15,
      "action": "Considere focar mais na venda de stands Stand 3x3 ou ajustar preços do Stand 2x3."
    }
  ],
  "recommendations": [
    "Foque na venda de stands Stand 3x3 que têm melhor margem",
    "Com uma área grande, considere oferecer pacotes corporativos com desconto"
  ]
}
```

#### 2. Otimizar Precificação
```http
POST /fair-analysis/fair/:fairId/optimize-pricing?targetMargin=60
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "currentAnalysis": { /* análise atual */ },
  "optimizedConfigurations": [
    {
      "id": "uuid-config-1",
      "name": "Stand 2x3",
      "dimensions": "2x3",
      "area": 6,
      "quantity": 10,
      "pricePerSquareMeter": 150.00,
      "setupCostPerSquareMeter": 50.00,
      "totalPrice": 900.00,
      "totalSetupCost": 300.00,
      "profitPerStand": 600.00,
      "profitMargin": 66.67,
      "optimizedPricePerSquareMeter": 150.00,
      "priceIncrease": 0.00,
      "newTotalPrice": 900.00,
      "newProfitMargin": 60.00
    }
  ],
  "targetMargin": 60
}
```

#### 3. Obter Apenas Insights
```http
GET /fair-analysis/fair/:fairId/insights
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "fairId": "uuid-feira",
  "insights": [ /* array de insights */ ],
  "recommendations": [ /* array de recomendações */ ]
}
```

#### 4. Análise de Eficiência dos Stands
```http
GET /fair-analysis/fair/:fairId/stand-efficiency
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "fairId": "uuid-feira",
  "standConfigurations": [ /* configurações com análise de eficiência */ ],
  "totalStands": 15,
  "totalArea": 135,
  "averageEfficiency": 95.50
}
```

#### 5. Análise de Lucratividade
```http
GET /fair-analysis/fair/:fairId/profit-analysis
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "fairId": "uuid-feira",
  "totalRevenue": 18900.00,
  "totalCosts": 6300.00,
  "totalProfit": 12600.00,
  "profitMargin": 66.67,
  "averagePricePerSquareMeter": 145.00,
  "averageSetupCostPerSquareMeter": 47.50,
  "profitPerSquareMeter": 93.33
}
```

## 🎯 Tipos de Insights

### 1. **profit_optimization** - Otimização de Lucro
- **Margem Baixa**: Sugere aumento de preços ou redução de custos
- **Margem Excelente**: Parabeniza e sugere expansão

### 2. **stand_efficiency** - Eficiência de Stands
- **Comparação**: Identifica stands mais eficientes
- **Oportunidades**: Sugere foco em stands mais lucrativos

### 3. **pricing_strategy** - Estratégia de Preços
- **Preço vs Custo**: Analisa relação preço/custo de montagem
- **Ajustes**: Recomenda aumentos de preço

### 4. **market_analysis** - Análise de Mercado
- **Capacidade**: Analisa número total de stands
- **Expansão**: Sugere crescimento ou foco em valor

## 📊 Recomendações de Stands

### **highly_recommended** (Altamente Recomendado)
- Margem de lucro ≥ 60%
- Eficiência ≥ 100 (lucro por m²)

### **recommended** (Recomendado)
- Margem de lucro ≥ 40%
- Eficiência ≥ 75

### **moderate** (Moderado)
- Margem de lucro ≥ 20%
- Eficiência ≥ 50

### **not_recommended** (Não Recomendado)
- Margem de lucro < 20%
- Eficiência < 50

## 🔧 Códigos de Erro

### **400 Bad Request**
- Dados de validação inválidos
- Configuração com nome duplicado

### **401 Unauthorized**
- Token JWT inválido ou expirado

### **404 Not Found**
- Feira não encontrada
- Configuração de stand não encontrada

### **409 Conflict**
- Nome de configuração já existe para a feira

## 💡 Exemplos de Uso no Frontend

### 1. **Dashboard de Análise**
```javascript
// Buscar análise completa
const analysis = await fetch('/fair-analysis/fair/uuid-feira', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Exibir métricas principais
console.log(`Receita Total: R$ ${analysis.totalRevenue}`);
console.log(`Lucro: R$ ${analysis.totalProfit}`);
console.log(`Margem: ${analysis.profitMargin}%`);
```

### 2. **Configuração de Stands**
```javascript
// Criar nova configuração
const newStand = await fetch('/stand-configurations/fair/uuid-feira', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Stand 4x4',
    width: 4,
    height: 4,
    quantity: 3,
    pricePerSquareMeter: 120.00,
    setupCostPerSquareMeter: 40.00
  })
});
```

### 3. **Otimização de Preços**
```javascript
// Otimizar para margem de 70%
const optimized = await fetch('/fair-analysis/fair/uuid-feira/optimize-pricing?targetMargin=70', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

// Aplicar preços otimizados
optimized.optimizedConfigurations.forEach(config => {
  if (config.priceIncrease > 0) {
    console.log(`${config.name}: Aumentar preço em ${config.priceIncrease.toFixed(1)}%`);
  }
});
```

### 4. **Exibição de Insights**
```javascript
// Buscar insights
const insights = await fetch('/fair-analysis/fair/uuid-feira/insights', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Exibir insights por tipo
insights.insights.forEach(insight => {
  const alertClass = insight.impact === 'high' ? 'alert-danger' : 
                    insight.impact === 'medium' ? 'alert-warning' : 'alert-info';
  
  console.log(`[${insight.type}] ${insight.title}: ${insight.description}`);
  console.log(`Ação: ${insight.action}`);
});
```

## 🚀 Próximos Passos

1. **Implementar gráficos** de análise de margem
2. **Criar simulador** de cenários de preços
3. **Adicionar histórico** de análises por feira
4. **Implementar alertas** para margens baixas
5. **Criar relatórios** exportáveis

---

**Nota**: Todos os endpoints requerem autenticação JWT. O token deve ser incluído no header `Authorization: Bearer <token>`.
