import {
  IsString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  IsUUID,
} from 'class-validator';

export class UpdateVisitorDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  sectors?: string[];
  @IsOptional() @IsString() howDidYouKnow?: string;
  @IsOptional() @IsString() category?: string;
  // se quiser permitir atualizar a data de registro
  @IsOptional() @IsString() registrationDate?: string;

  /** lista de IDs de feiras que ficarão associadas ao visitante */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  fairIds?: string[];
}
