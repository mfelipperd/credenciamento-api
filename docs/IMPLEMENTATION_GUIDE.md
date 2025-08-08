# Guia de Implementação - Módulo de Receitas

## 🏗️ Ordem de Implementação

### 1. Setup Inicial

#### 1.1 Instalar Dependências

```bash
npm install class-validator class-transformer @nestjs/typeorm typeorm
npm install --save-dev @types/multer
```

#### 1.2 Criar Estrutura de Pastas

```
src/modules/finance/
├── finance.module.ts
├── clients/
├── entry-models/
└── revenues/
```

### 2. Implementação por Módulos

#### 2.1 Módulo de Clientes (Primeiro - Independente)

**Entidade Client**

```typescript
// src/modules/finance/clients/entities/client.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Revenue } from '../../revenues/entities/revenue.entity';

@Entity('finance_clients')
@Index(['name'])
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

  @OneToMany(() => Revenue, (revenue) => revenue.client)
  revenues: Revenue[];
}
```

**DTO Client**

```typescript
// src/modules/finance/clients/dto/create-client.dto.ts
import { IsString, IsOptional, IsEmail, Matches } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsOptional()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve ter 14 dígitos' })
  cnpj?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

// src/modules/finance/clients/dto/paginated-clients.dto.ts
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PaginatedClientsDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 1)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 20)
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  q?: string; // busca por nome/cnpj
}
```

**Service Client**

```typescript
// src/modules/finance/clients/clients.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { PaginatedClientsDto } from './dto/paginated-clients.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const client = this.clientRepository.create(createClientDto);
    return await this.clientRepository.save(client);
  }

  async findForAutocomplete(query: string): Promise<Client[]> {
    if (!query || query.length < 2) return [];

    return await this.clientRepository.find({
      where: [{ name: Like(`%${query}%`) }, { cnpj: Like(`%${query}%`) }],
      take: 10,
      order: { name: 'ASC' },
    });
  }

  async findPaginated(dto: PaginatedClientsDto) {
    const { page, pageSize, q } = dto;
    const query = this.clientRepository.createQueryBuilder('client');

    if (q && q.trim()) {
      query.where('client.name LIKE :search OR client.cnpj LIKE :search', {
        search: `%${q.trim()}%`,
      });
    }

    query.orderBy('client.name', 'ASC');

    const total = await query.getCount();
    const items = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return client;
  }
}
```

**Controller Client**

```typescript
// src/modules/finance/clients/clients.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { PaginatedClientsDto } from './dto/paginated-clients.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RoleGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { EUserRole } from '../../../enum/role';

@Controller('finance/clients')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(EUserRole.ADMIN)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('autocomplete')
  async autocomplete(@Query('q') query: string) {
    return await this.clientsService.findForAutocomplete(query);
  }

  @Get('paginated')
  async findPaginated(@Query() dto: PaginatedClientsDto) {
    return await this.clientsService.findPaginated(dto);
  }

  @Post()
  async create(@Body() createClientDto: CreateClientDto) {
    return await this.clientsService.create(createClientDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.clientsService.findOne(id);
  }
}
```

#### 2.2 Módulo de Modelos de Entrada (Entry Models)

**Entidade EntryModel**

```typescript
// src/modules/finance/entry-models/entities/entry-model.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Revenue } from '../../revenues/entities/revenue.entity';

export enum EntryModelType {
  STAND = 'STAND',
  PATROCINIO = 'PATROCINIO',
}

@Entity('finance_entry_models')
@Index(['fairId', 'type', 'active'])
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
  name: string;

  @Column('bigint')
  baseValue: number; // centavos

  @Column('bigint', { nullable: true })
  costCents: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Revenue, (revenue) => revenue.entryModel)
  revenues: Revenue[];
}
```

#### 2.3 Módulo de Receitas (Principal)

**Enums para Receitas**

```typescript
// src/modules/finance/revenues/enums/revenue.enums.ts
export enum RevenueStatus {
  PENDENTE = 'PENDENTE',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  EM_ATRASO = 'EM_ATRASO',
  PAGO = 'PAGO',
  CANCELADO = 'CANCELADO',
}

export enum InstallmentStatus {
  A_VENCER = 'A_VENCER',
  VENCIDA = 'VENCIDA',
  PAGA = 'PAGA',
  CANCELADA = 'CANCELADA',
}

export enum PaymentMethod {
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CARTAO = 'CARTAO',
  TED = 'TED',
  DINHEIRO = 'DINHEIRO',
}
```

