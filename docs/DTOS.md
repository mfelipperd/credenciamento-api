# DTOs - Módulo de Receitas

## 📝 Data Transfer Objects (DTOs)

### 🏢 Clientes (Clients)

#### CreateClientDto
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
```

#### UpdateClientDto
```typescript
// src/modules/finance/clients/dto/update-client.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {}
```

#### PaginatedClientsDto
```typescript
// src/modules/finance/clients/dto/paginated-clients.dto.ts
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

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
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  q?: string; // busca por nome/cnpj
}
```

---

### 🏗️ Modelos de Entrada (Entry Models)

#### CreateEntryModelDto
```typescript
// src/modules/finance/entry-models/dto/create-entry-model.dto.ts
import { IsString, IsEnum, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';
import { EntryModelType } from '../entities/entry-model.entity';

export class CreateEntryModelDto {
  @IsUUID()
  fairId: string;

  @IsEnum(EntryModelType)
  type: EntryModelType;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  baseValue: number; // em centavos

  @IsOptional()
  @IsNumber()
  @Min(0)
  costCents?: number; // em centavos
}
```

#### UpdateEntryModelDto
```typescript
// src/modules/finance/entry-models/dto/update-entry-model.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateEntryModelDto } from './create-entry-model.dto';

export class UpdateEntryModelDto extends PartialType(
  OmitType(CreateEntryModelDto, ['fairId'] as const)
) {}
```

#### QueryEntryModelsDto
```typescript
// src/modules/finance/entry-models/dto/query-entry-models.dto.ts
import { IsUUID, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { EntryModelType } from '../entities/entry-model.entity';

export class QueryEntryModelsDto {
  @IsUUID()
  fairId: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  active?: boolean = true;

  @IsOptional()
  @IsEnum(EntryModelType)
  type?: EntryModelType;
}
```

---

### 💰 Receitas (Revenues)

#### CreateRevenueDto
```typescript
// src/modules/finance/revenues/dto/create-revenue.dto.ts
import { 
  IsUUID, IsEnum, IsNumber, IsString, IsOptional, 
  ValidateNested, Min, IsArray, Type 
} from 'class-validator';
import { EntryModelType } from '../../entry-models/entities/entry-model.entity';
import { PaymentMethod } from '../enums/revenue.enums';

export class InstallmentsConfigDto {
  @IsNumber()
  @Min(1)
  @Max(24)
  count: number;

  @IsString()
  firstDueDate: string; // ISO date string

  @IsOptional()
  @IsString()
  periodicity?: string = 'MENSAL'; // MENSAL, SEMANAL, QUINZENAL

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customDates?: string[]; // array de ISO date strings (sobrescreve periodicity)
}

export class AttachmentUploadDto {
  @IsString()
  filename: string;

  @IsString()
  url: string;

  @IsString()
  mime: string;

  @IsNumber()
  sizeBytes: number;
}

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
  baseValue: number; // centavos

  @IsNumber()
  @Min(0)
  discountCents: number; // centavos

  @IsNumber()
  @Min(0)
  contractValue: number; // centavos (deve ser baseValue - discountCents)

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  condition?: string; // "avista" | "parcelado"

  @IsOptional()
  @IsString()
  notes?: string;

  @ValidateNested()
  @Type(() => InstallmentsConfigDto)
  installments: InstallmentsConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentUploadDto)
  attachments?: AttachmentUploadDto[];
}
```

#### UpdateRevenueDto
```typescript
// src/modules/finance/revenues/dto/update-revenue.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateRevenueDto } from './create-revenue.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateRevenueDto extends PartialType(
  OmitType(CreateRevenueDto, ['fairId', 'type', 'installments'] as const)
) {}

