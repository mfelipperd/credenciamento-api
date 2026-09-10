import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'joao.silva@email.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'joao.silva@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos recebido por email' })
  @IsNotEmpty()
  @Length(6, 6)
  code: string;

  @ApiProperty({ example: 'minhaNovaSenha123', minLength: 8 })
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}

export class FirstAccessDto {
  @ApiProperty({ example: 'joao.silva@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos recebido por email' })
  @IsNotEmpty()
  @Length(6, 6)
  code: string;

  @ApiProperty({ example: 'minhaSenha123', minLength: 8 })
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
