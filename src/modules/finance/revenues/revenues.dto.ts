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
import { RevenueStatus, PaymentMethod } from '../common/enums/finance.enums';

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

export class RevenueResponseDto {
  @ApiProperty({ description: 'ID da receita' })
  id: number;

  @ApiProperty({ description: 'ID do cliente' })
  clientId: number;

  @ApiProperty({ description: 'ID do modelo de lançamento' })
  entryModelId: number;

  @ApiProperty({ description: 'Descrição da receita' })
  description: string;

  @ApiProperty({ description: 'Valor total da receita' })
  totalValue: number;

  @ApiProperty({ description: 'Data de vencimento' })
  dueDate: Date;

  @ApiProperty({ description: 'Status da receita', enum: RevenueStatus })
  status: RevenueStatus;

  @ApiProperty({ description: 'Observações', required: false })
  notes?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}

export class InstallmentResponseDto {
  @ApiProperty({ description: 'ID da parcela' })
  id: number;

  @ApiProperty({ description: 'ID da receita' })
  revenueId: number;

  @ApiProperty({ description: 'Número da parcela' })
  installmentNumber: number;

  @ApiProperty({ description: 'Valor da parcela' })
  value: number;

  @ApiProperty({ description: 'Data de vencimento' })
  dueDate: Date;

  @ApiProperty({ description: 'Data de pagamento', required: false })
  paymentDate?: Date;

  @ApiProperty({
    description: 'Método de pagamento',
    enum: PaymentMethod,
    required: false,
  })
  paymentMethod?: PaymentMethod;

  @ApiProperty({ description: 'Descrição da parcela', required: false })
  description?: string;

  @ApiProperty({
    description: 'Observações sobre o pagamento',
    required: false,
  })
  paymentNotes?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}
