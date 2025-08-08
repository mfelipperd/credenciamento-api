# Módulo Financeiro → Receitas

## 📋 Objetivo

Registrar vendas de stands e patrocínios por feira a partir de modelos de entrada configurados por feira. Controlar parcelas (a receber), baixas e comprovantes. Expor KPIs e gráficos (analytics) para análise.

## 🎯 Premissas & Padrões

### Financeiro

- **Moeda**: Armazenar em centavos (Int) e exibir com 2 casas decimais
- **Timezone**: America/Belem
- **Juros/Multa**: Não implementar no MVP

### Autenticação

- **Permissão**: Somente admin acessa este submódulo
- **Auth Guard**: Aplicar `@UseGuards(JwtAuthGuard, RoleGuard)` com role ADMIN

### Regras de Negócio

- **Clientes**: Globais (não possuem fairId)
- **Modelos de entrada**: Por feira (stands/patrocínios)
- **Parcelamento**: Permitir mensal por padrão, mas com datas editáveis
- **Anexos**: PDF/JPG, até 10 MB por arquivo (múltiplos por receita e por parcela)

### Status de Receita (derivado das parcelas)

1. **PENDENTE** - Nenhuma parcela paga
2. **EM_ANDAMENTO** - Algumas pagas, outras a vencer
3. **EM_ATRASO** - Alguma parcela vencida não paga
4. **PAGO** - Todas as parcelas pagas
5. **CANCELADO** - Cancelamento manual

### Ordenação da Listagem (FIXA)

```sql
ORDER BY
  CASE revenue.status
    WHEN 'PENDENTE' THEN 1
    WHEN 'EM_ANDAMENTO' THEN 2
    WHEN 'EM_ATRASO' THEN 3
    WHEN 'PAGO' THEN 4
    WHEN 'CANCELADO' THEN 5
    ELSE 6
  END ASC,
  next_due_date ASC NULLS LAST,
  client_name ASC
```

### Paginação

- **page**: 1-based (padrão: 1)
- **pageSize**: Padrão 20, máximo 100
- **Cancelados**: Ocultos por padrão (filtro explícito para exibir)

## 🗄️ Modelagem de Dados

### Enums

```typescript
enum EntryModelType {
  STAND = 'STAND',
  PATROCINIO = 'PATROCINIO',
}

enum RevenueStatus {
  PENDENTE = 'PENDENTE',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  EM_ATRASO = 'EM_ATRASO',
  PAGO = 'PAGO',
  CANCELADO = 'CANCELADO',
}

enum InstallmentStatus {
  A_VENCER = 'A_VENCER',
  VENCIDA = 'VENCIDA',
  PAGA = 'PAGA',
  CANCELADA = 'CANCELADA',
}

enum PaymentMethod {
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CARTAO = 'CARTAO',
  TED = 'TED',
  DINHEIRO = 'DINHEIRO',
}
```

### Entidades TypeORM

#### EntryModel (Modelos de Entrada)

```typescript
@Entity('entry_models')
export class EntryModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fairId: string;

  @Column({
    type: 'enum',
    enum: EntryModelType,
  })
  type: EntryModelType;

  @Column()
  name: string; // ex: "Stand 3x3", "Patrocínio Gold"

  @Column('bigint')
  baseValue: number; // centavos

  @Column('bigint', { nullable: true })
  costCents: number; // custo opcional para análise interna

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @OneToMany(() => Revenue, (revenue) => revenue.entryModel)
  revenues: Revenue[];
}
```

#### Client (Clientes Globais)

```typescript
@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  cnpj: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @OneToMany(() => Revenue, (revenue) => revenue.client)
  revenues: Revenue[];
}
```

#### Revenue (Contratos de Receita)

