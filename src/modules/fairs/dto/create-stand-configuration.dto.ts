import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CreateStandConfigurationDto {
  @ApiProperty({
    description: 'Nome da configuração do stand',
    example: 'Stand 2x3',
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiProperty({
    description: 'Largura do stand em metros',
    example: 2,
    minimum: 1,
    maximum: 20,
  })
  @IsNumber()
  @Min(1)
  @Max(20)
  width: number;

  @ApiProperty({
    description: 'Altura do stand em metros',
    example: 3,
    minimum: 1,
    maximum: 20,
  })
  @IsNumber()
  @Min(1)
  @Max(20)
  height: number;

  @ApiProperty({
    description: 'Quantidade disponível deste tipo de stand',
    example: 10,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    description: 'Preço por metro quadrado',
    example: 150.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  pricePerSquareMeter: number;

  @ApiProperty({
    description: 'Custo de montagem por metro quadrado',
    example: 50.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  setupCostPerSquareMeter: number;

  @ApiProperty({
    description:
      'Valor de mercado projetado (âncora), exibido riscado ao lado do preço real no site',
    example: 7873.41,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  anchorPrice?: number;

  @ApiProperty({
    description: 'Descrição do stand',
    example: 'Stand padrão 2x3 metros, ideal para pequenas empresas',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Se a configuração está ativa',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
