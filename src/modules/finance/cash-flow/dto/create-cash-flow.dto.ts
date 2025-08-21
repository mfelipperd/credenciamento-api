import {
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCashFlowDto {
  @ApiProperty({
    description: 'ID da feira',
    example: '89d8a3ce-36b0-4fe9-b338-ca46fc5855e3',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  fairId: string;

  @ApiProperty({
    description: 'Período de referência (mês/ano)',
    example: '2025-01-31',
    type: 'string',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  period: string; // Formato: YYYY-MM-DD

  @ApiPropertyOptional({
    description:
      'Total de receitas para o período (calculado automaticamente se não fornecido)',
    example: 15000.0,
    type: 'number',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalRevenue?: number;

  @ApiPropertyOptional({
    description:
      'Total de despesas para o período (calculado automaticamente se não fornecido)',
    example: 8000.0,
    type: 'number',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalExpenses?: number;

  @ApiPropertyOptional({
    description: 'Observações sobre o período',
    example: 'Janeiro 2025 - Alta temporada de feiras',
    type: 'string',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
