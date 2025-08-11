import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RevenueStatus, PaymentMethod } from '../common/enums/finance.enums';

export class CreateStandDto {
  @ApiProperty({
    description: 'Número do stand',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  standNumber: number;

  @ApiProperty({
    description: 'ID da feira (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  fairId: string;
}

export class UpdateStandDto {
  @ApiProperty({
    description: 'ID da receita vinculada ao stand',
    example: 'uuid-string',
    required: false,
  })
  @IsOptional()
  revenueId?: string;
}

export class StandResponseDto {
  @ApiProperty({
    description: 'ID do stand',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Número do stand',
    example: 1,
  })
  standNumber: number;

  @ApiProperty({
    description: 'ID da feira (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  fairId: string;

  @ApiProperty({
    description: 'Se o stand está disponível para venda',
    example: true,
  })
  isAvailable: boolean;

  @ApiProperty({
    description: 'ID da receita vinculada',
    example: 'uuid-string',
    required: false,
  })
  revenueId?: string;

  // Dados do cliente (quando stand está ocupado)
  @ApiProperty({
    description: 'Nome do cliente (quando vendido)',
    example: 'João Silva',
    required: false,
  })
  clientName?: string;

  @ApiProperty({
    description: 'Email do cliente',
    example: 'joao@exemplo.com',
    required: false,
  })
  clientEmail?: string;

  @ApiProperty({
    description: 'Telefone do cliente',
    example: '(11) 99999-9999',
    required: false,
  })
  clientPhone?: string;

  @ApiProperty({
    description: 'CNPJ do cliente',
    example: '12.345.678/0001-90',
    required: false,
  })
  clientCnpj?: string;

  // Dados da receita (quando stand está ocupado)
  @ApiProperty({
    description: 'Status do pagamento da receita',
    example: 'PENDENTE',
    enum: RevenueStatus,
    required: false,
  })
  revenueStatus?: RevenueStatus;

  @ApiProperty({
    description: 'Método de pagamento',
    example: 'PIX',
    enum: PaymentMethod,
    required: false,
  })
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    description: 'Valor do contrato em centavos',
    example: 250000,
    required: false,
  })
  contractValue?: number;

  @ApiProperty({
    description: 'Número de parcelas',
    example: 3,
    required: false,
  })
  numberOfInstallments?: number;

  @ApiProperty({
    description: 'Condições especiais',
    example: 'Desconto de 10% para pagamento à vista',
    required: false,
  })
  condition?: string;

  @ApiProperty({
    description: 'Observações da receita',
    example: 'Cliente solicitou posição específica',
    required: false,
  })
  notes?: string;

  // Dados do entry model
  @ApiProperty({
    description: 'Nome do tipo de stand (entry model)',
    example: 'Stand Premium 3x3',
    required: false,
  })
  entryModelName?: string;

  @ApiProperty({
    description: 'Valor base do entry model em centavos',
    example: 250000,
    required: false,
  })
  entryModelBaseValue?: number;

  @ApiProperty({
    description: 'Data de criação da receita',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  revenueCreatedAt?: Date;
}

export class ConfigureFairStandsDto {
  @ApiProperty({
    description: 'ID da feira (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  fairId: string;

  @ApiProperty({
    description: 'Quantidade total de stands na feira',
    example: 78,
    minimum: 1,
    maximum: 1000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(1000)
  totalStands: number;
}
