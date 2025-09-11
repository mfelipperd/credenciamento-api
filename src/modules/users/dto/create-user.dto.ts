import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsOptional, IsBoolean, MinLength, MaxLength, Length, Matches } from 'class-validator';
import { EUserRole } from '../../../enum/role';

export class CreateUserDto {
  @ApiProperty({ 
    description: 'Nome completo do usuário',
    example: 'João Silva Santos'
  })
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiProperty({ 
    description: 'Email do usuário',
    example: 'joao.silva@email.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: 'Senha do usuário (mínimo 8 caracteres)',
    example: 'minhasenha123',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password: string;

  @ApiProperty({ 
    description: 'Role do usuário',
    enum: EUserRole,
    example: EUserRole.ADMIN
  })
  @IsEnum(EUserRole)
  role: EUserRole;

  @ApiProperty({ 
    description: 'CPF do usuário (apenas números)',
    example: '12345678901',
    required: false
  })
  @IsOptional()
  @IsString()
  @Length(11, 11)
  @Matches(/^\d{11}$/, { message: 'CPF deve conter apenas números e ter 11 dígitos' })
  cpf?: string;

  @ApiProperty({ 
    description: 'Telefone do usuário',
    example: '11999999999',
    required: false
  })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  phone?: string;

  @ApiProperty({ 
    description: 'Se o usuário está ativo',
    example: true,
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Observações sobre o usuário',
    example: 'Usuário responsável pela área de vendas',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
