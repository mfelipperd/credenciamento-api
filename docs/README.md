# Documentação da API - Expo MultiMix

## Visão Geral

Esta documentação cobre todos os módulos e funcionalidades da API da plataforma Expo MultiMix, com foco especial no sistema financeiro e gestão de feiras.

## 📚 Documentações Disponíveis

### 🏗️ **Módulos Principais**

#### [Módulo de Despesas](./EXPENSES_MODULE.md)

- Documentação completa do sistema de despesas
- Entidades, DTOs, serviços e controladores
- Endpoints REST e regras de negócio
- Exemplos de uso e validações

#### [Módulo Comum Financeiro](./FINANCE_COMMON_MODULE.md)

- Categorias financeiras e contas bancárias
- Serviços compartilhados entre módulos financeiros
- Hierarquia de categorias e tipos de conta
- Validações e regras de negócio

#### [API de Despesas](./EXPENSES_API.md)

- Documentação da API REST de despesas
- Endpoints, parâmetros e respostas
- Exemplos de uso com curl
- Códigos de erro e validações

### 💰 **Sistema Financeiro**

#### [Módulo de Receitas](./REVENUE_CHARTS_API.md)

- Sistema de receitas e gráficos financeiros
- Controle de recebimentos e parcelas
- Relatórios e análises financeiras

#### [Módulo de Clientes](./FRONTEND_FINANCE_API.md)

- Gestão de clientes e relacionamentos
- Integração com sistema financeiro
- DTOs e validações específicas

#### [Módulo de Stands](./STANDS_API.md)

- Gestão de stands e espaços de feira
- Relacionamento com receitas e despesas
- Configurações e personalizações

### 🎪 **Gestão de Feiras**

#### [Módulo de Feiras](./FAIRS_ENHANCEMENT_DOCUMENTATION.md)

- Sistema completo de gestão de feiras
- Eventos, localizações e programação
- Integração com visitantes e expositores

#### [Módulo de Visitantes](./UNIFIED_VISITORS_ENDPOINT.md)

- Gestão unificada de visitantes
- Paginação e filtros avançados
- Relatórios de presença

#### [Módulo de Categorias](./README.md)

- Categorização de feiras e eventos
- Sistema de tags e organização
- Hierarquia e relacionamentos

### 🔐 **Autenticação e Segurança**

#### [Guia de Autenticação](./FRONTEND_AUTH_GUIDE.md)

- Sistema de autenticação JWT
- Guards e middlewares de segurança
- Integração frontend-backend

#### [Documentação de Segurança](./SECURITY_DOCUMENTATION.md)

- Medidas de segurança implementadas
- Validações e sanitização
- Proteção contra vulnerabilidades

### 📊 **Relatórios e Analytics**

#### [Sistema de Relatórios](./REVENUE_CHARTS_API.md)

- Gráficos e dashboards financeiros
- Relatórios de receitas e despesas
- Exportação de dados

#### [Sistema de Ranking](./RELEVANCE_RANKING_SYSTEM.md)

- Algoritmos de relevância
- Ordenação inteligente de resultados
- Métricas de performance

### 🚀 **Integração e Frontend**

#### [Guia de Integração Frontend](./FRONTEND_INTEGRATION_GUIDE.md)

- Como integrar com aplicações frontend
- Exemplos de código e DTOs
- Padrões de comunicação

#### [Otimizações Frontend](./FRONTEND_OPTIMIZATION_GUIDE.md)

- Melhorias de performance
- Cache e otimizações
- Boas práticas de implementação

### 🛠️ **Ferramentas e Scripts**

#### [Scripts e Comandos](./SCRIPTS_AND_COMMANDS.md)

- Comandos úteis para desenvolvimento
- Scripts de backup e manutenção
- Ferramentas de deploy

#### [Guia de Implementação](./IMPLEMENTATION_GUIDE.md)

- Passo a passo para implementar funcionalidades
- Arquitetura e padrões
- Boas práticas de desenvolvimento

## 🎯 **Módulo de Despesas - Resumo Rápido**

### Endpoints Principais

- `POST /fairs/{fairId}/expenses` - Criar despesa
- `GET /fairs/{fairId}/expenses` - Listar despesas da feira
- `GET /expenses/{id}` - Buscar despesa específica
- `PATCH /expenses/{id}` - Atualizar despesa
- `DELETE /expenses/{id}` - Remover despesa

### Endpoints de Relatório

- `GET /fairs/{fairId}/expenses/total` - Total de despesas
- `GET /fairs/{fairId}/expenses/total-by-category` - Total por categoria
- `GET /fairs/{fairId}/expenses/total-by-account` - Total por conta

### Entidades Principais

- **Expense** - Despesas principais
- **FinanceCategory** - Categorias financeiras
- **Account** - Contas bancárias

## 🔧 **Como Usar Esta Documentação**

1. **Para Desenvolvedores:** Comece pelos módulos específicos que você está implementando
2. **Para Integração:** Use os guias de frontend e exemplos de código
3. **Para API:** Consulte a documentação específica de cada endpoint
4. **Para Arquitetura:** Leia os guias de implementação e padrões

## 📝 **Contribuindo**

Para manter esta documentação atualizada:

1. Documente novas funcionalidades conforme são implementadas
2. Atualize exemplos de código quando houver mudanças
3. Mantenha os diagramas e estruturas atualizados
4. Adicione novos casos de uso e exemplos

## 🆘 **Suporte**

- **Issues:** Use o sistema de issues do projeto
- **Documentação:** Esta documentação é auto-contida
- **Exemplos:** Todos os módulos incluem exemplos práticos
- **Padrões:** Siga os padrões estabelecidos nos módulos existentes

---

_Última atualização: Janeiro 2025_
_Versão da API: 1.0.0_
