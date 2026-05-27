import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FairAllocationItemDto {
  @IsUUID()
  @IsNotEmpty()
  fairId: string;

  /**
   * Percentual decimal (0.0001 – 1.0).
   * Opcional: se omitido em TODOS, o sistema divide igualmente.
   * Se fornecido em qualquer item, todos devem ter e a soma = 1.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(1)
  percentual?: number;
}

/**
 * Body de POST /expenses/:id/set-overhead
 * Marca uma despesa direta como overhead e define o rateio entre feiras.
 */
export class SetOverheadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FairAllocationItemDto)
  fairs: FairAllocationItemDto[];
}
