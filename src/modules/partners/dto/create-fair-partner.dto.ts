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

export class CreateFairPartnerDto {
  @ApiProperty({
    description: 'ID da feira',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  fairId: string;

  @ApiProperty({
    description: 'ID do sócio',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  partnerId: string;

  @ApiProperty({
    description: 'Porcentagem de participação nesta feira (0-100)',
    example: 25.5,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({
    description: 'Se o sócio está ativo nesta feira',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Observações específicas desta feira',
    example: 'Sócio responsável pela área de marketing',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  notes?: string;
}
