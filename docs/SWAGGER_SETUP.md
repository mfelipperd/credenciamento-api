# 🚀 Configuração do Swagger - API de Credenciamento

## 📋 Visão Geral

O Swagger foi configurado para fornecer documentação interativa e completa de toda a API. Ele permite testar endpoints diretamente pela interface web, visualizar schemas de dados e entender como usar cada funcionalidade.

## 🔧 Configuração Implementada

### **1. Dependências Instaladas**

```bash
npm install @nestjs/swagger swagger-ui-express
```

### **2. Arquivos de Configuração**

- **`src/config/swagger.config.ts`** - Configuração centralizada do Swagger
- **`src/main.ts`** - Integração do Swagger na aplicação

### **3. Decorações Swagger Adicionadas**

- **`@ApiTags()`** - Organização dos endpoints por módulo
- **`@ApiOperation()`** - Descrição de cada operação
- **`@ApiResponse()`** - Documentação das respostas
- **`@ApiParam()`** - Documentação dos parâmetros de rota
- **`@ApiQuery()`** - Documentação dos parâmetros de query
- **`@ApiBody()`** - Documentação dos corpos de requisição
- **`@ApiProperty()`** - Documentação das propriedades das entidades
- **`@ApiBearerAuth()`** - Configuração de autenticação JWT

## 🌐 Acessando a Documentação

### **URL da Documentação**

```
http://localhost:8000/api
```

### **Configurações da Interface**

- **Título:** API de Credenciamento - Documentação Interativa
- **Versão:** 1.0.0
- **Autenticação:** JWT Bearer Token
- **Interface:** Swagger UI personalizada

## 🏷️ Tags Organizacionais

### **Módulos Principais**

- **`auth`** 🔐 - Autenticação e autorização
- **`users`** 👤 - Gerenciamento de usuários
- **`fairs`** 🏢 - Gerenciamento de feiras
- **`visitors`** 👥 - Gerenciamento de visitantes
- **`checkins`** ✅ - Sistema de check-in
- **`categories`** 🏷️ - Categorias de feiras
- **`sectors`** 🏗️ - Setores de feiras
- **`how-did-you-know`** ❓ - Como conheceu a feira
- **`dashboard`** 📊 - Dashboard e relatórios
- **`emails`** 📧 - Sistema de emails

### **Módulo Financeiro**

- **`finance`** 💰 - Módulo financeiro principal
- **`finance-expenses`** 💸 - Gerenciamento de despesas
- **`finance-revenues`** 💵 - Gerenciamento de receitas
- **`finance-stands`** 🏪 - Gerenciamento de stands
- **`finance-clients`** 👥 - Gerenciamento de clientes
- **`finance-cash-flow`** 📈 - Fluxo de caixa e lucratividade
- **`finance-categories`** 🏷️ - Categorias financeiras
- **`finance-accounts`** 🏦 - Contas bancárias

## 🔐 Autenticação JWT

### **Como Autenticar**

1. **Faça login** usando o endpoint `/auth/login`
2. **Copie o token JWT** da resposta
3. **Clique em "Authorize"** no Swagger
4. **Insira o token** no formato: `Bearer seu-token-aqui`
5. **Clique em "Authorize"** para confirmar

### **Formato do Token**

```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📚 Funcionalidades da Interface

### **1. Navegação por Tags**

- Endpoints organizados por módulo
- Filtro por tag para facilitar a busca
- Descrições detalhadas de cada funcionalidade

### **2. Teste Interativo**

- **Try it out** - Execute endpoints diretamente
- **Exemplos** - Dados de exemplo para cada endpoint
- **Validação** - Verificação automática de dados
- **Respostas** - Visualização das respostas em tempo real

### **3. Schemas de Dados**

- **Entidades** - Estrutura completa dos dados
- **DTOs** - Validações e formatos de entrada
- **Respostas** - Estrutura das respostas da API

### **4. Documentação Detalhada**

- **Sumários** - Descrição concisa de cada operação
- **Descrições** - Explicação detalhada da funcionalidade
- **Exemplos** - Casos de uso práticos
- **Códigos de Status** - Todos os possíveis retornos

## 🎯 Exemplos de Uso

### **1. Testando um Endpoint**

```bash
# 1. Acesse http://localhost:8000/api
# 2. Expanda a tag desejada (ex: finance-cash-flow)
# 3. Clique no endpoint desejado
# 4. Clique em "Try it out"
# 5. Preencha os parâmetros necessários
# 6. Clique em "Execute"
```

### **2. Criando um Fluxo de Caixa**

```json
{
  "fairId": "89d8a3ce-36b0-4fe9-b338-ca46fc5855e3",
  "period": "2025-01-31",
  "notes": "Janeiro 2025 - Teste via Swagger"
}
```

### **3. Obtendo Relatório Consolidado**

```
GET /cash-flow/report/consolidated/{fairId}
fairId: 89d8a3ce-36b0-4fe9-b338-ca46fc5855e3
```

## 🔍 Recursos Avançados

### **1. Filtros e Busca**

- **Filtro por Tag** - Encontre endpoints específicos
- **Busca por Texto** - Procure por funcionalidades
- **Expansão Automática** - Visualize todos os detalhes

### **2. Personalização da Interface**

- **CSS Customizado** - Cores e estilos personalizados
- **JavaScript Customizado** - Funcionalidades adicionais
- **Quick Start Guide** - Guia de início rápido integrado

### **3. Logs e Debug**

- **Request Logging** - Log de todas as requisições
- **Performance** - Tempo de resposta dos endpoints
- **Validação** - Verificação automática de dados

## 📖 Documentação dos Módulos

### **Módulo de Fluxo de Caixa (Exemplo)**

- **Entidade:** `CashFlow` com todas as propriedades documentadas
- **DTOs:** `CreateCashFlowDto` e `UpdateCashFlowDto`
- **Endpoints:** CRUD completo + relatórios especiais
- **Exemplos:** Casos de uso práticos para cada operação

### **Outros Módulos**

- **Despesas:** Gerenciamento completo de despesas
- **Receitas:** Controle de receitas por feira
- **Stands:** Gestão de espaços e aluguel
- **Clientes:** Cadastro e histórico de clientes

## 🚀 Próximos Passos

### **1. Documentar Outros Módulos**

- Adicionar decorações Swagger em todos os controladores
- Documentar entidades e DTOs restantes
- Criar exemplos para todos os endpoints

### **2. Melhorias da Interface**

- Adicionar mais exemplos práticos
- Implementar testes automatizados via Swagger
- Criar guias de uso para cada módulo

### **3. Integração com Frontend**

- Compartilhar documentação com a equipe de frontend
- Criar SDKs baseados na documentação Swagger
- Implementar testes de integração

## 🔧 Solução de Problemas

### **Erro de CORS**

```typescript
// Verificar configuração no main.ts
app.enableCors({
  origin: ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});
```

### **Token JWT Inválido**

- Verificar se o token não expirou
- Confirmar formato: `Bearer token`
- Verificar se o usuário tem permissões

### **Endpoints Não Aparecem**

- Verificar se o módulo está importado no `AppModule`
- Confirmar se as decorações Swagger estão corretas
- Verificar logs de erro na aplicação

## 📞 Suporte

### **Equipe de Desenvolvimento**

- **Email:** dev@empresa.com
- **GitHub:** https://github.com/seu-projeto
- **Documentação:** Documentos técnicos em `/docs/`

---

_O Swagger fornece uma interface intuitiva e completa para explorar, testar e entender toda a API de Credenciamento._ 🎉
