# Scripts e Comandos - Módulo de Receitas

## 🚀 Comandos de Geração NestJS

### Gerar Estrutura Básica
```bash
# Módulo principal
nest g module finance

# Submódulos
nest g module finance/clients
nest g module finance/entry-models
nest g module finance/revenues

# Controllers
nest g controller finance/clients --no-spec
nest g controller finance/entry-models --no-spec
nest g controller finance/revenues --no-spec

# Services
nest g service finance/clients --no-spec
nest g service finance/entry-models --no-spec
nest g service finance/revenues --no-spec
nest g service finance/revenues/analytics --no-spec

# Guards e Decorators (se não existirem)
nest g guard auth/role --no-spec
nest g decorator auth/roles --no-spec
```

### Gerar Classes Específicas
```bash
# Pipes customizados
nest g pipe common/pipes/cents-to-currency --no-spec
nest g pipe common/pipes/parse-date-range --no-spec

# Interceptors
nest g interceptor common/interceptors/transform-response --no-spec
nest g interceptor common/interceptors/audit --no-spec

# Filters
nest g filter common/filters/finance-exception --no-spec
```

---

## 📂 Estrutura de Pastas Completa

```
src/modules/finance/
├── finance.module.ts
├── common/
│   ├── decorators/
│   │   ├── is-cents-value.decorator.ts
│   │   └── is-valid-cnpj.decorator.ts
│   ├── dto/
│   │   └── paginated-response.dto.ts
│   ├── enums/
│   │   └── finance.enums.ts
│   ├── interfaces/
│   │   └── finance.interfaces.ts
│   └── utils/
│       ├── currency.utils.ts
│       ├── date.utils.ts
│       └── cnpj.utils.ts
├── clients/
│   ├── clients.module.ts
│   ├── clients.controller.ts
│   ├── clients.service.ts
│   ├── dto/
│   │   ├── create-client.dto.ts
│   │   ├── update-client.dto.ts
│   │   └── paginated-clients.dto.ts
│   └── entities/
│       └── client.entity.ts
├── entry-models/
│   ├── entry-models.module.ts
│   ├── entry-models.controller.ts
│   ├── entry-models.service.ts
│   ├── dto/
│   │   ├── create-entry-model.dto.ts
│   │   ├── update-entry-model.dto.ts
│   │   └── query-entry-models.dto.ts
│   └── entities/
│       └── entry-model.entity.ts
└── revenues/
    ├── revenues.module.ts
    ├── revenues.controller.ts
    ├── revenues.service.ts
    ├── installments.controller.ts
    ├── installments.service.ts
    ├── analytics/
    │   ├── analytics.controller.ts
    │   └── analytics.service.ts
    ├── dto/
    │   ├── create-revenue.dto.ts
    │   ├── update-revenue.dto.ts
    │   ├── paginated-revenues.dto.ts
    │   ├── revenue-kpis.dto.ts
    │   ├── analytics.dto.ts
    │   ├── update-installment.dto.ts
    │   ├── pay-installment.dto.ts
    │   └── generate-installments.dto.ts
    ├── entities/
    │   ├── revenue.entity.ts
    │   ├── revenue-installment.entity.ts
    │   └── attachment.entity.ts
    ├── enums/
    │   └── revenue.enums.ts
    └── utils/
        ├── status.utils.ts
        ├── installments.utils.ts
        └── analytics.utils.ts
```

---

## 🗄️ Scripts de Migração TypeORM

### 1. Gerar Migration
```bash
# Gerar migration para finance
npm run typeorm:generate --name=CreateFinanceModule

# Ou manualmente
npm run typeorm migration:generate -- -n CreateFinanceModule
```