```typescript
@Entity('revenues')
export class Revenue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fairId: string;

  @Column({
    type: 'enum',
    enum: EntryModelType,
  })
  type: EntryModelType;

  @Column()
  entryModelId: string;

  @Column()
  clientId: string;

  @Column('bigint')
  baseValue: number; // valor base do modelo no momento da venda

  @Column('bigint')
  discountCents: number; // desconto em centavos

  @Column('bigint')
  contractValue: number; // baseValue - discountCents

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  condition: string; // "avista" | "parcelado"

  @Column({
    type: 'enum',
    enum: RevenueStatus,
    default: RevenueStatus.PENDENTE,
  })
  status: RevenueStatus;

  @Column('text', { nullable: true })
  notes: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => EntryModel, (entryModel) => entryModel.revenues)
  @JoinColumn({ name: 'entryModelId' })
  entryModel: EntryModel;

  @ManyToOne(() => Client, (client) => client.revenues)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @OneToMany(() => RevenueInstallment, (installment) => installment.revenue, {
    cascade: true,
  })
  installments: RevenueInstallment[];

  @OneToMany(() => Attachment, (attachment) => attachment.revenue)
  attachments: Attachment[];

  // Campos calculados
  @Expose()
  get paidCents(): number {
    return (
      this.installments
        ?.filter((i) => i.status === InstallmentStatus.PAGA)
        .reduce((sum, i) => sum + i.valueCents, 0) || 0
    );
  }

  @Expose()
  get openCents(): number {
    return this.contractValue - this.paidCents;
  }

  @Expose()
  get nextDueDate(): Date | null {
    const openInstallments = this.installments
      ?.filter(
        (i) =>
          i.status === InstallmentStatus.A_VENCER ||
          i.status === InstallmentStatus.VENCIDA,
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return openInstallments?.[0]?.dueDate || null;
  }
}
```

#### RevenueInstallment (Parcelas)

```typescript
@Entity('revenue_installments')
export class RevenueInstallment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  revenueId: string;

  @Column()
  n: number; // número da parcela (1..N)

  @Column()
  dueDate: Date;

  @Column('bigint')
  valueCents: number;

  @Column({
    type: 'enum',
    enum: InstallmentStatus,
    default: InstallmentStatus.A_VENCER,
  })
  status: InstallmentStatus;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  proofUrl: string; // comprovante (opcional MVP)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => Revenue, (revenue) => revenue.installments)
  @JoinColumn({ name: 'revenueId' })
  revenue: Revenue;

  @OneToMany(() => Attachment, (attachment) => attachment.installment)
  attachments: Attachment[];
}
```

#### Attachment (Anexos)

```typescript
@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string; // "revenue" | "installment"

  @Column()
  entityId: string;

  @Column()
  filename: string;

  @Column()
  url: string;

  @Column()
  mime: string;

  @Column()
  sizeBytes: number;

  @Column()
  uploadedBy: string;

  @CreateDateColumn()
  uploadedAt: Date;

  // Relacionamentos
  @ManyToOne(() => Revenue, (revenue) => revenue.attachments, {
    nullable: true,
  })
  @JoinColumn({ name: 'entityId' })
  revenue: Revenue;

  @ManyToOne(
    () => RevenueInstallment,
    (installment) => installment.attachments,
    { nullable: true },
  )
  @JoinColumn({ name: 'entityId' })
  installment: RevenueInstallment;
}
```

## 🔄 Regras de Negócio Essenciais

### 1. Derivação Automática do Status da Receita

```typescript
export function deriveRevenueStatus(
  installments: RevenueInstallment[],
): RevenueStatus {
  if (!installments || installments.length === 0) {
    return RevenueStatus.PENDENTE;
  }

  const anyPaid = installments.some((i) => i.status === InstallmentStatus.PAGA);
  const anyOpen = installments.some(
    (i) =>
      i.status === InstallmentStatus.A_VENCER ||
      i.status === InstallmentStatus.VENCIDA,
  );
  const anyLate = installments.some(
    (i) => i.status === InstallmentStatus.VENCIDA,
  );

  if (installments.every((i) => i.status === InstallmentStatus.PAGA)) {
    return RevenueStatus.PAGO;
  }

  if (anyLate) {
    return RevenueStatus.EM_ATRASO;
  }

  if (anyPaid && anyOpen) {
    return RevenueStatus.EM_ANDAMENTO;
  }

  return RevenueStatus.PENDENTE;
}
```

### 2. Atualização Automática de Parcelas Vencidas

```typescript
// Cron diário ou a cada busca
export async function updateOverdueInstallments(): Promise<void> {
  const today = new Date();

  await this.installmentRepository
    .createQueryBuilder()
    .update(RevenueInstallment)
    .set({ status: InstallmentStatus.VENCIDA })
    .where('dueDate < :today', { today })
    .andWhere('status = :status', { status: InstallmentStatus.A_VENCER })
    .execute();
}
```

### 3. Validações Críticas