**Entidade Revenue Principal**

```typescript
// src/modules/finance/revenues/entities/revenue.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { Client } from '../../clients/entities/client.entity';
import {
  EntryModel,
  EntryModelType,
} from '../../entry-models/entities/entry-model.entity';
import { RevenueInstallment } from './revenue-installment.entity';
import { Attachment } from './attachment.entity';
import {
  RevenueStatus,
  PaymentMethod,
  InstallmentStatus,
} from '../enums/revenue.enums';

@Entity('finance_revenues')
@Index(['fairId', 'status', 'type'])
@Index(['clientId'])
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
  baseValue: number;

  @Column('bigint')
  discountCents: number;

  @Column('bigint')
  contractValue: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  condition: string;

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

  // Campos calculados (usar em DTOs ou services)
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

#### 2.4 Service Principal com Lógica de Negócio

**Utils para Status**

```typescript
// src/modules/finance/revenues/utils/status.utils.ts
import { RevenueStatus, InstallmentStatus } from '../enums/revenue.enums';
import { RevenueInstallment } from '../entities/revenue-installment.entity';

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

export function generateInstallmentDates(
  count: number,
  firstDate: Date,
  periodicity: string = 'MENSAL',
): Date[] {
  const dates: Date[] = [];

  for (let i = 0; i < count; i++) {
    const date = new Date(firstDate);

    if (periodicity === 'MENSAL') {
      date.setMonth(date.getMonth() + i);
    } else if (periodicity === 'SEMANAL') {
      date.setDate(date.getDate() + i * 7);
    } else if (periodicity === 'QUINZENAL') {
      date.setDate(date.getDate() + i * 15);
    }

    dates.push(date);
  }

  return dates;
}

export function distributeValueInInstallments(
  totalValue: number,
  count: number,
): number[] {
  const baseValue = Math.floor(totalValue / count);
  const remainder = totalValue % count;

  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    // Adiciona o resto na última parcela
    const value = i === count - 1 ? baseValue + remainder : baseValue;
    values.push(value);
  }

  return values;
}
```

**Service Principal de Receitas**

```typescript
// src/modules/finance/revenues/revenues.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Revenue } from './entities/revenue.entity';
import { RevenueInstallment } from './entities/revenue-installment.entity';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { PaginatedRevenuesDto } from './dto/paginated-revenues.dto';
import { User } from '../../users/entitie/users.entity';
import {
  deriveRevenueStatus,
  generateInstallmentDates,
  distributeValueInInstallments,
} from './utils/status.utils';
import { RevenueStatus, InstallmentStatus } from './enums/revenue.enums';

@Injectable()
export class RevenuesService {
  constructor(
    @InjectRepository(Revenue)
    private revenueRepository: Repository<Revenue>,
    @InjectRepository(RevenueInstallment)
    private installmentRepository: Repository<RevenueInstallment>,
  ) {}

  async create(
    createRevenueDto: CreateRevenueDto,
    user: User,
  ): Promise<Revenue> {
    // Validações
    this.validateRevenueData(createRevenueDto);

    // Criar receita
    const revenue = this.revenueRepository.create({
      ...createRevenueDto,
      createdBy: user.id,
      status: RevenueStatus.PENDENTE,
    });

    const savedRevenue = await this.revenueRepository.save(revenue);

    // Gerar parcelas
    await this.generateInstallments(
      savedRevenue.id,
      createRevenueDto.installments,
    );

    // Retornar com parcelas
    return await this.findOneWithInstallments(savedRevenue.id);
  }