### 2. Migration SQL (Exemplo)
```sql
-- migrations/xxxx-create-finance-module.sql

-- Clientes (globais)
CREATE TABLE finance_clients (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_clients_name (name),
  INDEX idx_clients_cnpj (cnpj)
);

-- Modelos de entrada
CREATE TABLE finance_entry_models (
  id VARCHAR(36) PRIMARY KEY,
  fair_id VARCHAR(36) NOT NULL,
  type ENUM('STAND', 'PATROCINIO') NOT NULL,
  name VARCHAR(255) NOT NULL,
  base_value BIGINT NOT NULL,
  cost_cents BIGINT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_entry_models_fair (fair_id, type, active),
  FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE CASCADE
);

-- Receitas (contratos)
CREATE TABLE finance_revenues (
  id VARCHAR(36) PRIMARY KEY,
  fair_id VARCHAR(36) NOT NULL,
  type ENUM('STAND', 'PATROCINIO') NOT NULL,
  entry_model_id VARCHAR(36) NOT NULL,
  client_id VARCHAR(36) NOT NULL,
  base_value BIGINT NOT NULL,
  discount_cents BIGINT NOT NULL DEFAULT 0,
  contract_value BIGINT NOT NULL,
  payment_method ENUM('PIX', 'BOLETO', 'CARTAO', 'TED', 'DINHEIRO') NOT NULL,
  condition VARCHAR(50),
  status ENUM('PENDENTE', 'EM_ANDAMENTO', 'EM_ATRASO', 'PAGO', 'CANCELADO') DEFAULT 'PENDENTE',
  notes TEXT,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_revenues_fair_status (fair_id, status, type),
  INDEX idx_revenues_client (client_id),
  INDEX idx_revenues_created (created_at),
  
  FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_model_id) REFERENCES finance_entry_models(id),
  FOREIGN KEY (client_id) REFERENCES finance_clients(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Parcelas
CREATE TABLE finance_revenue_installments (
  id VARCHAR(36) PRIMARY KEY,
  revenue_id VARCHAR(36) NOT NULL,
  n INT NOT NULL,
  due_date DATE NOT NULL,
  value_cents BIGINT NOT NULL,
  status ENUM('A_VENCER', 'VENCIDA', 'PAGA', 'CANCELADA') DEFAULT 'A_VENCER',
  paid_at TIMESTAMP NULL,
  proof_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_installments_revenue (revenue_id, status, due_date),
  INDEX idx_installments_paid (paid_at),
  INDEX idx_installments_due (due_date, status),
  
  FOREIGN KEY (revenue_id) REFERENCES finance_revenues(id) ON DELETE CASCADE
);

-- Anexos
CREATE TABLE finance_attachments (
  id VARCHAR(36) PRIMARY KEY,
  entity_type ENUM('revenue', 'installment') NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  mime VARCHAR(100) NOT NULL,
  size_bytes INT NOT NULL,
  uploaded_by VARCHAR(36) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_attachments_entity (entity_type, entity_id),
  
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
```

### 3. Executar Migration
```bash
npm run typeorm:run
# ou
npm run typeorm migration:run
```

---

## 🧪 Scripts de Teste

### 1. Executar Testes
```bash
# Todos os testes
npm run test

# Testes específicos do módulo
npm run test -- --testPathPattern=finance

# Testes de integração
npm run test:e2e

# Coverage
npm run test:cov
```

