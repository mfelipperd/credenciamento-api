import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsEmail,
  IsArray,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ProspectSource, ProspectStatus, ProspectType } from '../entities/prospect.entity';

export class CreateProspectDto {
  @ApiProperty({ enum: ProspectType, example: ProspectType.VISITANTE, description: 'EXPOSITOR = comprador de stand | VISITANTE = lojista' })
  @IsEnum(ProspectType)
  type: ProspectType;

  @ApiPropertyOptional({ example: '19131243000197', description: 'CNPJ (apenas dígitos). Se informado, pode ser enriquecido via BrasilAPI.' })
  @IsOptional()
  @IsString()
  @MaxLength(14)
  cnpj?: string;

  @ApiProperty({ example: 'LOJA DO JOÃO COMÉRCIO LTDA', description: 'Razão social da empresa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  razaoSocial: string;

  @ApiPropertyOptional({ example: 'Loja do João' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nomeFantasia?: string;

  @ApiPropertyOptional({ example: 'contato@lojadojoao.com.br' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '92999990000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'Manaus' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'AM' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @ApiPropertyOptional({ enum: ProspectSource, default: ProspectSource.MANUAL })
  @IsOptional()
  @IsEnum(ProspectSource)
  source?: ProspectSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProspectDto extends PartialType(CreateProspectDto) {
  @ApiPropertyOptional({ enum: ProspectStatus })
  @IsOptional()
  @IsEnum(ProspectStatus)
  status?: ProspectStatus;
}

export class ImportCnpjsDto {
  @ApiProperty({
    type: [String],
    example: ['19131243000197', '00000000000191'],
    description: 'Lista de CNPJs (apenas dígitos ou formatados). Cada um será enriquecido via BrasilAPI.',
  })
  @IsArray()
  @IsString({ each: true })
  cnpjs: string[];

  @ApiProperty({ enum: ProspectType, example: ProspectType.VISITANTE })
  @IsEnum(ProspectType)
  type: ProspectType;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: ProspectStatus })
  @IsEnum(ProspectStatus)
  status: ProspectStatus;

  @ApiPropertyOptional({ description: 'Observação sobre o contato' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProspectFiltersDto {
  @ApiPropertyOptional({ enum: ProspectType })
  type?: ProspectType;

  @ApiPropertyOptional({ enum: ProspectStatus })
  status?: ProspectStatus;

  @ApiPropertyOptional({ example: 'AM' })
  state?: string;

  @ApiPropertyOptional({ example: 'TI e Software' })
  sector?: string;

  @ApiPropertyOptional({ example: 'loja' })
  search?: string;
}
