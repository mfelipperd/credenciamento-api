# 🏢 Módulo de Sócios por Feira - Documentação Frontend

## 📅 Data da Criação
**11 de setembro de 2025**

---

## 🎯 **Visão Geral**

O módulo de sócios por feira permite diferentes configurações de sócios para cada feira, incluindo:
- Porcentagens específicas por feira
- Quantidades diferentes de sócios por feira
- Controle financeiro independente por feira
- Distribuição de lucros baseada na configuração de cada feira

---

## 🔐 **Autorização**

### **Roles com Acesso:**
- **ADMIN**: Acesso completo a todas as funcionalidades
- **PARTNER**: Acesso apenas aos próprios dados por feira

---

## 📋 **Endpoints da API**

### **1. Gestão de Sócios por Feira**

#### **POST /fair-partners** - Associar Sócio à Feira
```http
POST /fair-partners
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Body:**
```json
{
  "fairId": "123e4567-e89b-12d3-a456-426614174000",
  "partnerId": "456e7890-e89b-12d3-a456-426614174000",
  "percentage": 35.5,
  "isActive": true,
  "notes": "Sócio responsável pela área de marketing"
}
```

**Response (201):**
```json
{
  "id": "fair-partner-uuid",
  "fairId": "123e4567-e89b-12d3-a456-426614174000",
  "partnerId": "456e7890-e89b-12d3-a456-426614174000",
  "percentage": 35.5,
  "totalEarnings": 0,
  "totalWithdrawn": 0,
  "availableBalance": 0,
  "isActive": true,
  "notes": "Sócio responsável pela área de marketing",
  "createdAt": "2025-09-11T03:00:00.000Z",
  "updatedAt": "2025-09-11T03:00:00.000Z"
}
```

#### **GET /fair-partners/fair/:fairId** - Listar Sócios de uma Feira
```http
GET /fair-partners/fair/{fair-id}
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
[
  {
    "id": "fair-partner-uuid-1",
    "fairId": "fair-uuid",
    "partnerId": "partner-uuid-1",
    "percentage": 40.0,
    "totalEarnings": 15000.00,
    "totalWithdrawn": 5000.00,
    "availableBalance": 10000.00,
    "isActive": true,
    "partnerName": "João Silva Santos",
    "partnerCpf": "12345678901",
    "partnerEmail": "joao@email.com",
    "createdAt": "2025-09-11T03:00:00.000Z",
    "updatedAt": "2025-09-11T03:00:00.000Z"
  }
]
```

#### **GET /fair-partners/partner/:partnerId** - Listar Feiras de um Sócio
```http
GET /fair-partners/partner/{partner-id}
Authorization: Bearer {jwt-token}
```

**Response (200):** Mesmo formato do endpoint anterior

#### **GET /fair-partners/me/fairs** - Minhas Feiras
```http
GET /fair-partners/me/fairs
Authorization: Bearer {jwt-token}
```

**Response (200):** Lista de feiras do sócio logado

#### **GET /fair-partners/:id** - Obter Associação Específica
```http
GET /fair-partners/{association-id}
Authorization: Bearer {jwt-token}
```

**Response (200):** Dados da associação feira-sócio

#### **PATCH /fair-partners/:id** - Atualizar Associação
```http
PATCH /fair-partners/{association-id}
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Body (campos opcionais):**
```json
{
  "percentage": 45.0,
  "isActive": false,
  "notes": "Observações atualizadas"
}
```

#### **DELETE /fair-partners/:id** - Remover Associação
```http
DELETE /fair-partners/{association-id}
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
{
  "message": "Associação removida com sucesso"
}
```

### **2. Controle Financeiro por Feira**

#### **GET /fair-partners/fair/:fairId/summary** - Resumo dos Sócios da Feira
```http
GET /fair-partners/fair/{fair-id}/summary
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
{
  "fairId": "fair-uuid",
  "totalPartners": 3,
  "totalPercentage": 100.0,
  "partners": [
    {
      "partnerId": "partner-uuid-1",
      "partnerName": "João Silva Santos",
      "percentage": 40.0,
      "totalEarnings": 20000.00,
      "availableBalance": 15000.00
    },
    {
      "partnerId": "partner-uuid-2",
      "partnerName": "Maria Oliveira",
      "percentage": 35.0,
      "totalEarnings": 17500.00,
      "availableBalance": 12000.00
    },
    {
      "partnerId": "partner-uuid-3",
      "partnerName": "Pedro Santos",
      "percentage": 25.0,
      "totalEarnings": 12500.00,
      "availableBalance": 8000.00
    }
  ]
}
```

#### **GET /fair-partners/fair/:fairId/partner/:partnerId/financial-summary** - Resumo Financeiro do Sócio na Feira
```http
GET /fair-partners/fair/{fair-id}/partner/{partner-id}/financial-summary
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
{
  "fairId": "fair-uuid",
  "partnerId": "partner-uuid",
  "percentage": 40.0,
  "totalEarnings": 20000.00,
  "totalWithdrawn": 5000.00,
  "availableBalance": 15000.00
}
```

#### **GET /fair-partners/fair/:fairId/available-percentage** - Porcentagem Disponível na Feira
```http
GET /fair-partners/fair/{fair-id}/available-percentage
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
{
  "fairId": "fair-uuid",
  "availablePercentage": 60.0,
  "usedPercentage": 40.0,
  "totalPercentage": 100
}
```

### **3. Distribuição de Lucros por Feira**