```typescript
// Validação de desconto
if (discountCents > baseValue) {
  throw new BadRequestException('Desconto não pode ser maior que o valor base');
}

// Validação de valor do contrato
const calculatedContractValue = baseValue - discountCents;
if (calculatedContractValue !== contractValue || contractValue < 0) {
  throw new BadRequestException('Valor do contrato inválido');
}

// Validação de parcelas
const totalInstallments = installments.reduce(
  (sum, i) => sum + i.valueCents,
  0,
);
if (totalInstallments !== contractValue) {
  throw new BadRequestException(
    'Soma das parcelas deve ser igual ao valor do contrato',
  );
}
```

## 📱 DTOs (Data Transfer Objects)

### CreateRevenueDto

```typescript
export class CreateRevenueDto {
  @IsUUID()
  fairId: string;

  @IsEnum(EntryModelType)
  type: EntryModelType;

  @IsUUID()
  entryModelId: string;

  @IsUUID()
  clientId: string;

  @IsNumber()
  @Min(0)
  baseValue: number;

  @IsNumber()
  @Min(0)
  discountCents: number;

  @IsNumber()
  @Min(0)
  contractValue: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @ValidateNested()
  @Type(() => InstallmentsConfigDto)
  installments: InstallmentsConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class InstallmentsConfigDto {
  @IsNumber()
  @Min(1)
  @Max(24)
  count: number;

  @IsDateString()
  firstDueDate: string;

  @IsOptional()
  @IsString()
  periodicity?: string; // 'MENSAL' (default)

  @IsOptional()
  @IsArray()
  @IsDateString({ each: true })
  customDates?: string[]; // sobrescreve periodicidade
}
```

### PaginatedRevenuesDto

```typescript
export class PaginatedRevenuesDto {
  @IsUUID()
  fairId: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 1)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 20)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsEnum(['stand', 'patrocinio', 'all'])
  type?: string = 'all';

  @IsOptional()
  @IsEnum(['pendente', 'em_andamento', 'em_atraso', 'pago', 'cancelado', 'all'])
  status?: string = 'all';

  @IsOptional()
  @IsString()
  q?: string; // busca por nome da empresa

  @IsOptional()
  @IsEnum(['contrato', 'vencimento', 'pagamento'])
  dateField?: string = 'contrato';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
```

### RevenueKpisDto

```typescript
export class RevenueKpisDto {
  @IsUUID()
  fairId: string;

  @IsOptional()
  @IsDateString()
  from?: string; // default: início do mês corrente

  @IsOptional()
  @IsDateString()
  to?: string; // default: fim do mês corrente
}
```

### AnalyticsDto

```typescript
export class AnalyticsDto {
  @IsUUID()
  fairId: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  granularity?: string = 'month';

  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 10)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['contratado', 'pago'])
  metric?: string = 'contratado';

  @IsOptional()
  @IsEnum(['STAND', 'PATROCINIO'])
  tipo?: EntryModelType;
}
```

## 🛣️ Estrutura de Rotas

```
src/modules/finance/
├── finance.module.ts
├── revenues/
│   ├── revenues.module.ts
│   ├── revenues.controller.ts
│   ├── revenues.service.ts
│   ├── dto/
│   │   ├── create-revenue.dto.ts
│   │   ├── update-revenue.dto.ts
│   │   ├── paginated-revenues.dto.ts
│   │   ├── revenue-kpis.dto.ts
│   │   └── analytics.dto.ts
│   ├── entities/
│   │   ├── revenue.entity.ts
│   │   ├── revenue-installment.entity.ts
│   │   └── attachment.entity.ts
│   └── services/
│       ├── revenue-analytics.service.ts
│       └── installment.service.ts
├── entry-models/
│   ├── entry-models.module.ts
│   ├── entry-models.controller.ts
│   ├── entry-models.service.ts
│   ├── dto/
│   │   ├── create-entry-model.dto.ts
│   │   └── update-entry-model.dto.ts
│   └── entities/
│       └── entry-model.entity.ts
└── clients/
    ├── clients.module.ts
    ├── clients.controller.ts
    ├── clients.service.ts
    ├── dto/
    │   ├── create-client.dto.ts
    │   └── paginated-clients.dto.ts
    └── entities/
        └── client.entity.ts
```

## 📡 Rotas da API

### Prefixo Base: `/api/finance`

#### 1. Receitas (Contratos)

