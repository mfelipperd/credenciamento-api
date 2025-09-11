# 📊 Módulo de Sócios - Documentação Frontend

## 📅 Data da Criação
**11 de setembro de 2025**

---

## 🎯 **Visão Geral**

O módulo de sócios permite o controle completo de participação nos lucros das feiras, incluindo:
- Gestão de sócios com porcentagens de participação
- Sistema de saques com aprovação de administradores
- Distribuição automática de lucros baseada nas porcentagens
- Controle financeiro detalhado por sócio

---

## 🔐 **Autorização**

### **Roles com Acesso:**
- **ADMIN**: Acesso completo a todas as funcionalidades
- **PARTNER**: Acesso apenas ao próprio perfil e funcionalidades financeiras

### **Endpoints por Role:**

| Endpoint | ADMIN | PARTNER |
|----------|-------|---------|
| `GET /partners` | ✅ | ❌ |
| `POST /partners` | ✅ | ❌ |
| `GET /partners/me` | ❌ | ✅ |
| `GET /partners/:id` | ✅ | ✅ (próprio) |
| `PATCH /partners/:id` | ✅ | ❌ |
| `DELETE /partners/:id` | ✅ | ❌ |
| `POST /partners/:id/withdrawals` | ✅ | ✅ (próprio) |
| `GET /partners/:id/withdrawals` | ✅ | ✅ (próprio) |
| `GET /partners/:id/financial-summary` | ✅ | ✅ (próprio) |
| `POST /partners/withdrawals/:id/approve` | ✅ | ❌ |
| `POST /partners/withdrawals/:id/reject` | ✅ | ❌ |
| `GET /partners/available-percentage` | ✅ | ❌ |

---

## 📋 **Endpoints da API**

### **1. Gestão de Sócios**

#### **POST /partners** - Criar Sócio
```http
POST /partners
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "João Silva Santos",
  "cpf": "12345678901",
  "email": "joao.silva@email.com",
  "phone": "11999999999",
  "percentage": 25.5,
  "notes": "Sócio fundador da empresa",
  "isActive": true
}
```

**Response (201):**
```json
{
  "id": "partner-uuid",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "João Silva Santos",
  "cpf": "12345678901",
  "email": "joao.silva@email.com",
  "phone": "11999999999",
  "percentage": 25.5,
  "totalEarnings": 0,
  "totalWithdrawn": 0,
  "availableBalance": 0,
  "isActive": true,
  "notes": "Sócio fundador da empresa",
  "createdAt": "2025-09-11T03:00:00.000Z",
  "updatedAt": "2025-09-11T03:00:00.000Z"
}
```

#### **GET /partners** - Listar Todos os Sócios
```http
GET /partners
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
[
  {
    "id": "partner-uuid-1",
    "userId": "user-uuid-1",
    "name": "João Silva Santos",
    "cpf": "12345678901",
    "percentage": 25.5,
    "totalEarnings": 15000.00,
    "totalWithdrawn": 5000.00,
    "availableBalance": 10000.00,
    "isActive": true,
    "createdAt": "2025-09-11T03:00:00.000Z",
    "updatedAt": "2025-09-11T03:00:00.000Z"
  }
]
```

#### **GET /partners/me** - Perfil do Sócio Logado
```http
GET /partners/me
Authorization: Bearer {jwt-token}
```

**Response (200):** Mesmo formato do POST /partners

#### **GET /partners/:id** - Obter Sócio por ID
```http
GET /partners/{partner-id}
Authorization: Bearer {jwt-token}
```

**Response (200):** Mesmo formato do POST /partners

#### **PATCH /partners/:id** - Atualizar Sócio
```http
PATCH /partners/{partner-id}
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Body (campos opcionais):**
```json
{
  "name": "João Silva Santos Atualizado",
  "email": "joao.novo@email.com",
  "phone": "11888888888",
  "percentage": 30.0,
  "notes": "Observações atualizadas",
  "isActive": true
}
```

**Response (200):** Mesmo formato do POST /partners

#### **DELETE /partners/:id** - Remover Sócio
```http
DELETE /partners/{partner-id}
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
{
  "message": "Sócio removido com sucesso"
}
```

### **2. Controle Financeiro**

#### **GET /partners/:id/financial-summary** - Resumo Financeiro
```http
GET /partners/{partner-id}/financial-summary
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
{
  "totalEarnings": 25000.00,
  "totalWithdrawn": 8000.00,
  "availableBalance": 17000.00,
  "pendingWithdrawals": 2000.00,
  "totalWithdrawals": 5
}
```

#### **GET /partners/available-percentage** - Porcentagem Disponível
```http
GET /partners/available-percentage
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
{
  "availablePercentage": 60.0,
  "usedPercentage": 40.0,
  "totalPercentage": 100
}
```

### **3. Sistema de Saques**

#### **POST /partners/:id/withdrawals** - Solicitar Saque
```http
POST /partners/{partner-id}/withdrawals
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Body:**
```json
{
  "amount": 5000.00,
  "reason": "Retirada mensal de lucros",
  "bankDetails": "Banco: 001, Agência: 1234, Conta: 56789-0",
  "notes": "Transferência urgente"
}
```

**Response (201):**
```json
{
  "id": "withdrawal-uuid",
  "partnerId": "partner-uuid",
  "amount": 5000.00,
  "status": "PENDING",
  "reason": "Retirada mensal de lucros",
  "bankDetails": "Banco: 001, Agência: 1234, Conta: 56789-0",
  "notes": "Transferência urgente",
  "createdAt": "2025-09-11T03:00:00.000Z",
  "updatedAt": "2025-09-11T03:00:00.000Z"
}
```

