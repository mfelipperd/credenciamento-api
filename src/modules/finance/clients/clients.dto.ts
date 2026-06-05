import {
  IsString,
  IsEmail,
  IsOptional,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClientImageFairDto {
  @ApiProperty({ description: 'ID da relação imagem-feira' })
  id: string;

  @ApiProperty({ description: 'ID da feira' })
  fairId: string;

  @ApiProperty({ description: 'Data de vinculação' })
  createdAt: Date;
}

export class ClientImageResponseDto {
  @ApiProperty({ description: 'ID da imagem' })
  id: string;

  @ApiProperty({ description: 'ID do cliente' })
  clientId: string;

  @ApiProperty({ description: 'ID da feira de origem' })
  registeredFairId: string;

  @ApiProperty({ description: 'URL pública da imagem' })
  url: string;

  @ApiPropertyOptional({ description: 'Legenda da imagem' })
  caption?: string;

  @ApiProperty({ type: [ClientImageFairDto], description: 'Feiras vinculadas à imagem' })
  fairs: ClientImageFairDto[];

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;
}

export class UploadClientImagesDto {
  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' }, description: 'Arquivos de imagem (máx. 10)' })
  images: any[];

  @ApiPropertyOptional({ description: 'Legenda para todas as imagens do lote' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string;
}

export class CreateClientDto {
  @ApiProperty({
    description: 'ID da feira',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  fairId: string;

  @ApiProperty({ description: 'Nome do cliente', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'CNPJ do cliente', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnpj?: string;

  @ApiPropertyOptional({ description: 'Email do cliente' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone do cliente' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Nome do responsável pelo cliente',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  responsavel?: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional({ description: 'Nome do cliente', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'CNPJ do cliente', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnpj?: string;

  @ApiPropertyOptional({ description: 'Email do cliente' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone do cliente' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Nome do responsável pelo cliente',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  responsavel?: string;
}

export class BrandResponseDto {
  @ApiProperty({ description: 'ID da marca' })
  id: string;

  @ApiProperty({ description: 'ID do cliente' })
  clientId: string;

  @ApiProperty({ description: 'Nome da marca' })
  name: string;

  @ApiProperty({ description: 'URL do logotipo da marca' })
  logoUrl: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}

export class CreateBrandDto {
  @ApiProperty({ description: 'Nome da marca', example: 'Minha Marca' })
  @IsString()
  name: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Logotipo da marca (imagem)' })
  logo: any;
}

export class UpdateBrandDto {
  @ApiPropertyOptional({ description: 'Nome da marca', example: 'Minha Nova Marca' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Novo logotipo da marca (imagem)' })
  @IsOptional()
  logo?: any;
}

export class ClientResponseDto {
  @ApiProperty({ description: 'ID do cliente' })
  id: string;

  @ApiProperty({ description: 'ID da feira à qual o cliente pertence' })
  fairId: string;

  @ApiProperty({ description: 'Nome do cliente' })
  name: string;

  @ApiProperty({ description: 'CNPJ do cliente', required: false })
  cnpj?: string;

  @ApiProperty({ description: 'Email do cliente', required: false })
  email?: string;

  @ApiProperty({ description: 'Telefone do cliente', required: false })
  phone?: string;

  @ApiProperty({
    description: 'Nome do responsável pelo cliente',
    required: false,
  })
  responsavel?: string;

  @ApiProperty({ type: [BrandResponseDto], description: 'Marcas associadas ao cliente', required: false })
  brands?: BrandResponseDto[];

  @ApiPropertyOptional({
    description: 'Indica se o expositor está participando da feira consultada (presente quando fairId é informado na query)',
  })
  isParticipatingInFair?: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}

