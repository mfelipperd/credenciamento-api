import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Allocation item ───────────────────────────────────────────────────────────

export class FairAllocationDto {
  @IsUUID()
  @IsNotEmpty()
  fairId: string;

  /**
   * Percentual desta feira (0.0001 a 1.0000).
   * Opcional — se omitido em TODOS os itens, o sistema faz divisão igualitária.
   * Se fornecido em qualquer item, todos devem ter percentual e a soma deve ser 1.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(1)
  percentual?: number;
}

// ── Create ────────────────────────────────────────────────────────────────────

export class CreateOverheadExpenseDto {
  /** ID da categoria global (finance_categories com global: true) */
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor: number;

  @IsDateString()
  data: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  /** Feiras que compartilham esta despesa */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FairAllocationDto)
  fairs: FairAllocationDto[];
}

// ── Update ────────────────────────────────────────────────────────────────────

export class UpdateOverheadExpenseDto {
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor?: number;

  @IsOptional()
  @IsDateString()
  data?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  /** Se fornecido, substitui completamente as alocações anteriores */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FairAllocationDto)
  fairs?: FairAllocationDto[];
}

// ── Response types ────────────────────────────────────────────────────────────

export interface AllocatedOverheadItem {
  id: string;
  category: { id: string; nome: string } | null;
  descricao: string | null;
  data: Date;
  valorTotal: number;
  percentualDesteFair: number;
  valorAlocado: number;
  account: { id: string; nomeConta: string; banco: string } | null;
  feirasRateadas: Array<{
    fairId: string;
    fairName: string;
    percentual: number;
  }>;
}