export class CancelRevenueDto {
  @IsString()
  reason: string;
}
```

#### PaginatedRevenuesDto
```typescript
// src/modules/finance/revenues/dto/paginated-revenues.dto.ts
import { Transform } from 'class-transformer';
import { 
  IsUUID, IsNumber, IsOptional, IsString, IsEnum, 
  IsDateString, Min, Max 
} from 'class-validator';

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
  from?: string; // ISO date

  @IsOptional()
  @IsDateString()
  to?: string; // ISO date
}
```

#### RevenueKpisDto
```typescript
// src/modules/finance/revenues/dto/revenue-kpis.dto.ts
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

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

---

### 📊 Analytics

#### AnalyticsBaseDto
```typescript
// src/modules/finance/revenues/dto/analytics.dto.ts
import { Transform } from 'class-transformer';
import { 
  IsUUID, IsOptional, IsDateString, IsEnum, 
  IsNumber, Min, Max 
} from 'class-validator';
import { EntryModelType } from '../../entry-models/entities/entry-model.entity';

export class AnalyticsBaseDto {
  @IsUUID()
  fairId: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AnalyticsPerPeriodDto extends AnalyticsBaseDto {
  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  granularity?: string = 'month';
}

export class TopEmpresasDto extends AnalyticsBaseDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 10)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['contratado', 'pago'])
  metric?: string = 'contratado';
}

export class PorModeloDto extends AnalyticsBaseDto {
  @IsOptional()
  @IsEnum(EntryModelType)
  tipo?: EntryModelType;
}
```

---

### 💳 Parcelas (Installments)

#### UpdateInstallmentDto
```typescript
// src/modules/finance/revenues/dto/update-installment.dto.ts
import { IsDateString, IsNumber, Min } from 'class-validator';

export class UpdateInstallmentDto {
  @IsDateString()
  dueDate: string;

  @IsNumber()
  @Min(0)
  valueCents: number;
}
```

#### PayInstallmentDto
```typescript
// src/modules/finance/revenues/dto/pay-installment.dto.ts
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class PayInstallmentDto {
  @IsDateString()
  paidAt: string; // ISO datetime

  @IsOptional()
  @IsString()
  proofUrl?: string; // URL do comprovante
}
```

#### GenerateInstallmentsDto
```typescript
// src/modules/finance/revenues/dto/generate-installments.dto.ts
import { IsNumber, IsString, IsOptional, IsArray, Min, Max } from 'class-validator';

export class GenerateInstallmentsDto {
  @IsNumber()
  @Min(1)
  @Max(24)
  count: number;

  @IsString()
  firstDueDate: string; // ISO date

  @IsOptional()
  @IsString()
  periodicity?: string = 'MENSAL';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customDates?: string[]; // array de ISO dates
}
```

---

### 📎 Anexos (Attachments)

#### CreateAttachmentDto
```typescript
// src/modules/finance/revenues/dto/create-attachment.dto.ts
import { IsString, IsNumber, IsIn } from 'class-validator';

export class CreateAttachmentDto {
  @IsString()
  filename: string;

  @IsString()
  url: string;

  @IsString()
  @IsIn(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'])
  mime: string;

  @IsNumber()
  sizeBytes: number;

  @IsString()
  @IsIn(['revenue', 'installment'])
  entityType: string;

  @IsString()
  entityId: string;
}
```

---

### 📤 Response DTOs

#### PaginatedResponseDto
```typescript
// src/modules/finance/common/dto/paginated-response.dto.ts
export class PaginatedResponseDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

#### RevenueKpisResponseDto
```typescript
// src/modules/finance/revenues/dto/revenue-kpis-response.dto.ts
export class RevenueKpisResponseDto {
  totalStandsVendidos: number; // centavos
  totalPatrocinios: number; // centavos
  totalPago: number; // centavos
  totalEstimado: number; // centavos
}
```

#### AnalyticsPerPeriodResponseDto
```typescript
// src/modules/finance/revenues/dto/analytics-response.dto.ts
export class AnalyticsPerPeriodResponseDto {
  period: string; // YYYY-MM-DD
  qtd?: number;
  totalContrato?: number; // centavos
  totalRecebido?: number; // centavos
}

