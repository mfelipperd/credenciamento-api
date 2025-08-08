import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
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
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone do cliente' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class ClientResponseDto {
  @ApiProperty({ description: 'ID do cliente' })
  id: string;

  @ApiProperty({ description: 'Nome do cliente' })
  name: string;

  @ApiProperty({ description: 'CNPJ do cliente', required: false })
  cnpj?: string;

  @ApiProperty({ description: 'Email do cliente', required: false })
  email?: string;

  @ApiProperty({ description: 'Telefone do cliente', required: false })
  phone?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}
