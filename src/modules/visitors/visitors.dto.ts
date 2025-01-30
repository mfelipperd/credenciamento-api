/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ECategory } from 'src/enum/category';
import { EHowDidYouKnow } from 'src/enum/didyouknow';

export class CreateVisitorInputDto {
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
  @MaxLength(100)
  street: string;
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  neighborhood: string;
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  city: string;
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  state: string;
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  sectors: string;
  @IsNotEmpty()
  @IsEnum(EHowDidYouKnow)
  howDidYouKnow: EHowDidYouKnow;
  @IsNotEmpty()
  @IsEnum(ECategory)
  category: ECategory;
}
