import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length, MinLength } from 'class-validator';

export class ExhibitorLoginDto {
  @ApiProperty({ example: 'contato@industriaexemplo.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'minhaSenha123' })
  @IsNotEmpty()
  password: string;
}

export class ExhibitorFirstAccessDto {
  @ApiProperty({ example: 'contato@industriaexemplo.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos recebido por email após o pagamento' })
  @IsNotEmpty()
  @Length(6, 6)
  code: string;

  @ApiProperty({ example: 'minhaSenha123', minLength: 8 })
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
