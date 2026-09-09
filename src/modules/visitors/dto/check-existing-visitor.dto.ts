import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CheckExistingVisitorDto {
  @ApiPropertyOptional({ description: 'Email completo do visitante' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone completo do visitante (com ou sem formatação)' })
  @IsOptional()
  @IsString()
  phone?: string;
}
