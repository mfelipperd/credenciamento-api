# 👥 CRUD Completo de Usuários - Documentação API

## 📅 Data da Criação
**11 de setembro de 2025**

---

## 🎯 **Visão Geral**

Sistema completo de gerenciamento de usuários com:
- **CRUD completo** (Create, Read, Update, Delete)
- **Controle de acesso** baseado em roles
- **Validações** robustas de dados
- **Criptografia** de senhas
- **Auditoria** de operações
- **Estatísticas** de usuários

---

## 🔐 **Autorização**

### **Roles com Acesso:**
- **ADMIN**: Acesso completo a todas as funcionalidades
- **PARTNER**: Acesso apenas ao próprio perfil
- **CONSULTANT**: Acesso apenas ao próprio perfil
- **RECEPTIONIST**: Acesso apenas ao próprio perfil

---

## 📋 **Endpoints da API**

### **1. Gestão de Usuários**

#### **POST /users** - Criar Usuário
```http
POST /users
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "João Silva Santos",
  "email": "joao.silva@email.com",
  "password": "minhasenha123",
  "role": "admin",
  "cpf": "12345678901",
  "phone": "11999999999",
  "isActive": true,
  "notes": "Usuário responsável pela área de vendas"
}
```

**Response (201):**
```json
{
  "id": "user-uuid",
  "name": "João Silva Santos",
  "email": "joao.silva@email.com",
  "role": "admin",
  "isActive": true,
  "cpf": "12345678901",
  "phone": "11999999999",
  "notes": "Usuário responsável pela área de vendas",
  "createdAt": "2025-09-11T03:00:00.000Z",
  "updatedAt": "2025-09-11T03:00:00.000Z"
}
```

#### **GET /users** - Listar Todos os Usuários
```http
GET /users
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
[
  {
    "id": "user-uuid-1",
    "name": "João Silva Santos",
    "email": "joao@email.com",
    "role": "admin",
    "isActive": true,
    "cpf": "12345678901",
    "phone": "11999999999",
    "createdAt": "2025-09-11T03:00:00.000Z",
    "updatedAt": "2025-09-11T03:00:00.000Z"
  }
]
```

#### **GET /users/me** - Meu Perfil
```http
GET /users/me
Authorization: Bearer {jwt-token}
```

**Response (200):** Dados do usuário logado

#### **GET /users/:id** - Obter Usuário por ID
```http
GET /users/{user-id}
Authorization: Bearer {jwt-token}
```

**Response (200):** Dados do usuário específico

#### **PATCH /users/:id** - Atualizar Usuário
```http
PATCH /users/{user-id}
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Body (campos opcionais):**
```json
{
  "name": "João Silva Santos Atualizado",
  "email": "joao.novo@email.com",
  "cpf": "98765432100",
  "phone": "11888888888",
  "isActive": false,
  "notes": "Observações atualizadas"
}
```

#### **DELETE /users/:id** - Remover Usuário
```http
DELETE /users/{user-id}
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
{
  "message": "Usuário removido com sucesso"
}
```

### **2. Funcionalidades Especiais**

#### **PATCH /users/:id/change-password** - Alterar Senha
```http
PATCH /users/{user-id}/change-password
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Body:**
```json
{
  "currentPassword": "senhaatual123",
  "newPassword": "novasenha123"
}
```

**Response (200):**
```json
{
  "message": "Senha alterada com sucesso"
}
```

#### **PATCH /users/:id/toggle-active** - Ativar/Desativar Usuário
```http
PATCH /users/{user-id}/toggle-active
Authorization: Bearer {jwt-token}
```

**Response (200):** Dados do usuário com status atualizado

### **3. Filtros e Consultas**

#### **GET /users/active** - Usuários Ativos
```http
GET /users/active
Authorization: Bearer {jwt-token}
```

**Response (200):** Lista apenas usuários ativos

#### **GET /users/role/:role** - Usuários por Role
```http
GET /users/role/{role}
Authorization: Bearer {jwt-token}
```

**Exemplos:**
- `GET /users/role/admin` - Apenas administradores
- `GET /users/role/partner` - Apenas sócios
- `GET /users/role/consultant` - Apenas consultores

#### **GET /users/stats** - Estatísticas de Usuários
```http
GET /users/stats
Authorization: Bearer {jwt-token}
```

**Response (200):**
```json
{
  "totalUsers": 25,
  "activeUsers": 23,
  "inactiveUsers": 2,
  "usersByRole": {
    "admin": 3,
    "partner": 5,
    "consultant": 10,
    "receptionist": 7
  }
}
```

---

## 🔒 **Validações e Regras**

