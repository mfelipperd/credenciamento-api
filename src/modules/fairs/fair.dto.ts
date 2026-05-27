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
  IsEnum,
  IsUrl,
  Matches,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStandConfigurationDto } from './dto/create-stand-configuration.dto';
import { FairStatus } from './entity/fair.entity';

export class CreateFairDayScheduleDto {
  /** Data do dia no formato YYYY-MM-DD */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve estar no formato YYYY-MM-DD' })
  date: string;

  /** Horário de abertura no formato HH:mm */
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime deve estar no formato HH:mm' })
  startTime: string;

  /** Horário de encerramento no formato HH:mm */
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime deve estar no formato HH:mm' })
  endTime: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  note?: string;
}

export class CreateInputFairDto {
  // ── Identidade ──────────────────────────────────────────────────────────

  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  edition?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  @Length(1, 500)
  bannerUrl?: string;

  @IsOptional()
  @IsEnum(FairStatus)
  status?: FairStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // ── Local / Endereço ────────────────────────────────────────────────────

  /** Campo legado — manter para compatibilidade */
  @IsString()
  @Length(1, 255)
  location: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  venueName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  number?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  complement?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  /**
   * UF obrigatório para novas feiras — 2 letras maiúsculas.
   * Exemplos: "AM", "PA", "SP"
   */
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'state deve ser a UF em 2 letras maiúsculas (ex: AM, PA)' })
  state?: string;

  @IsOptional()
  @IsString()
  @Length(8, 10)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  googleMapsUrl?: string;

  /** Latitude do local para gerar links de transporte */
  @IsOptional()
  @IsNumber()
  latitude?: number;

  /** Longitude do local para gerar links de transporte */
  @IsOptional()
  @IsNumber()
  longitude?: number;

  // ── Datas e horários ────────────────────────────────────────────────────

  @IsOptional()
  @IsISO8601()
  startDate?: Date;

  @IsOptional()
  @IsISO8601()
  endDate?: Date;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime deve estar no formato HH:mm' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime deve estar no formato HH:mm' })
  endTime?: string;

  @IsOptional()
  @IsDateString()
  startDateTime?: Date;

  @IsOptional()
  @IsDateString()
  endDateTime?: Date;

  /** Programação por dia com horários diferentes */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFairDayScheduleDto)
  daySchedules?: CreateFairDayScheduleDto[];

  // ── Planejamento ────────────────────────────────────────────────────────

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVisitors?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedExhibitors?: number;

  // ── Configurações de stands ─────────────────────────────────────────────

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
}
