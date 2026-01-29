import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
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
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street: string;
  @IsOptional()
  @IsString()
  @MaxLength(50)
  number: string;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  complement: string;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  neighborhood: string;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  city: string;
  @IsOptional()
  @IsString()
  @MaxLength(2)
  state: string;
  @IsNotEmpty()
  @IsArray()
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
