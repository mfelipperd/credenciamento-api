/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateVisitorInputDto {
  registrationCode: string;
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  company: string;
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @MaxLength(14)
  @MinLength(14)
  cnpj: string;
  @IsNotEmpty()
  @IsPhoneNumber('BR')
  phone: string;
  @IsNotEmpty()
  @MaxLength(8)
  @MinLength(8)
  zipCode: string;
  @IsNotEmpty()
  @IsString()
  sectors: string[];
  @IsNotEmpty()
  @IsString()
  howDidYouKnow: string;
  @IsNotEmpty()
  @IsString()
  category: string;
  @IsNotEmpty()
  fair_visitor: string;
}
