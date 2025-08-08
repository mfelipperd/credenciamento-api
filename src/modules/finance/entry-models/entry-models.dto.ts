import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntryModelType } from '../common/enums/finance.enums';

export class CreateEntryModelDto {
  @ApiProperty({ description: 'Nome do modelo de lançamento', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Tipo do modelo',
    enum: EntryModelType,
    example: EntryModelType.STAND,
  })
  @IsEnum(EntryModelType)
  type: EntryModelType;

  @ApiPropertyOptional({
    description: 'Valor fixo (para tipo FIXED_VALUE)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedValue?: number;

  @ApiPropertyOptional({
    description: 'Número de parcelas (para tipo INSTALLMENT)',
    minimum: 1,
    maximum: 240,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(240)
  installments?: number;

  @ApiPropertyOptional({ description: 'Descrição do modelo', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateEntryModelDto {
  @ApiPropertyOptional({
    description: 'Nome do modelo de lançamento',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Tipo do modelo',
    enum: EntryModelType,
  })
  @IsOptional()
  @IsEnum(EntryModelType)
  type?: EntryModelType;

  @ApiPropertyOptional({
    description: 'Valor fixo (para tipo FIXED_VALUE)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedValue?: number;

  @ApiPropertyOptional({
    description: 'Número de parcelas (para tipo INSTALLMENT)',
    minimum: 1,
    maximum: 240,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(240)
  installments?: number;

  @ApiPropertyOptional({ description: 'Descrição do modelo', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class EntryModelResponseDto {
  @ApiProperty({ description: 'ID do modelo' })
  id: string;

  @ApiProperty({ description: 'Nome do modelo de lançamento' })
  name: string;

  @ApiProperty({ description: 'Tipo do modelo', enum: EntryModelType })
  type: EntryModelType;

  @ApiProperty({
    description: 'Valor fixo (para tipo FIXED_VALUE)',
    required: false,
  })
  fixedValue?: number;

  @ApiProperty({
    description: 'Número de parcelas (para tipo INSTALLMENT)',
    required: false,
  })
  installments?: number;

  @ApiProperty({ description: 'Descrição do modelo', required: false })
  description?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}