### 2. Seeder para Dados de Teste
```typescript
// scripts/seed-finance.ts
import { DataSource } from 'typeorm';
import { Client } from '../src/modules/finance/clients/entities/client.entity';
import { EntryModel } from '../src/modules/finance/entry-models/entities/entry-model.entity';

async function seedFinanceData() {
  const dataSource = new DataSource({
    // configuração do DB
  });

  await dataSource.initialize();

  // Seed clients
  const clients = [
    { name: 'ACME S/A', cnpj: '12345678000195', email: 'contato@acme.com.br' },
    { name: 'Beta Distribuidora', cnpj: '98765432000123', email: 'vendas@beta.com.br' },
    { name: 'Gamma Corporation', cnpj: '11111111000111', email: 'comercial@gamma.com.br' }
  ];

  for (const client of clients) {
    await dataSource.getRepository(Client).save(client);
  }

  // Seed entry models
  const fairId = 'fair-uuid-example';
  const entryModels = [
    { fairId, type: 'STAND', name: 'Stand 3x3', baseValue: 1500000 },
    { fairId, type: 'STAND', name: 'Stand 4x4', baseValue: 2400000 },
    { fairId, type: 'STAND', name: 'Stand 6x6', baseValue: 3600000 },
    { fairId, type: 'PATROCINIO', name: 'Patrocínio Bronze', baseValue: 5000000 },
    { fairId, type: 'PATROCINIO', name: 'Patrocínio Prata', baseValue: 8000000 },
    { fairId, type: 'PATROCINIO', name: 'Patrocínio Ouro', baseValue: 12000000 }
  ];

  for (const model of entryModels) {
    await dataSource.getRepository(EntryModel).save(model);
  }

  console.log('Finance data seeded successfully!');
  await dataSource.destroy();
}

seedFinanceData().catch(console.error);
```

### 3. Executar Seeder
```bash
npx ts-node scripts/seed-finance.ts
```

---

## 🛠️ Utilitários

### 1. Converter Centavos para Real
```typescript
// src/modules/finance/common/utils/currency.utils.ts
export class CurrencyUtils {
  static centsToCurrency(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  static currencyToCents(currency: string): number {
    // Remove símbolos e converte para número
    const number = parseFloat(currency.replace(/[R$\s.]/g, '').replace(',', '.'));
    return Math.round(number * 100);
  }

  static formatCents(cents: number): number {
    return cents / 100; // Para exibição em reais
  }
}
```

### 2. Utilitários de Data
```typescript
// src/modules/finance/common/utils/date.utils.ts
export class DateUtils {
  static getCurrentMonthRange(): { from: Date; to: Date } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    return { from, to };
  }

  static getPeriodBuckets(from: Date, to: Date, granularity: 'day' | 'week' | 'month'): string[] {
    const buckets: string[] = [];
    const current = new Date(from);

    while (current <= to) {
      if (granularity === 'month') {
        buckets.push(current.toISOString().slice(0, 7) + '-01'); // YYYY-MM-01
        current.setMonth(current.getMonth() + 1);
      } else if (granularity === 'week') {
        buckets.push(current.toISOString().slice(0, 10)); // YYYY-MM-DD
        current.setDate(current.getDate() + 7);
      } else if (granularity === 'day') {
        buckets.push(current.toISOString().slice(0, 10)); // YYYY-MM-DD
        current.setDate(current.getDate() + 1);
      }
    }

    return buckets;
  }

  static toBelemTimezone(date: Date): Date {
    // UTC-3 (America/Belem)
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utc + (-3 * 3600000));
  }
}
```

### 3. Pipe para Moeda
```typescript
// src/modules/finance/common/pipes/cents-to-currency.pipe.ts
import { PipeTransform, Injectable } from '@nestjs/common';
import { CurrencyUtils } from '../utils/currency.utils';

@Injectable()
export class CentsToCurrencyPipe implements PipeTransform {
  transform(value: number): string {
    if (typeof value !== 'number') return 'R$ 0,00';
    return CurrencyUtils.centsToCurrency(value);
  }
}
```

---

## 📊 Scripts de Analytics