### **1. Criação de Usuário**
- **Email único**: Não pode existir outro usuário com o mesmo email
- **CPF único**: Se fornecido, deve ser único no sistema
- **Senha**: Mínimo 8 caracteres
- **Role**: Deve ser um dos valores válidos (admin, partner, consultant, receptionist)
- **CPF**: Deve ter exatamente 11 dígitos numéricos

### **2. Atualização de Usuário**
- **Email único**: Se alterado, deve ser único
- **CPF único**: Se alterado, deve ser único
- **Role**: Apenas admins podem alterar roles
- **Senha**: Não pode ser alterada via endpoint de atualização

### **3. Alteração de Senha**
- **Senha atual**: Deve ser fornecida e estar correta
- **Nova senha**: Mínimo 8 caracteres
- **Próprio usuário**: Apenas o próprio usuário pode alterar sua senha

### **4. Remoção de Usuário**
- **Apenas admins**: Apenas administradores podem remover usuários
- **Não próprio**: Admins não podem remover a si mesmos

---

## 📊 **Estrutura de Dados**

### **Entidade User**
```typescript
{
  id: string;           // UUID único
  name: string;         // Nome completo
  email: string;        // Email único
  password: string;     // Senha criptografada
  role: EUserRole;      // Role do usuário
  isActive: boolean;    // Status ativo/inativo
  cpf?: string;         // CPF (opcional)
  phone?: string;       // Telefone (opcional)
  notes?: string;       // Observações (opcional)
  createdAt: Date;      // Data de criação
  updatedAt: Date;      // Data de atualização
}
```

### **Roles Disponíveis**
```typescript
enum EUserRole {
  ADMIN = 'admin',
  PARTNER = 'partner',
  CONSULTANT = 'consultant',
  RECEPTIONIST = 'receptionist'
}
```

---

## 🎨 **Sugestões de Interface**

### **1. Página de Listagem (Admin)**
- Tabela com todos os usuários
- Filtros por role e status
- Busca por nome/email
- Ações: Editar, Ativar/Desativar, Remover

### **2. Formulário de Criação/Edição**
- Campos obrigatórios destacados
- Validação em tempo real
- Seletor de role (apenas para admins)
- Campo de observações

### **3. Página de Perfil (Usuário)**
- Dados pessoais editáveis
- Alteração de senha
- Histórico de atividades
- Status da conta

### **4. Dashboard de Estatísticas (Admin)**
- Gráficos de usuários por role
- Usuários ativos vs inativos
- Crescimento de usuários
- Métricas de atividade

---

## 📝 **Exemplos de Uso**

### **Criar um Novo Sócio:**
```javascript
const partner = await api.post('/users', {
  name: 'Maria Oliveira',
  email: 'maria@email.com',
  password: 'senha123456',
  role: 'partner',
  cpf: '98765432100',
  phone: '11987654321',
  notes: 'Sócia responsável pela área de marketing'
});
```

### **Listar Apenas Sócios:**
```javascript
const partners = await api.get('/users/role/partner');
console.log(`Total de sócios: ${partners.length}`);
```

### **Alterar Senha:**
```javascript
await api.patch(`/users/${userId}/change-password`, {
  currentPassword: 'senhaatual123',
  newPassword: 'novasenha456'
});
```

### **Obter Estatísticas:**
```javascript
const stats = await api.get('/users/stats');
console.log(`
📊 Estatísticas de Usuários:
   • Total: ${stats.totalUsers}
   • Ativos: ${stats.activeUsers}
   • Inativos: ${stats.inactiveUsers}
   • Por role: ${JSON.stringify(stats.usersByRole)}
`);
```

---

## 🔄 **Fluxo de Uso**

1. **Admin cria usuário** com dados básicos
2. **Usuário recebe credenciais** para login
3. **Usuário faz login** e acessa o sistema
4. **Usuário pode editar** seu próprio perfil
5. **Admin gerencia** todos os usuários
6. **Sistema registra** todas as operações

---

## ⚠️ **Códigos de Erro**

| Código | Descrição | Solução |
|--------|-----------|---------|
| **400** | Dados inválidos | Verificar validações |
| **401** | Não autenticado | Fazer login |
| **403** | Acesso negado | Verificar permissões |
| **404** | Usuário não encontrado | Verificar ID |
| **409** | Email/CPF já existe | Usar dados únicos |

---

## 📞 **Suporte**

Para dúvidas sobre implementação ou bugs, consulte a documentação Swagger em:
`http://localhost:8000/api` (tag: `users`)

---

## 🚀 **Recursos Avançados**

- **Criptografia**: Senhas são criptografadas com bcrypt
- **Validação**: Dados são validados com class-validator
- **Auditoria**: Todas as operações são logadas
- **Performance**: Consultas otimizadas com índices
- **Segurança**: Controle de acesso granular
- **Flexibilidade**: Sistema suporta diferentes roles