#### **GET /partners/:id/withdrawals** - Histórico de Saques
```http
GET /partners/{partner-id}/withdrawals
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
[
  {
    "id": "withdrawal-uuid-1",
    "partnerId": "partner-uuid",
    "amount": 5000.00,
    "status": "APPROVED",
    "reason": "Retirada mensal de lucros",
    "approvedBy": "admin-uuid",
    "approvedAt": "2025-09-11T03:30:00.000Z",
    "bankDetails": "Banco: 001, Agência: 1234, Conta: 56789-0",
    "notes": "Transferência urgente",
    "createdAt": "2025-09-11T03:00:00.000Z",
    "updatedAt": "2025-09-11T03:30:00.000Z"
  }
]
```

#### **POST /partners/withdrawals/:id/approve** - Aprovar Saque
```http
POST /partners/withdrawals/{withdrawal-id}/approve
Authorization: Bearer {jwt-token}
```

**Response (200):** Objeto de saque atualizado com status "APPROVED"

#### **POST /partners/withdrawals/:id/reject** - Rejeitar Saque
```http
POST /partners/withdrawals/{withdrawal-id}/reject
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Body:**
```json
{
  "rejectionReason": "Dados bancários incorretos"
}
```

**Response (200):** Objeto de saque atualizado com status "REJECTED"

### **4. Distribuição de Lucros**

#### **POST /cash-flow/distribute-profit/:fairId** - Distribuir Lucro
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
      "percentage": 60.0,
      "share": 60000.00
    }
  ]
}
```

---

## 🔒 **Validações Importantes**

### **1. Porcentagem de Participação**
- **Máximo individual**: 100% por sócio
- **Máximo total**: 100% entre todos os sócios ativos
- **Validação dinâmica**: Sistema calcula automaticamente o valor disponível
- **Exemplo**: Se sócio A tem 40%, novo sócio pode ter no máximo 60%

### **2. Saques**
- **Valor mínimo**: R$ 0,01
- **Valor máximo**: Saldo disponível do sócio
- **Status**: PENDING → APPROVED/REJECTED
- **Aprovação**: Apenas administradores podem aprovar/rejeitar

### **3. CPF e Usuário**
- **CPF único**: Não pode haver dois sócios com mesmo CPF
- **Usuário único**: Um usuário só pode ter um perfil de sócio

---

## 📊 **Status de Saques**

| Status | Descrição |
|--------|-----------|
| `PENDING` | Aguardando aprovação do administrador |
| `APPROVED` | Aprovado pelo administrador |
| `REJECTED` | Rejeitado pelo administrador |
| `COMPLETED` | Processado e finalizado |

---

## 🎨 **Sugestões de Interface**

### **1. Página de Sócios (Admin)**
- Lista de sócios com porcentagens e saldos
- Botão "Criar Sócio" com validação de porcentagem disponível
- Indicador visual da porcentagem total utilizada
- Ações: Editar, Desativar, Remover

### **2. Página de Saques (Admin)**
- Lista de saques pendentes com filtros por status
- Ações: Aprovar, Rejeitar (com motivo)
- Histórico completo de saques

### **3. Dashboard do Sócio**
- Resumo financeiro (ganhos, saques, saldo)
- Formulário de solicitação de saque
- Histórico de saques pessoais
- Gráficos de evolução financeira

### **4. Validação de Porcentagem**
- Campo de porcentagem com validação em tempo real
- Indicador: "Disponível: X%"
- Erro: "Máximo disponível: Y%"

---

## 🚨 **Códigos de Erro**

| Código | Erro | Descrição |
|--------|------|-----------|
| 400 | `Bad Request` | Dados inválidos ou porcentagem excedida |
| 401 | `Unauthorized` | Token JWT inválido |
| 403 | `Forbidden` | Acesso negado para o role |
| 404 | `Not Found` | Sócio ou recurso não encontrado |
| 500 | `Internal Server Error` | Erro interno do servidor |

---

## 📝 **Exemplos de Uso**

### **Criar Sócio com Validação**
```javascript
// 1. Consultar porcentagem disponível
const available = await api.get('/partners/available-percentage');
console.log(`Disponível: ${available.availablePercentage}%`);

// 2. Criar sócio com validação
const newPartner = await api.post('/partners', {
  userId: 'user-uuid',
  name: 'Novo Sócio',
  cpf: '12345678901',
  percentage: 30.0, // Deve ser <= availablePercentage
  email: 'novo@email.com'
});
```

### **Solicitar Saque**
```javascript
const withdrawal = await api.post(`/partners/${partnerId}/withdrawals`, {
  amount: 5000.00,
  reason: 'Retirada mensal',
  bankDetails: 'Banco: 001, Ag: 1234, Conta: 56789-0'
});
```

### **Distribuir Lucro de Feira**
```javascript
const distribution = await api.post(`/cash-flow/distribute-profit/${fairId}`);
console.log(`Lucro total: R$ ${distribution.totalProfit}`);
distribution.distribution.forEach(partner => {
  console.log(`${partner.partnerName}: ${partner.percentage}% = R$ ${partner.share}`);
});
```

---

## 🔄 **Fluxo Completo**

1. **Admin cria sócios** com porcentagens (total ≤ 100%)
2. **Feira gera lucro** → Admin distribui via endpoint
3. **Sócios recebem** automaticamente em seus saldos
4. **Sócios solicitam saques** quando necessário
5. **Admin aprova/rejeita** saques
6. **Saldos são atualizados** automaticamente

---

## 📞 **Suporte**

Para dúvidas sobre implementação ou bugs, consulte a documentação Swagger em:
`http://localhost:8000/api` (tag: `partners`)
