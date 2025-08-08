import { IsString, IsOptional, IsEmail, Matches } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsOptional()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve ter 14 dígitos' })
  cnpj?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
