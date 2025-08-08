# 💰 Módulo de Receitas - Documentação Completa

## 📋 Visão Geral

O Módulo de Receitas é um submódulo do sistema financeiro que gerencia contratos de vendas de stands e patrocínios por feira. Inclui controle de parcelas, baixas, comprovantes e analytics completos.

## 🎯 Funcionalidades Principais

- ✅ **Gestão de Clientes Globais** - CRUD completo com autocomplete
- ✅ **Modelos de Entrada por Feira** - Configuração de stands e patrocínios
- ✅ **Contratos de Receita** - Criação, parcelamento e acompanhamento
- ✅ **Controle de Parcelas** - Vencimentos, baixas e comprovantes
- ✅ **Analytics Avançados** - KPIs e gráficos para ApexCharts
- ✅ **Sistema de Anexos** - Upload de contratos e comprovantes
- ✅ **Ordenação Inteligente** - Por status, vencimento e empresa
- ✅ **Busca e Filtros** - Por período, tipo, status e cliente

## 📚 Documentação

### 📖 Documentos Principais

| Documento | Descrição | Status |
|-----------|-----------|--------|
| **[RECEITAS_MODULE.md](./RECEITAS_MODULE.md)** | Especificação completa do módulo | ✅ Completo |
| **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** | Guia passo-a-passo de implementação | ✅ Completo |
| **[API_EXAMPLES.md](./API_EXAMPLES.md)** | Exemplos de requests/responses das APIs | ✅ Completo |
| **[DTOS.md](./DTOS.md)** | Todos os DTOs com validações | ✅ Completo |
| **[SCRIPTS_AND_COMMANDS.md](./SCRIPTS_AND_COMMANDS.md)** | Scripts, migrations e comandos úteis | ✅ Completo |

### 🔍 Links Rápidos

