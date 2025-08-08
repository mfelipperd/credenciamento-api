# Módulo Finance - Documentação para Frontend

## 📋 Visão Geral

O módulo Finance é responsável pelo gerenciamento financeiro de receitas, clientes e modelos de lançamento no sistema de credenciamento. Este módulo oferece APIs REST completas para todas as operações CRUD.

## 🏗️ Arquitetura

```
/finance
├── /clients          # Gerenciamento de clientes
├── /entry-models     # Modelos de lançamento (Stand, Patrocínio)
└── /revenues         # Receitas e faturamento
```

## 🌐 APIs Disponíveis

### Base URL

```
http://localhost:3000/finance
```

---

## 👥 Clientes (`/finance/clients`)

### Estrutura do Cliente

```typescript
interface Client {
  id: string; // UUID do cliente
  name: string; // Nome do cliente (obrigatório)
  cnpj?: string; // CNPJ (opcional)
  email?: string; // Email (opcional)
  phone?: string; // Telefone (opcional)
  createdAt: Date; // Data de criação
  updatedAt: Date; // Data de atualização
}
```

### 🔹 Criar Cliente

```http
POST /finance/clients
Content-Type: application/json

{
  "name": "Empresa XYZ Ltda",
  "cnpj": "12345678000199",
  "email": "contato@empresa.com",
  "phone": "(11) 99999-9999"
}
```

**Resposta (201):**

```json
{
  "id": "uuid-v4",
  "name": "Empresa XYZ Ltda",
  "cnpj": "12345678000199",
  "email": "contato@empresa.com",
  "phone": "(11) 99999-9999",
  "createdAt": "2025-08-08T14:30:00.000Z",
  "updatedAt": "2025-08-08T14:30:00.000Z"
}
```

### 🔹 Listar Clientes

```http
GET /finance/clients
```

**Com busca por nome:**

```http
GET /finance/clients?search=empresa
```

**Resposta (200):**

```json
[
  {
    "id": "uuid-v4",
    "name": "Empresa XYZ Ltda",
    "cnpj": "12345678000199",
    "email": "contato@empresa.com",
    "phone": "(11) 99999-9999",
    "createdAt": "2025-08-08T14:30:00.000Z",
    "updatedAt": "2025-08-08T14:30:00.000Z"
  }
]
```

### 🔹 Buscar Cliente por ID

```http
GET /finance/clients/{id}
```

### 🔹 Atualizar Cliente

```http
PATCH /finance/clients/{id}
Content-Type: application/json

{
  "name": "Empresa XYZ S.A.",
  "email": "novo@empresa.com"
}
```

### 🔹 Remover Cliente

```http
DELETE /finance/clients/{id}
```

**Resposta (204): Sem conteúdo**

### 🔹 Buscar por Email

```http
GET /finance/clients/email/{email}
```

### 🔹 Buscar por CNPJ

```http
GET /finance/clients/cnpj/{cnpj}
```

---

## 📊 Modelos de Lançamento (`/finance/entry-models`)

### Estrutura do Modelo

```typescript
interface EntryModel {
  id: string; // UUID do modelo
  name: string; // Nome do modelo (obrigatório)
  type: EntryModelType; // Tipo: 'STAND' | 'PATROCINIO'
  description?: string; // Descrição (opcional)
  createdAt: Date; // Data de criação
  updatedAt: Date; // Data de atualização
}

enum EntryModelType {
  STAND = 'STAND',
  PATROCINIO = 'PATROCINIO',
}
```

### 🔹 Criar Modelo

```http
POST /finance/entry-models
Content-Type: application/json

{
  "name": "Stand Premium 6x3",
  "type": "STAND",
  "description": "Stand premium com 18m² incluindo energia e internet"
}
```

**Resposta (201):**

```json
{
  "id": "uuid-v4",
  "name": "Stand Premium 6x3",
  "type": "STAND",
  "description": "Stand premium com 18m² incluindo energia e internet",
  "createdAt": "2025-08-08T14:30:00.000Z",
  "updatedAt": "2025-08-08T14:30:00.000Z"
}
```

### 🔹 Listar Modelos

```http
GET /finance/entry-models
```

