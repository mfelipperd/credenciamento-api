import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ 
    description: 'Senha atual',
    example: 'senhaatual123'
  })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  currentPassword: string;

  @ApiProperty({ 
    description: 'Nova senha (mínimo 8 caracteres)',
    example: 'novasenha123',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  newPassword: string;
}