### 1. Gerar Relatório de Receitas
```typescript
// scripts/generate-revenue-report.ts
import { DataSource } from 'typeorm';
import { Revenue } from '../src/modules/finance/revenues/entities/revenue.entity';
import * as fs from 'fs';

async function generateRevenueReport(fairId: string, month: string) {
  const dataSource = new DataSource({
    // configuração
  });

  await dataSource.initialize();

  const revenues = await dataSource
    .getRepository(Revenue)
    .createQueryBuilder('revenue')
    .leftJoinAndSelect('revenue.client', 'client')
    .leftJoinAndSelect('revenue.entryModel', 'entryModel')
    .leftJoinAndSelect('revenue.installments', 'installments')
    .where('revenue.fairId = :fairId', { fairId })
    .andWhere('DATE_FORMAT(revenue.createdAt, "%Y-%m") = :month', { month })
    .getMany();

  // Processar dados
  const report = {
    periodo: month,
    totalContratos: revenues.length,
    totalStands: revenues.filter(r => r.type === 'STAND').length,
    totalPatrocinios: revenues.filter(r => r.type === 'PATROCINIO').length,
    valorTotal: revenues.reduce((sum, r) => sum + r.contractValue, 0),
    valorPago: revenues.reduce((sum, r) => sum + r.paidCents, 0),
    contratos: revenues.map(r => ({
      id: r.id,
      cliente: r.client.name,
      tipo: r.type,
      modelo: r.entryModel.name,
      valor: r.contractValue,
      pago: r.paidCents,
      status: r.status
    }))
  };

  // Salvar relatório
  fs.writeFileSync(
    `reports/receitas-${fairId}-${month}.json`,
    JSON.stringify(report, null, 2)
  );

  console.log(`Relatório gerado: receitas-${fairId}-${month}.json`);
  await dataSource.destroy();
}

// Uso: npx ts-node scripts/generate-revenue-report.ts fair-id 2025-08
```

### 2. Script de Atualização de Status
```typescript
// scripts/update-overdue-installments.ts
import { DataSource } from 'typeorm';
import { RevenueInstallment } from '../src/modules/finance/revenues/entities/revenue-installment.entity';
import { InstallmentStatus } from '../src/modules/finance/revenues/enums/revenue.enums';

async function updateOverdueInstallments() {
  const dataSource = new DataSource({
    // configuração
  });

  await dataSource.initialize();

  const today = new Date();
  
  const result = await dataSource
    .getRepository(RevenueInstallment)
    .createQueryBuilder()
    .update()
    .set({ status: InstallmentStatus.VENCIDA })
    .where('dueDate < :today', { today })
    .andWhere('status = :status', { status: InstallmentStatus.A_VENCER })
    .execute();

  console.log(`${result.affected} parcelas marcadas como vencidas`);
  await dataSource.destroy();
}

// Executar como cron job diário
```

---

## 🔧 Configuração do package.json

### Scripts Adicionais
```json
{
  "scripts": {
    "finance:seed": "ts-node scripts/seed-finance.ts",
    "finance:report": "ts-node scripts/generate-revenue-report.ts",
    "finance:update-overdue": "ts-node scripts/update-overdue-installments.ts",
    "typeorm:generate": "typeorm-ts-node-commonjs migration:generate",
    "typeorm:run": "typeorm-ts-node-commonjs migration:run",
    "typeorm:revert": "typeorm-ts-node-commonjs migration:revert"
  }
}
```

---

## 📚 Documentação Swagger

### Tags e Exemplos
```typescript
// src/modules/finance/revenues/revenues.controller.ts
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Finance - Receitas')
@Controller('finance/receitas')
export class RevenuesController {
  
  @ApiOperation({ summary: 'Listar receitas paginadas' })
  @ApiQuery({ name: 'fairId', description: 'ID da feira' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Itens por página (padrão: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de receitas',
    schema: {
      example: {
        items: [
          {
            id: 'revenue_1',
            type: 'STAND',
            status: 'PENDENTE',
            contractValue: 1500000,
            paidCents: 0,
            client: { name: 'ACME S/A' }
          }
        ],
        page: 1,
        pageSize: 20,
        total: 1
      }
    }
  })
  @Get()
  async findPaginated(@Query() dto: PaginatedRevenuesDto) {
    return this.revenuesService.findPaginated(dto);
  }
}
```

---

Estes scripts e comandos fornecem uma base completa para implementar, testar e manter o módulo de receitas de forma eficiente.
