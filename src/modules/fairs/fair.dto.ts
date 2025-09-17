import {
  IsString,
  Length,
  IsISO8601,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStandConfigurationDto } from './dto/create-stand-configuration.dto';

export class CreateInputFairDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 255)
  location: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  googleMapsUrl?: string; // URL do Google Maps

  // Campos de endereço detalhado (opcionais)
  @IsOptional()
  @IsString()
  @Length(1, 255)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  state?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  country?: string;

  // Campos de data e hora (temporariamente opcionais para migração)
  @IsOptional()
  @IsISO8601()
  startDate?: Date; // Data de início da feira

  @IsOptional()
  @IsISO8601()
  endDate?: Date; // Data de fim da feira

  @IsOptional()
  @IsString()
  startTime?: string; // Formato HH:mm

  @IsOptional()
  @IsString()
  endTime?: string; // Formato HH:mm

  @IsOptional()
  @IsDateString()
  startDateTime?: Date;

  @IsOptional()
  @IsDateString()
  endDateTime?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalStands?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerSquareMeter?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  setupCostPerSquareMeter?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStandConfigurationDto)
  standConfigurations?: CreateStandConfigurationDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