#### **POST /cash-flow/distribute-profit/:fairId** - Distribuir Lucro da Feira
```http
POST /cash-flow/distribute-profit/{fair-id}
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
{
  "fairId": "fair-uuid",
  "totalProfit": 100000.00,
  "distribution": [
    {
      "partnerId": "partner-uuid-1",
      "partnerName": "João Silva Santos",
      "percentage": 40.0,
      "share": 40000.00
    },
    {
      "partnerId": "partner-uuid-2",
      "partnerName": "Maria Oliveira",
      "percentage": 35.0,
      "share": 35000.00
    },
    {
      "partnerId": "partner-uuid-3",
      "partnerName": "Pedro Santos",
      "percentage": 25.0,
      "share": 25000.00
    }
  ]
}
```

---

## 🔒 **Validações Importantes**

### **1. Porcentagem por Feira**
- **Máximo individual**: 100% por sócio por feira
- **Máximo total**: 100% entre todos os sócios ativos da feira
- **Validação dinâmica**: Sistema calcula automaticamente o valor disponível para cada feira
- **Exemplo**: Feira A pode ter 3 sócios (40%, 35%, 25%), Feira B pode ter 2 sócios (60%, 40%)

### **2. Associações Únicas**
- **Feira + Sócio**: Um sócio só pode ter uma associação por feira
- **Validação**: Sistema impede duplicação de associações

---

## 📊 **Exemplos de Configuração por Feira**

### **Feira 2025 (3 sócios):**
```json
[
  { "partnerId": "partner-1", "percentage": 40.0, "name": "João Silva" },
  { "partnerId": "partner-2", "percentage": 35.0, "name": "Maria Oliveira" },
  { "partnerId": "partner-3", "percentage": 25.0, "name": "Pedro Santos" }
]
```

### **Feira 2026 (2 sócios):**
```json
[
  { "partnerId": "partner-1", "percentage": 60.0, "name": "João Silva" },
  { "partnerId": "partner-4", "percentage": 40.0, "name": "Ana Costa" }
]
```

---

## 🎨 **Sugestões de Interface**

### **1. Página de Configuração de Feira (Admin)**
- Lista de sócios da feira com porcentagens
- Botão "Adicionar Sócio" com validação de porcentagem disponível
- Indicador visual da porcentagem total utilizada
- Ações: Editar porcentagem, Remover sócio

### **2. Dashboard do Sócio por Feira**
- Lista de feiras do sócio
- Resumo financeiro por feira
- Gráficos de evolução por feira
- Filtros por feira

### **3. Página de Distribuição de Lucros (Admin)**
- Seleção da feira
- Visualização da distribuição antes de confirmar
- Botão "Distribuir Lucro"
- Histórico de distribuições por feira

---

## 📝 **Exemplos de Uso**

### **Configurar Sócios para uma Feira:**
```javascript
// 1. Consultar porcentagem disponível
const available = await api.get(`/fair-partners/fair/${fairId}/available-percentage`);
console.log(`Disponível: ${available.availablePercentage}%`);

// 2. Associar sócios à feira
const fairPartner1 = await api.post('/fair-partners', {
  fairId: 'fair-uuid',
  partnerId: 'partner-1-uuid',
  percentage: 40.0
});

const fairPartner2 = await api.post('/fair-partners', {
  fairId: 'fair-uuid',
  partnerId: 'partner-2-uuid',
  percentage: 35.0
});

const fairPartner3 = await api.post('/fair-partners', {
  fairId: 'fair-uuid',
  partnerId: 'partner-3-uuid',
  percentage: 25.0
});
```

### **Distribuir Lucro de uma Feira:**
```javascript
const distribution = await api.post(`/cash-flow/distribute-profit/${fairId}`);
console.log(`Lucro total da feira: R$ ${distribution.totalProfit}`);
distribution.distribution.forEach(partner => {
  console.log(`${partner.partnerName}: ${partner.percentage}% = R$ ${partner.share}`);
});
```

### **Consultar Dados do Sócio por Feira:**
```javascript
// Resumo financeiro do sócio em uma feira específica
const summary = await api.get(
  `/fair-partners/fair/${fairId}/partner/${partnerId}/financial-summary`
);

console.log(`
💰 Feira ${summary.fairId}:
   • Porcentagem: ${summary.percentage}%
   • Total ganho: R$ ${summary.totalEarnings.toFixed(2)}
   • Já sacado: R$ ${summary.totalWithdrawn.toFixed(2)}
   • Disponível: R$ ${summary.availableBalance.toFixed(2)}
`);
```

---

## 🔄 **Fluxo Completo por Feira**

1. **Admin configura sócios** para a feira com porcentagens específicas
2. **Feira termina** com lucro
3. **Admin distribui** via endpoint específico da feira
4. **Sócios recebem** automaticamente baseado na configuração da feira
5. **Sócios consultam** seus ganhos por feira
6. **Sócios solicitam saques** quando necessário

---

## 🆚 **Diferenças do Sistema Anterior**

| Aspecto | Sistema Anterior | Sistema Atual |
|---------|------------------|---------------|
| **Porcentagem** | Global (mesma para todas as feiras) | Específica por feira |
| **Quantidade de Sócios** | Fixa | Variável por feira |
| **Controle Financeiro** | Global | Independente por feira |
| **Flexibilidade** | Limitada | Total flexibilidade |
| **Configuração** | Uma vez só | Por feira |

---

## 📞 **Suporte**

Para dúvidas sobre implementação ou bugs, consulte a documentação Swagger em:
`http://localhost:8000/api` (tags: `fair-partners` e `partners`)
