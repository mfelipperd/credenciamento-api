import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @IsUUID()
  @IsNotEmpty()
  fairId: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsNumber()
  @Min(0.01)
  valor: number;

  @IsDateString()
  @IsNotEmpty()
  data: string;

  @IsString()
  @IsOptional()
  observacoes?: string;
}