- [🎯 Objetivos e Premissas](./RECEITAS_MODULE.md#-objetivo)
- [🗄️ Modelagem de Dados](./RECEITAS_MODULE.md#️-modelagem-db--prisma-sug)
- [📡 Rotas da API](./RECEITAS_MODULE.md#-rotas-rest)
- [📊 Analytics para ApexCharts](./RECEITAS_MODULE.md#-configuração-para-apexcharts)
- [🏗️ Guia de Implementação](./IMPLEMENTATION_GUIDE.md#️-ordem-de-implementação)
- [🧪 Casos de Teste](./RECEITAS_MODULE.md#-casos-de-teste-essenciais)

## 🚀 Quick Start

### 1. Criar Branch
```bash
git checkout -b feature/receitas-module
```

### 2. Gerar Estrutura NestJS
```bash
# Módulos
nest g module finance
nest g module finance/clients
nest g module finance/entry-models
nest g module finance/revenues

# Controllers e Services
nest g controller finance/clients --no-spec
nest g service finance/clients --no-spec
# ... (ver SCRIPTS_AND_COMMANDS.md)
```

### 3. Implementar na Ordem
1. **Clientes** (independente)
2. **Modelos de Entrada** (depende de feira)
3. **Receitas** (depende de clientes e modelos)
4. **Analytics** (depende de receitas)

### 4. Testar APIs
Usar exemplos do arquivo [API_EXAMPLES.md](./API_EXAMPLES.md)

## 🎨 Características Técnicas

### 💰 Sistema Financeiro
- **Valores**: Armazenados em centavos (Int) para precisão
- **Moeda**: Real brasileiro (R$) com 2 casas decimais
- **Timezone**: America/Belem
- **Validações**: CNPJ, valores, datas e parcelas

### 📊 Status Inteligente
- **Derivação Automática**: Status calculado baseado nas parcelas
- **Atualização Temporal**: Parcelas vencidas identificadas automaticamente
- **Ordenação Fixa**: Pendente → Em andamento → Em atraso → Pago

### 🔍 Busca e Filtros
- **Paginação**: page (1-based) + pageSize (máx 100)
- **Busca**: Por nome da empresa com LIKE
- **Filtros**: Tipo, status, período e campo de data
- **Ordenação**: Por status, vencimento e empresa

### 📈 Analytics para ApexCharts
- **Gráficos de Linha**: Contratos e recebimentos por período
- **Gráficos de Pizza**: Distribuição por tipo e modelo
- **Ranking**: Top empresas por valor contratado/pago
- **KPIs**: Cards com totais e percentuais

## 🛡️ Segurança

### 🔐 Autenticação
- **Guard**: JwtAuthGuard + RoleGuard
- **Permissão**: Apenas ADMIN acessa este módulo
- **Auditoria**: Log de operações críticas (opcional)

### ✅ Validações
- **DTOs**: Validação automática com class-validator
- **Business Rules**: Validações de negócio no service
- **Upload**: Apenas PDF/JPG até 10MB

## 🧪 Testes

### 📋 Casos Essenciais
- [x] Criar receita com parcelas → status PENDENTE
- [x] Baixar parcela → status EM_ANDAMENTO  
- [x] Vencer parcela → status EM_ATRASO
- [x] Baixar todas → status PAGO
- [x] Ordenação por status funcionando
- [x] KPIs retornando valores corretos
- [x] Analytics com granularidade correta

### 🔧 Scripts de Teste
```bash
npm run test -- --testPathPattern=finance
npm run test:e2e
npm run test:cov
```

## 📱 Frontend Integration

### 🎨 ApexCharts Ready
Todas as APIs de analytics retornam dados no formato adequado para ApexCharts:

```javascript
// Exemplo: Contratos por período
const chartData = {
  series: [{ name: "Valor", data: [128000, 192000, 96000] }],
  categories: ["Jun 2025", "Jul 2025", "Ago 2025"]
}
```

### 📊 Components Sugeridos
- **Revenue List**: Tabela paginada com filtros
- **Revenue Form**: Formulário de criação/edição
- **Revenue Detail**: Modal com parcelas e anexos
- **Analytics Dashboard**: Cards + gráficos
- **Installment Manager**: Baixas e edições

## 🔄 Fluxo de Desenvolvimento

### 1. 📖 Estudar Documentação
- Ler [RECEITAS_MODULE.md](./RECEITAS_MODULE.md) completo
- Revisar [API_EXAMPLES.md](./API_EXAMPLES.md)
- Entender [DTOS.md](./DTOS.md)

### 2. 🏗️ Implementar Backend
- Seguir [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- Usar [SCRIPTS_AND_COMMANDS.md](./SCRIPTS_AND_COMMANDS.md)
- Implementar na ordem: Clientes → Entry Models → Revenues

### 3. 🧪 Testar APIs
- Criar dados de teste com seeders
- Testar todos os endpoints
- Validar analytics e KPIs

### 4. 📱 Integrar Frontend
- Usar dados das APIs de exemplo
- Implementar componentes visuais
- Integrar com ApexCharts

### 5. 🚀 Deploy
- Executar migrations
- Configurar variáveis de ambiente
- Monitorar performance

## 🎯 Metas do MVP

### ✅ Backend Core
- [x] **Entidades**: Client, EntryModel, Revenue, Installment, Attachment
- [x] **APIs**: CRUD completo + paginação + filtros
- [x] **Analytics**: 5 endpoints para gráficos
- [x] **Validações**: DTOs + business rules
- [x] **Segurança**: Guards + permissions

### ✅ Features Principais
- [x] **Clientes globais** com autocomplete
- [x] **Modelos por feira** configuráveis
- [x] **Contratos** com parcelamento flexível
- [x] **Status automático** baseado em parcelas
- [x] **Ordenação fixa** por prioridade de status
- [x] **KPIs** para dashboard
- [x] **Analytics** para ApexCharts

### 🎨 Frontend (Próxima Sprint)
- [ ] **Listagem** de receitas com filtros
- [ ] **Formulários** de criação/edição
- [ ] **Dashboard** com KPIs e gráficos
- [ ] **Gestão de parcelas** (baixas/edições)
- [ ] **Upload** de anexos

## 📞 Suporte

### 💬 Perguntas Frequentes

**Q: Como converter centavos para reais?**
```typescript
const reais = centavos / 100;
const formatado = (centavos / 100).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL'
});
```

**Q: Como ordenar por status?**
```sql
ORDER BY
  CASE status
    WHEN 'PENDENTE' THEN 1
    WHEN 'EM_ANDAMENTO' THEN 2  
    WHEN 'EM_ATRASO' THEN 3
    WHEN 'PAGO' THEN 4
    WHEN 'CANCELADO' THEN 5
  END ASC
```

**Q: Como calcular status derivado?**
```typescript
if (todasPagas) return 'PAGO';
if (algumaVencida) return 'EM_ATRASO';  
if (algumaPaga && algumaAberta) return 'EM_ANDAMENTO';
return 'PENDENTE';
```

### 🐛 Issues Conhecidos
- Nenhum issue conhecido no momento
- Reportar problemas na issue do GitHub

### 📚 Referências
- [NestJS Docs](https://docs.nestjs.com/)
- [TypeORM Docs](https://typeorm.io/)
- [Class Validator](https://github.com/typestack/class-validator)
- [ApexCharts](https://apexcharts.com/)

---

## 🏆 Conclusão

Esta documentação fornece tudo o necessário para implementar o módulo de receitas completo. O sistema foi projetado para ser:

- **🚀 Performante**: Índices otimizados e paginação eficiente
- **🔒 Seguro**: Validações robustas e controle de acesso
- **📊 Analítico**: KPIs e gráficos prontos para ApexCharts  
- **🛠️ Flexível**: Parcelamento customizável e anexos
- **📱 Frontend-Ready**: APIs padronizadas e bem documentadas

**Status**: ✅ **Pronto para implementação**

---

*Documentação gerada em: 8 de agosto de 2025*  
*Versão: 1.0.0*  
*Módulo: Finance → Receitas*