```typescript
// Listar receitas (paginada + ordenada por status)
GET /receitas?fairId&page&pageSize&type&status&q&dateField&from&to

// KPIs (cards da tela)
GET /receitas/kpis?fairId&from&to

// Criar receita (contrato)
POST /receitas

// Detalhar receita
GET /receitas/:id

// Atualizar receita
PUT /receitas/:id

// Cancelar receita
PATCH /receitas/:id/cancel

// Gerar/Regenerar parcelas
POST /receitas/:id/parcelas/generate

// Anexos do contrato
POST /receitas/:id/attachments
DELETE /receitas/:id/attachments/:attachmentId
```

#### 2. Parcelas

```typescript
// Editar parcela
PUT /parcelas/:installmentId

// Baixar parcela (marcar como paga)
PATCH /parcelas/:installmentId/baixa

// Cancelar parcela
PATCH /parcelas/:installmentId/cancel

// Anexos da parcela
POST /parcelas/:installmentId/attachments
DELETE /parcelas/:installmentId/attachments/:attachmentId
```

#### 3. Analytics (ApexCharts)

```typescript
// Contratos por período (quantidade e valor)
GET /receitas/analytics/contratos-por-periodo?fairId&from&to&granularity

// Recebido (caixa) por período
GET /receitas/analytics/recebido-por-periodo?fairId&from&to&granularity

// Top empresas
GET /receitas/analytics/top-empresas?fairId&from&to&metric&limit

// Distribuição por tipo
GET /receitas/analytics/por-tipo?fairId&from&to

// Distribuição por modelo
GET /receitas/analytics/por-modelo?fairId&from&to&tipo
```

#### 4. Modelos de Entrada

```typescript
// Listar modelos
GET /entry-models?fairId&active

// Criar modelo
POST /entry-models

// Editar modelo
PUT /entry-models/:id

// Arquivar/Reativar modelo
PATCH /entry-models/:id/archive
```

#### 5. Clientes (Globais)

```typescript
// Autocomplete de clientes
GET /clients?q

// Criar cliente
POST /clients

// Listar clientes paginado
GET /clients/paginated?page&pageSize&q

// Detalhar cliente
GET /clients/:id

// Editar cliente
PUT /clients/:id
```

## 🔒 Segurança & Validações

### Guards Necessários

```typescript
@Controller('finance')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(EUserRole.ADMIN)
export class FinanceController {
  // Todas as rotas protegidas por admin
}
```

### Validações de Upload

```typescript
@UseInterceptors(FileInterceptor('file', {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Apenas PDF e imagens são permitidos'), false);
    }
  },
}))
```

### Auditoria (Opcional)

```typescript
// Interceptor para log de operações críticas
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, body } = request;

    // Log operações de CREATE, UPDATE, DELETE
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      this.auditService.log({
        userId: user.id,
        action: `${method} ${url}`,
        payload: body,
        timestamp: new Date(),
      });
    }

    return next.handle();
  }
}
```

## 🧪 Casos de Teste Essenciais

### 1. Fluxo Completo de Receita

```typescript
describe('Revenue Flow', () => {
  it('should create revenue with installments and track status changes', async () => {
    // 1. Criar receita STAND com 3 parcelas
    const revenue = await createRevenue({
      type: 'STAND',
      contractValue: 150000, // R$ 1.500,00
      installments: { count: 3, firstDueDate: '2025-09-10' },
    });

    expect(revenue.status).toBe('PENDENTE');
    expect(revenue.installments).toHaveLength(3);
    expect(revenue.installments.reduce((sum, i) => sum + i.valueCents, 0)).toBe(
      150000,
    );

    // 2. Baixar primeira parcela
    await payInstallment(revenue.installments[0].id);
    const updated = await getRevenue(revenue.id);
    expect(updated.status).toBe('EM_ANDAMENTO');

    // 3. Vencer segunda parcela (simular data passada)
    await makeInstallmentOverdue(revenue.installments[1].id);
    const overdue = await getRevenue(revenue.id);
    expect(overdue.status).toBe('EM_ATRASO');

    // 4. Baixar todas as parcelas
    await payInstallment(revenue.installments[1].id);
    await payInstallment(revenue.installments[2].id);
    const paid = await getRevenue(revenue.id);
    expect(paid.status).toBe('PAGO');
  });
});
```

### 2. Ordenação da Listagem

