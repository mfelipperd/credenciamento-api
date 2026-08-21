import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntryModelType } from '../common/enums/finance.enums';

export class CreateEntryModelDto {
  @ApiProperty({ description: 'ID da feira' })
  @IsString()
  fairId: string;

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

  @ApiProperty({ description: 'Valor base em centavos', minimum: 0 })
  @IsNumber()
  @Min(0)
  baseValue: number;

  @ApiPropertyOptional({ description: 'Custo em centavos', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costCents?: number;

  @ApiPropertyOptional({ description: 'Se o modelo está ativo', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
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

  @ApiPropertyOptional({ description: 'Valor base em centavos', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseValue?: number;

  @ApiPropertyOptional({ description: 'Custo em centavos', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costCents?: number;

  @ApiPropertyOptional({ description: 'Se o modelo está ativo' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class EntryModelResponseDto {
  @ApiProperty({ description: 'ID do modelo' })
  id: string;

  @ApiProperty({ description: 'ID da feira' })
  fairId: string;

  @ApiProperty({ description: 'Nome do modelo de lançamento' })
  name: string;

  @ApiProperty({ description: 'Tipo do modelo', enum: EntryModelType })
  type: EntryModelType;

  @ApiProperty({ description: 'Valor base em centavos' })
  baseValue: number;

  @ApiProperty({ description: 'Custo em centavos', required: false })
  costCents?: number;

  @ApiProperty({ description: 'Se o modelo está ativo' })
  active: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}
