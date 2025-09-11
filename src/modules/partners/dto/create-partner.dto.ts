import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNumber, IsOptional, IsBoolean, Min, Max, Length, Matches } from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty({ 
    description: 'ID do usuário associado ao sócio',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  userId: string;

  @ApiProperty({ 
    description: 'Nome completo do sócio',
    example: 'João Silva Santos'
  })
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiProperty({ 
    description: 'CPF do sócio (apenas números)',
    example: '12345678901'
  })
  @IsString()
  @Length(11, 11)
  @Matches(/^\d{11}$/, { message: 'CPF deve conter apenas números e ter 11 dígitos' })
  cpf: string;

  @ApiProperty({ 
    description: 'Email do sócio',
    example: 'joao.silva@email.com',
    required: false
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ 
    description: 'Telefone do sócio',
    example: '11999999999',
    required: false
  })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  phone?: string;

  @ApiProperty({ 
    description: 'Porcentagem de participação nos lucros (0-100)',
    example: 25.5,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({ 
    description: 'Observações sobre o sócio',
    example: 'Sócio fundador da empresa',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ 
    description: 'Se o sócio está ativo',
    example: true,
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