```typescript
describe('Revenue Listing Order', () => {
  it('should return revenues ordered by status priority', async () => {
    // Criar receitas com diferentes status
    const pendente = await createRevenueWithStatus('PENDENTE');
    const emAndamento = await createRevenueWithStatus('EM_ANDAMENTO');
    const emAtraso = await createRevenueWithStatus('EM_ATRASO');
    const pago = await createRevenueWithStatus('PAGO');

    const response = await request(app)
      .get('/api/finance/receitas')
      .query({ fairId: 'test-fair' });

    const statuses = response.body.items.map((r) => r.status);
    expect(statuses).toEqual(['PENDENTE', 'EM_ANDAMENTO', 'EM_ATRASO', 'PAGO']);
  });
});
```

### 3. KPIs Calculation

```typescript
describe('Revenue KPIs', () => {
  it('should calculate correct totals', async () => {
    // Setup: criar receitas de diferentes tipos e parcelas pagas
    await createRevenueWithPaidInstallments('STAND', 100000, 50000); // R$ 500 pago
    await createRevenueWithPaidInstallments('PATROCINIO', 80000, 80000); // R$ 800 pago

    const kpis = await request(app)
      .get('/api/finance/receitas/kpis')
      .query({ fairId: 'test-fair' });

    expect(kpis.body).toEqual({
      totalStandsVendidos: 100000,
      totalPatrocinios: 80000,
      totalPago: 130000, // 50000 + 80000
      totalEstimado: 180000, // 100000 + 80000
    });
  });
});
```

### 4. Analytics

```typescript
describe('Revenue Analytics', () => {
  it('should return correct period buckets', async () => {
    // Criar receitas em diferentes meses
    await createRevenueInDate('2025-06-15', 100000);
    await createRevenueInDate('2025-07-20', 150000);

    const analytics = await request(app)
      .get('/api/finance/receitas/analytics/contratos-por-periodo')
      .query({
        fairId: 'test-fair',
        from: '2025-06-01',
        to: '2025-07-31',
        granularity: 'month',
      });

    expect(analytics.body).toEqual([
      { period: '2025-06-01', qtd: 1, totalContrato: 100000 },
      { period: '2025-07-01', qtd: 1, totalContrato: 150000 },
    ]);
  });
});
```

## 📊 Configuração para ApexCharts

### Exemplo de Response para Gráficos

#### 1. Gráfico de Linhas (Contratos por Período)

```json
{
  "series": [
    {
      "name": "Valor Contratado",
      "data": [8200000, 5100000, 7300000]
    },
    {
      "name": "Quantidade",
      "data": [8, 5, 9]
    }
  ],
  "categories": ["Jun 2025", "Jul 2025", "Ago 2025"]
}
```

#### 2. Gráfico de Pizza (Por Tipo)

```json
{
  "series": [9800000, 2600000],
  "labels": ["Stands", "Patrocínios"]
}
```

#### 3. Gráfico de Barras (Top Empresas)

```json
{
  "series": [
    {
      "name": "Valor Contratado",
      "data": [4200000, 3600000, 2800000]
    }
  ],
  "categories": ["ACME S/A", "Beta Ltda", "Gamma Corp"]
}
```

## 🚀 Próximos Passos

1. **Implementar Entidades**: Criar todas as entidades TypeORM com relacionamentos
2. **Criar Services**: Implementar lógica de negócio com validações
3. **Implementar Controllers**: Criar rotas com DTOs e validações
4. **Configurar Guards**: Aplicar autenticação e autorização admin
5. **Implementar Analytics**: Criar service específico para gráficos
6. **Testes**: Implementar testes unitários e de integração
7. **Documentação Swagger**: Documentar todas as rotas

## 📞 Perguntas Finais

1. **Top empresas**: Limit padrão 10? ✅
2. **Granularidade padrão**: Mensal para gráficos de período? ✅
3. **Cancelados**: Ocultos por padrão (filtro "exibir cancelados")? ✅
4. **Janela padrão**: Últimos 6 meses ou mês corrente para KPIs? → **Mês corrente**

---

## 📝 Checklist de Implementação

- [ ] Criar entidades TypeORM
- [ ] Implementar enums e DTOs
- [ ] Criar módulo de clientes globais
- [ ] Criar módulo de modelos de entrada
- [ ] Implementar módulo principal de receitas
- [ ] Criar service de analytics
- [ ] Implementar upload de anexos
- [ ] Configurar guards de admin
- [ ] Criar testes unitários
- [ ] Documentar com Swagger
- [ ] Implementar cron para parcelas vencidas
- [ ] Configurar índices de performance
