import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateFinanceCategoryDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsBoolean()
  @IsOptional()
  global?: boolean;

  @IsUUID()
  @IsOptional()
  fairId?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
