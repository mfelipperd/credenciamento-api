import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RevenueStatus,
  PaymentMethod,
  InstallmentStatus,
} from '../common/enums/finance.enums';

export class CreateRevenueDto {
  @ApiProperty({ description: 'ID da feira' })
  @IsString()
  fairId: string;

  @ApiProperty({ description: 'ID do cliente' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: 'ID do modelo de lançamento' })
  @IsString()
  entryModelId: string;

  @ApiPropertyOptional({
    description:
      'Número do stand a ser vinculado à receita (opcional para receitas que não são de venda de stands)',
    example: 15,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  standNumber?: number | null;

  @ApiProperty({ description: 'Valor base', minimum: 0 })
  @IsNumber()
  @Min(0)
  baseValue: number;

  @ApiProperty({ description: 'Desconto em centavos', minimum: 0 })
  @IsNumber()
  @Min(0)
  discountCents: number;

  @ApiProperty({ description: 'Valor do contrato', minimum: 0 })
  @IsNumber()
  @Min(0)
  contractValue: number;

  @ApiProperty({
    description: 'Método de pagamento',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Número de parcelas', minimum: 1, default: 1 })
  @IsNumber()
  @Min(1)
  numberOfInstallments: number;

  @ApiPropertyOptional({ description: 'Condições', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  condition?: string;

  @ApiPropertyOptional({ description: 'Observações', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ description: 'Criado por' })
  @IsString()
  createdBy: string;
}

export class UpdateRevenueDto {
  @ApiPropertyOptional({ description: 'ID do cliente' })
  @IsOptional()
  @IsNumber()
  clientId?: number;

  @ApiPropertyOptional({ description: 'ID do modelo de lançamento' })
  @IsOptional()
  @IsNumber()
  entryModelId?: number;

  @ApiPropertyOptional({ description: 'Descrição da receita', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Valor total da receita', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalValue?: number;

  @ApiPropertyOptional({ description: 'Data de vencimento' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Status da receita',
    enum: RevenueStatus,
  })
  @IsOptional()
  @IsEnum(RevenueStatus)
  status?: RevenueStatus;

  @ApiPropertyOptional({ description: 'Observações', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateInstallmentDto {
  @ApiProperty({ description: 'Número da parcela', minimum: 1 })
  @IsNumber()
  @Min(1)
  installmentNumber: number;

  @ApiProperty({ description: 'Valor da parcela', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;

  @ApiProperty({ description: 'Data de vencimento' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ description: 'Descrição da parcela', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateInstallmentDto {
  @ApiPropertyOptional({ description: 'Data de pagamento' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({
    description: 'Método de pagamento',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Observações sobre o pagamento',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentNotes?: string;
}

export class CreateRevenueWithInstallmentsDto extends CreateRevenueDto {
  @ApiProperty({
    description: 'Parcelas da receita',
    type: [CreateInstallmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInstallmentDto)
  installments: CreateInstallmentDto[];
}

export class InstallmentResponseDto {
  @ApiProperty({ description: 'ID da parcela' })
  id: string;

  @ApiProperty({ description: 'ID da receita' })
  revenueId: string;

  @ApiProperty({ description: 'Número da parcela' })
  n: number;

  @ApiProperty({ description: 'Valor da parcela em centavos' })
  valueCents: number;

  @ApiProperty({ description: 'Data de vencimento' })
  dueDate: Date;

  @ApiProperty({ description: 'Data de pagamento', required: false })
  paidAt?: Date;

  @ApiProperty({
    description: 'Status da parcela',
    enum: InstallmentStatus,
  })
  status: InstallmentStatus;

  @ApiProperty({ description: 'URL do comprovante', required: false })
  proofUrl?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}

export class RevenueResponseDto {
  @ApiProperty({ description: 'ID da receita' })
  id: string;

  @ApiProperty({ description: 'ID da feira' })
  fairId: string;

  @ApiProperty({ description: 'Tipo do modelo', enum: ['STAND', 'PATROCINIO'] })
  type: string;

  @ApiProperty({ description: 'ID do modelo de lançamento' })
  entryModelId: string;

  @ApiProperty({ description: 'ID do cliente' })
  clientId: string;

  @ApiProperty({ description: 'Valor base' })
  baseValue: number;

  @ApiProperty({ description: 'Desconto em centavos' })
  discountCents: number;

  @ApiProperty({ description: 'Valor do contrato' })
  contractValue: number;

  @ApiProperty({ description: 'Método de pagamento', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Número de parcelas' })
  numberOfInstallments: number;

  @ApiProperty({ description: 'Condições', required: false })
  condition?: string;

  @ApiProperty({ description: 'Status da receita', enum: RevenueStatus })
  status: RevenueStatus;

  @ApiProperty({ description: 'Observações', required: false })
  notes?: string;

  @ApiProperty({ description: 'Criado por' })
  createdBy: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  @ApiProperty({ description: 'Cliente relacionado', required: false })
  client?: {
    id: string;
    name: string;
    email?: string;
    cnpj?: string;
  };

  @ApiProperty({
    description: 'Modelo de lançamento relacionado',
    required: false,
  })
  entryModel?: {
    id: string;
    name: string;
    type: string;
  };

  @ApiProperty({
    description: 'Parcelas da receita',
    type: [InstallmentResponseDto],
  })
  installments: InstallmentResponseDto[];

  @ApiProperty({
    description: 'Informações do stand vinculado (se houver)',
    required: false,
  })
  stand?: {
    id: number;
    standNumber: number;
    isAvailable: boolean;
  };
}

export class ConfirmInstallmentPaymentDto {
  @ApiProperty({ description: 'Data de pagamento' })
  @IsDateString()
  paidAt: Date;

  @ApiPropertyOptional({ description: 'URL do comprovante', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  proofUrl?: string;
}