export class TopEmpresasResponseDto {
  clientId: string;
  client: string;
  totalContrato?: number; // centavos
  totalPago?: number; // centavos
}

export class PorTipoResponseDto {
  tipo: string; // STAND | PATROCINIO
  totalContrato: number; // centavos
}

export class PorModeloResponseDto {
  modeloId: string;
  nome: string;
  totalContrato: number; // centavos
}
```

---

### 🛡️ Decoradores Customizados

#### IsCentsValue (Validador personalizado)
```typescript
// src/modules/finance/common/decorators/is-cents-value.decorator.ts
import { 
  registerDecorator, ValidationOptions, ValidatorConstraint, 
  ValidatorConstraintInterface 
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsCentsValueConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    return typeof value === 'number' && value >= 0 && Number.isInteger(value);
  }

  defaultMessage() {
    return 'O valor deve ser um número inteiro positivo (centavos)';
  }
}

export function IsCentsValue(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCentsValueConstraint,
    });
  };
}
```

#### IsValidCNPJ (Validador personalizado)
```typescript
// src/modules/finance/common/decorators/is-valid-cnpj.decorator.ts
import { 
  registerDecorator, ValidationOptions, ValidatorConstraint, 
  ValidatorConstraintInterface 
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidCNPJConstraint implements ValidatorConstraintInterface {
  validate(cnpj: string) {
    if (!cnpj) return true; // opcional
    
    // Remove caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    // Deve ter 14 dígitos
    if (cleanCNPJ.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
    
    // Validação dos dígitos verificadores
    return this.validateCNPJDigits(cleanCNPJ);
  }

  private validateCNPJDigits(cnpj: string): boolean {
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    // Primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj[i]) * weights1[i];
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (parseInt(cnpj[12]) !== digit1) return false;
    
    // Segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj[i]) * weights2[i];
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return parseInt(cnpj[13]) === digit2;
  }

  defaultMessage() {
    return 'CNPJ inválido';
  }
}

export function IsValidCNPJ(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCNPJConstraint,
    });
  };
}
```

---

### 📋 Exemplo de Uso dos DTOs

#### No Controller
```typescript
// src/modules/finance/revenues/revenues.controller.ts
import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { PaginatedRevenuesDto } from './dto/paginated-revenues.dto';

@Controller('finance/receitas')
export class RevenuesController {
  @Post()
  async create(@Body() createRevenueDto: CreateRevenueDto) {
    // DTO automaticamente validado pelo ValidationPipe
    return this.revenuesService.create(createRevenueDto);
  }

  @Get()
  async findPaginated(@Query() dto: PaginatedRevenuesDto) {
    // Query parameters automaticamente transformados e validados
    return this.revenuesService.findPaginated(dto);
  }
}
```

#### Configuração do ValidationPipe
```typescript
// src/main.ts
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Remove propriedades não definidas no DTO
    forbidNonWhitelisted: true, // Rejeita propriedades não permitidas
    transform: true, // Transforma tipos automaticamente
    transformOptions: {
      enableImplicitConversion: true, // Conversão implícita de tipos
    },
  }),
);
```

---

### 📝 Checklist de DTOs

- [x] ✅ **Clients**: Create, Update, Paginated
- [x] ✅ **Entry Models**: Create, Update, Query
- [x] ✅ **Revenues**: Create, Update, Paginated, KPIs, Cancel
- [x] ✅ **Installments**: Update, Pay, Generate
- [x] ✅ **Analytics**: PerPeriod, TopEmpresas, PorTipo, PorModelo
- [x] ✅ **Attachments**: Create
- [x] ✅ **Response DTOs**: Paginated, KPIs, Analytics
- [x] ✅ **Custom Validators**: CentsValue, ValidCNPJ

Todos os DTOs estão prontos para implementação e incluem validações robustas, transformações automáticas e documentação clara para facilitar o desenvolvimento do módulo de receitas.