  async findPaginated(dto: PaginatedRevenuesDto) {
    const { fairId, page, pageSize, type, status, q, dateField, from, to } =
      dto;

    const query = this.revenueRepository
      .createQueryBuilder('revenue')
      .leftJoinAndSelect('revenue.client', 'client')
      .leftJoinAndSelect('revenue.entryModel', 'entryModel')
      .leftJoinAndSelect('revenue.installments', 'installments')
      .where('revenue.fairId = :fairId', { fairId });

    // Filtros
    if (type && type !== 'all') {
      const typeEnum = type.toUpperCase();
      query.andWhere('revenue.type = :type', { type: typeEnum });
    }

    if (status && status !== 'all') {
      const statusEnum = status.toUpperCase();
      query.andWhere('revenue.status = :status', { status: statusEnum });
    } else {
      // Por padrão, ocultar cancelados
      query.andWhere('revenue.status != :cancelado', {
        cancelado: RevenueStatus.CANCELADO,
      });
    }

    if (q && q.trim()) {
      query.andWhere('client.name LIKE :search', { search: `%${q.trim()}%` });
    }

    if (from && to) {
      const dateColumn = this.getDateColumnForFilter(dateField);
      query.andWhere(`${dateColumn} BETWEEN :from AND :to`, { from, to });
    }

    // Ordenação FIXA por status
    query.addSelect(
      `
      CASE revenue.status
        WHEN '${RevenueStatus.PENDENTE}' THEN 1
        WHEN '${RevenueStatus.EM_ANDAMENTO}' THEN 2
        WHEN '${RevenueStatus.EM_ATRASO}' THEN 3
        WHEN '${RevenueStatus.PAGO}' THEN 4
        WHEN '${RevenueStatus.CANCELADO}' THEN 5
        ELSE 6
      END
    `,
      'status_order',
    );

    query.orderBy('status_order', 'ASC');
    query.addOrderBy('client.name', 'ASC');

    // Paginação
    const total = await query.getCount();
    const items = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    // Calcular campos derivados
    const enhancedItems = items.map((revenue) => ({
      ...revenue,
      paidCents: revenue.paidCents,
      openCents: revenue.openCents,
      nextDueDate: revenue.nextDueDate,
    }));

    return {
      items: enhancedItems,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private async generateInstallments(
    revenueId: string,
    installmentsConfig: any,
  ): Promise<void> {
    const { count, firstDueDate, periodicity, customDates } =
      installmentsConfig;
    const revenue = await this.revenueRepository.findOne({
      where: { id: revenueId },
    });

    let dates: Date[];
    if (customDates && customDates.length === count) {
      dates = customDates.map((d: string) => new Date(d));
    } else {
      dates = generateInstallmentDates(
        count,
        new Date(firstDueDate),
        periodicity,
      );
    }

    const values = distributeValueInInstallments(revenue.contractValue, count);

    const installments = dates.map((date, index) => ({
      revenueId,
      n: index + 1,
      dueDate: date,
      valueCents: values[index],
      status: InstallmentStatus.A_VENCER,
    }));

    await this.installmentRepository.save(installments);
  }

  private validateRevenueData(dto: CreateRevenueDto): void {
    if (dto.discountCents > dto.baseValue) {
      throw new BadRequestException(
        'Desconto não pode ser maior que o valor base',
      );
    }

    const calculatedContractValue = dto.baseValue - dto.discountCents;
    if (
      calculatedContractValue !== dto.contractValue ||
      dto.contractValue < 0
    ) {
      throw new BadRequestException('Valor do contrato inválido');
    }
  }

  private getDateColumnForFilter(dateField: string): string {
    switch (dateField) {
      case 'contrato':
        return 'revenue.createdAt';
      case 'vencimento':
        return 'installments.dueDate';
      case 'pagamento':
        return 'installments.paidAt';
      default:
        return 'revenue.createdAt';
    }
  }

  private async findOneWithInstallments(id: string): Promise<Revenue> {
    return await this.revenueRepository.findOne({
      where: { id },
      relations: ['client', 'entryModel', 'installments', 'attachments'],
    });
  }
}
```

### 3. Comandos para Geração

```bash
# Gerar módulos
nest g module finance
nest g module finance/clients
nest g module finance/entry-models
nest g module finance/revenues

# Gerar controllers
nest g controller finance/clients
nest g controller finance/entry-models
nest g controller finance/revenues

# Gerar services
nest g service finance/clients
nest g service finance/entry-models
nest g service finance/revenues
nest g service finance/revenues/analytics
```

### 4. Próximos Passos

1. **Implementar clientes primeiro** (independente)
2. **Implementar modelos de entrada** (depende de feira)
3. **Implementar receitas principais** (depende de clientes e modelos)
4. **Adicionar analytics** (depende de receitas)
5. **Implementar upload de anexos**
6. **Criar testes**
7. **Documentar com Swagger**

### 5. Configuração do Módulo Principal

```typescript
// src/modules/finance/finance.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from './clients/clients.module';
import { EntryModelsModule } from './entry-models/entry-models.module';
import { RevenuesModule } from './revenues/revenues.module';

@Module({
  imports: [ClientsModule, EntryModelsModule, RevenuesModule],
})
export class FinanceModule {}
```

Este guia fornece uma base sólida para começar a implementação. Cada seção pode ser desenvolvida incrementalmente e testada independentemente.
