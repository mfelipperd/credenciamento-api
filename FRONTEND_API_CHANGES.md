# 🔄 Alterações da API - Frontend Documentation

## 📅 Data da Atualização

**11 de agosto de 2025**

---

## 🆕 Principais Alterações

### 1. **Criação de Receitas com Vinculação de Stands**

### 2. **Novos Endpoints para Gerenciamento de Stands**

---

## 📝 1. ALTERAÇÃO: POST /finance/revenues

### ⚠️ **BREAKING CHANGE**

O endpoint de criação de receitas agora **REQUER** o campo `standNumber`.

### 🔧 **Payload Atualizado**

**Antes:**

```json
{
  "fairId": 1,
  "clientId": 1,
  "description": "Venda de stand",
  "totalAmount": 1500.0,
  "status": "ACTIVE",
  "paymentMethod": "CREDIT_CARD",
  "installmentCount": 3,
  "firstPaymentDate": "2025-02-15"
}
```

**Agora (OBRIGATÓRIO):**

```json
{
  "fairId": 1,
  "standNumber": 5, // ← NOVO CAMPO OBRIGATÓRIO
  "clientId": 1,
  "description": "Venda de stand número 5",
  "totalAmount": 1500.0,
  "status": "ACTIVE",
  "paymentMethod": "CREDIT_CARD",
  "installmentCount": 3,
  "firstPaymentDate": "2025-02-15"
}
```

### 📋 **Validações do Campo standNumber**

- **Tipo**: `number`
- **Obrigatório**: `true`
- **Mínimo**: `1`
- **Validação**: Stand deve existir na feira especificada
- **Validação**: Stand deve estar disponível (`isAvailable: true`)

### 📤 **Resposta Atualizada**

