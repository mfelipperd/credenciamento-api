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

  // Campos de data e hora
  @IsISO8601()
  date: Date;

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

  // Novos campos para análise de negócio
  @IsOptional()
  @IsDateString()
  endDate?: Date;

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