**Com filtro por tipo:**

```http
GET /finance/entry-models?type=STAND
```

### 🔹 Buscar Modelo por ID

```http
GET /finance/entry-models/{id}
```

### 🔹 Atualizar Modelo

```http
PATCH /finance/entry-models/{id}
Content-Type: application/json

{
  "name": "Stand Premium 6x3 - Atualizado",
  "description": "Nova descrição"
}
```

### 🔹 Remover Modelo

```http
DELETE /finance/entry-models/{id}
```

---

## 💰 Receitas (`/finance/revenues`)

### Estrutura da Receita

```typescript
interface Revenue {
  id: string; // UUID da receita
  fairId: string; // ID da feira
  type: EntryModelType; // Tipo: 'STAND' | 'PATROCINIO'
  entryModelId: string; // ID do modelo de lançamento
  clientId: string; // ID do cliente
  baseValue: number; // Valor base em centavos
  discountCents: number; // Desconto em centavos
  contractValue: number; // Valor do contrato em centavos
  paymentMethod: PaymentMethod; // Método de pagamento
  condition?: string; // Condições especiais
  status: RevenueStatus; // Status da receita
  notes?: string; // Observações
  createdBy: string; // Usuário que criou
  createdAt: Date; // Data de criação
  updatedAt: Date; // Data de atualização
}

enum PaymentMethod {
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CARTAO = 'CARTAO',
  TED = 'TED',
  DINHEIRO = 'DINHEIRO',
}

enum RevenueStatus {
  PENDENTE = 'PENDENTE',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  EM_ATRASO = 'EM_ATRASO',
  PAGO = 'PAGO',
  CANCELADO = 'CANCELADO',
}
```

### 🔹 Criar Receita

```http
POST /finance/revenues
Content-Type: application/json

{
  "fairId": "feira-uuid",
  "clientId": "cliente-uuid",
  "entryModelId": "modelo-uuid",
  "baseValue": 500000,
  "discountCents": 50000,
  "contractValue": 450000,
  "paymentMethod": "PIX",
  "condition": "Pagamento à vista com 10% de desconto",
  "notes": "Cliente preferencial",
  "createdBy": "usuario-uuid"
}
```

**Resposta (201):**

```json
{
  "id": "uuid-v4",
  "fairId": "feira-uuid",
  "type": "STAND",
  "entryModelId": "modelo-uuid",
  "clientId": "cliente-uuid",
  "baseValue": 500000,
  "discountCents": 50000,
  "contractValue": 450000,
  "paymentMethod": "PIX",
  "condition": "Pagamento à vista com 10% de desconto",
  "status": "PENDENTE",
  "notes": "Cliente preferencial",
  "createdBy": "usuario-uuid",
  "createdAt": "2025-08-08T14:30:00.000Z",
  "updatedAt": "2025-08-08T14:30:00.000Z"
}
```

### 🔹 Listar Receitas

```http
GET /finance/revenues
```

**Resposta inclui relacionamentos:**

```json
[
  {
    "id": "uuid-v4",
    "fairId": "feira-uuid",
    "type": "STAND",
    "baseValue": 500000,
    "contractValue": 450000,
    "status": "PENDENTE",
    "client": {
      "id": "cliente-uuid",
      "name": "Empresa XYZ Ltda",
      "email": "contato@empresa.com"
    },
    "entryModel": {
      "id": "modelo-uuid",
      "name": "Stand Premium 6x3",
      "type": "STAND"
    },
    "createdAt": "2025-08-08T14:30:00.000Z"
  }
]
```

### 🔹 Buscar Receita por ID

```http
GET /finance/revenues/{id}
```

### 🔹 Atualizar Receita

```http
PATCH /finance/revenues/{id}
Content-Type: application/json

{
  "status": "PAGO",
  "notes": "Pagamento confirmado via PIX"
}
```

### 🔹 Remover Receita

```http
DELETE /finance/revenues/{id}
```

### 🔹 Buscar por Cliente

```http
GET /finance/revenues/client/{clientId}
```

### 🔹 Buscar por Status

```http
GET /finance/revenues/status/{status}
```

---

## 🎨 Componentes Frontend Sugeridos