A resposta agora inclui dados do stand vinculado:

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
    // ← NOVO OBJETO RETORNADO
    "id": 5,
    "standNumber": 5,
    "fairId": 1,
    "price": 1500.0,
    "isAvailable": false, // ← Automaticamente marcado como ocupado
    "revenueId": 1,
    "createdAt": "2025-02-08T12:30:00.000Z",
    "updatedAt": "2025-02-08T12:31:01.000Z"
  },
  "installments": [
    // ... parcelas como antes
  ]
}
```

### ❌ **Novos Erros Possíveis**

**Stand não encontrado:**

```json
{
  "statusCode": 400,
  "message": "Stand número 5 não encontrado na feira 1",
  "error": "Bad Request"
}
```

**Stand já ocupado:**

```json
{
  "statusCode": 400,
  "message": "Stand número 5 já está ocupado",
  "error": "Bad Request"
}
```

---

## 🆕 2. NOVOS ENDPOINTS: Gerenciamento de Stands

### 🏗️ **POST /finance/stands/configure**

Configura stands em lote para uma feira.

**Payload:**

```json
{
  "fairId": 1,
  "quantity": 50, // Quantidade de stands a criar (1 a 50)
  "price": 1500.0 // Preço padrão para todos os stands
}
```

**Resposta:**

```json
{
  "message": "50 stands configurados com sucesso para a feira 1",
  "fairId": 1,
  "quantity": 50,
  "price": 1500.0
}
```

### 📋 **GET /finance/stands**

Lista todos os stands de uma feira.

**Query Parameters:**

- `fairId` (obrigatório): ID da feira

**Exemplo:**

```
GET /finance/stands?fairId=1
```

**Resposta:**

```json
[
  {
    "id": 1,
    "standNumber": 1,
    "fairId": 1,
    "price": 1500.0,
    "isAvailable": true,
    "revenueId": null,
    "createdAt": "2025-02-08T12:00:00.000Z",
    "updatedAt": "2025-02-08T12:00:00.000Z"
  },
  {
    "id": 2,
    "standNumber": 2,
    "fairId": 1,
    "price": 1500.0,
    "isAvailable": false,
    "revenueId": 5,
    "revenue": {
      "id": 5,
      "description": "Venda de stand número 2",
      "totalAmount": 1500.0,
      "status": "ACTIVE"
    },
    "createdAt": "2025-02-08T12:00:00.000Z",
    "updatedAt": "2025-02-08T12:15:00.000Z"
  }
]
```

### ✅ **GET /finance/stands/available**

Lista apenas stands disponíveis.

**Query Parameters:**

- `fairId` (obrigatório): ID da feira

**Exemplo:**

```
GET /finance/stands/available?fairId=1
```

### 🚫 **GET /finance/stands/occupied**

Lista apenas stands ocupados (com receitas vinculadas).

**Query Parameters:**

- `fairId` (obrigatório): ID da feira

### 📊 **GET /finance/stands/stats**

Estatísticas dos stands de uma feira.

**Query Parameters:**

- `fairId` (obrigatório): ID da feira

**Resposta:**

```json
{
  "fairId": 1,
  "total": 50,
  "available": 35,
  "occupied": 15,
  "occupancyRate": 30.0,
  "totalRevenue": 22500.0,
  "averagePrice": 1500.0
}
```

### 🔍 **GET /finance/stands/:id**

Busca um stand específico por ID.

**Resposta:**

```json
{
  "id": 5,
  "standNumber": 5,
  "fairId": 1,
  "price": 1500.0,
  "isAvailable": false,
  "revenueId": 1,
  "revenue": {
    "id": 1,
    "description": "Venda de stand número 5",
    "totalAmount": 1500.0,
    "status": "ACTIVE",
    "client": {
      "id": 1,
      "name": "Cliente Exemplo",
      "email": "cliente@exemplo.com"
    }
  },
  "createdAt": "2025-02-08T12:00:00.000Z",
  "updatedAt": "2025-02-08T12:15:00.000Z"
}
```

### 🔗 **PATCH /finance/stands/:id/link-revenue**

Vincula manualmente um stand a uma receita existente.

**Payload:**

```json
{
  "revenueId": 10
}
```

### 🔓 **PATCH /finance/stands/:id/unlink-revenue**

Desvincula um stand de sua receita (libera o stand).

**Sem payload necessário.**

**Resposta:**

```json
{
  "message": "Stand 5 desvinculado com sucesso",
  "stand": {
    "id": 5,
    "standNumber": 5,
    "isAvailable": true,
    "revenueId": null
  }
}
```

---

## 🔄 3. FLUXO RECOMENDADO PARA O FRONTEND

### **Passo 1: Configurar Stands**

```javascript
// Configurar stands para uma feira
const configureStands = async (fairId, quantity, price) => {
  const response = await fetch('/finance/stands/configure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fairId, quantity, price }),
  });
  return response.json();
};
```

### **Passo 2: Listar Stands Disponíveis**

```javascript
// Buscar stands disponíveis para mostrar no dropdown
const getAvailableStands = async (fairId) => {
  const response = await fetch(`/finance/stands/available?fairId=${fairId}`);
  return response.json();
};
```

### **Passo 3: Criar Receita com Stand**

```javascript
// Criar receita com stand selecionado
const createRevenue = async (revenueData) => {
  const response = await fetch('/finance/revenues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...revenueData,
      standNumber: selectedStandNumber, // ← Campo obrigatório
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    // Tratar erros específicos de stand
    if (error.message.includes('não encontrado')) {
      alert('Stand não encontrado!');
    } else if (error.message.includes('já está ocupado')) {
      alert('Stand já está ocupado! Selecione outro.');
    }
    return;
  }

  return response.json();
};
```

### **Passo 4: Mostrar Estatísticas**

```javascript
// Buscar estatísticas para dashboard
const getStandStats = async (fairId) => {
  const response = await fetch(`/finance/stands/stats?fairId=${fairId}`);
  return response.json();
};
```

---

## 📱 4. SUGESTÕES PARA UI/UX

### **Formulário de Criação de Receita**

1. **Dropdown de Stands**: Mostrar apenas stands disponíveis
2. **Filtro por Feira**: Carregar stands baseado na feira selecionada
3. **Validação em Tempo Real**: Verificar disponibilidade ao selecionar
4. **Feedback Visual**: Indicar stands ocupados/disponíveis

### **Dashboard de Stands**

1. **Mapa Visual**: Grid mostrando status de cada stand
2. **Filtros**: Por status (disponível/ocupado), por faixa de preço
3. **Estatísticas**: Cards com métricas principais
4. **Ações Rápidas**: Botões para vincular/desvincular stands

### **Lista de Stands**

```jsx
// Exemplo de componente React
const StandSelector = ({ fairId, onSelect }) => {
  const [stands, setStands] = useState([]);

  useEffect(() => {
    getAvailableStands(fairId).then(setStands);
  }, [fairId]);

  return (
    <select onChange={(e) => onSelect(e.target.value)}>
      <option value="">Selecione um stand</option>
      {stands.map((stand) => (
        <option key={stand.id} value={stand.standNumber}>
          Stand {stand.standNumber} - R$ {stand.price.toFixed(2)}
        </option>
      ))}
    </select>
  );
};
```

---

## ⚡ 5. PONTOS DE ATENÇÃO

### **Para o Frontend:**

1. ✅ **Campo obrigatório**: `standNumber` é obrigatório na criação de receitas
2. ✅ **Validação**: Implementar validação de stand disponível
3. ✅ **Feedback**: Mostrar mensagens claras de erro
4. ✅ **Atualização**: Recarregar lista de stands após criação de receita
5. ✅ **Filtragem**: Filtrar stands por feira sempre

### **Testes Recomendados:**

1. 🧪 Criar receita com stand válido
2. 🧪 Tentar criar receita com stand inexistente
3. 🧪 Tentar criar receita com stand ocupado
4. 🧪 Verificar se stand fica ocupado após criação
5. 🧪 Testar listagem de stands por feira

---

## 📞 6. CONTATO PARA DÚVIDAS

Para esclarecimentos sobre a implementação, entrar em contato com a equipe de backend.

**Documentação completa disponível em:**

- `REVENUE_WITH_STAND_EXAMPLE.md` - Exemplos de uso
- `STANDS_API.md` - Documentação completa dos endpoints

---

**🎉 Happy Coding!**