### 1. Lista de Clientes

```tsx
interface ClientsListProps {
  onClientSelect?: (client: Client) => void;
  searchable?: boolean;
}

// Estados necessários:
// - clients: Client[]
// - loading: boolean
// - searchTerm: string
```

### 2. Formulário de Cliente

```tsx
interface ClientFormProps {
  client?: Client;
  onSave: (client: Client) => void;
  onCancel: () => void;
}

// Validações:
// - name: obrigatório, max 255 chars
// - cnpj: formato CNPJ válido
// - email: formato email válido
```

### 3. Dashboard de Receitas

```tsx
interface RevenueDashboardProps {
  fairId?: string;
  dateRange?: DateRange;
}

// Métricas úteis:
// - Total de receitas por status
// - Valor total contratado
// - Receitas em atraso
// - Top clientes
```

### 4. Seletor de Modelos

```tsx
interface EntryModelSelectorProps {
  type?: EntryModelType;
  onSelect: (model: EntryModel) => void;
  multiple?: boolean;
}
```

---

## 🔍 Filtros e Busca

### Clientes

- **Nome**: Busca parcial case-insensitive
- **Email**: Busca exata
- **CNPJ**: Busca exata

### Modelos

- **Tipo**: Filtro por STAND ou PATROCINIO
- **Nome**: Ordenação alfabética

### Receitas

- **Status**: Filtro por status específico
- **Cliente**: Todas as receitas de um cliente
- **Data**: Ordenação por data de criação

---

## 💡 Dicas de UX

### 1. **Formatação de Valores**

```typescript
// Valores são em centavos, converter para exibição
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
};
```

### 2. **Status com Cores**

```typescript
const statusColors = {
  PENDENTE: '#fbbf24', // Amarelo
  EM_ANDAMENTO: '#3b82f6', // Azul
  EM_ATRASO: '#ef4444', // Vermelho
  PAGO: '#10b981', // Verde
  CANCELADO: '#6b7280', // Cinza
};
```

### 3. **Validação de CNPJ**

```typescript
const validateCNPJ = (cnpj: string) => {
  // Implementar validação de CNPJ
  return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj);
};
```

---

## 🚨 Tratamento de Erros

### Códigos de Status HTTP

- **200**: Sucesso
- **201**: Criado com sucesso
- **204**: Removido com sucesso
- **400**: Dados inválidos
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

### Exemplo de Resposta de Erro

```json
{
  "statusCode": 400,
  "message": ["name should not be empty", "email must be an email"],
  "error": "Bad Request"
}
```

---

## 📱 Exemplo de Implementação React

```tsx
// Hook personalizado para clientes
const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClients = async (search?: string) => {
    setLoading(true);
    try {
      const url = search
        ? `/finance/clients?search=${encodeURIComponent(search)}`
        : '/finance/clients';
      const response = await api.get(url);
      setClients(response.data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData: CreateClientDto) => {
    try {
      const response = await api.post('/finance/clients', clientData);
      setClients((prev) => [response.data, ...prev]);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  return { clients, loading, fetchClients, createClient };
};
```

---

## 🔗 Integrações

### Com outros módulos

- **Feiras**: `fairId` nas receitas
- **Usuários**: `createdBy` nas receitas
- **Categorias**: Possível classificação de clientes

### Banco de dados

- Todas as entidades usam **UUID** como chave primária
- **Soft delete** recomendado para clientes e receitas
- **Índices** em campos de busca frequente (email, cnpj, status)

---

## ✅ Checklist de Implementação Frontend

- [ ] Configurar axios/fetch para APIs
- [ ] Implementar componentes de listagem
- [ ] Criar formulários com validação
- [ ] Adicionar formatação de moeda
- [ ] Implementar busca e filtros
- [ ] Tratar estados de loading
- [ ] Configurar tratamento de erros
- [ ] Implementar confirmações de exclusão
- [ ] Adicionar feedback visual (toasts)
- [ ] Criar testes unitários

---

**📅 Última atualização:** 08/08/2025  
**🔗 Swagger UI:** `http://localhost:3000/api` (quando configurado)  
**🐛 Suporte:** Entre em contato com a equipe backend para dúvidas
