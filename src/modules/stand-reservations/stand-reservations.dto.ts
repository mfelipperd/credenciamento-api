import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateStandReservationDto {
  @ApiProperty({ description: 'ID da feira (UUID)' })
  @IsString()
  fairId: string;

  @ApiProperty({
    description: 'IDs dos stands escolhidos no mapa (podem ser vários)',
    type: [Number],
    example: [12, 13],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  standIds: number[];

  @ApiProperty({ example: 'Indústria Exemplo Ltda' })
  @IsString()
  @MaxLength(255)
  companyName: string;

  @ApiPropertyOptional({ example: '12345678000199' })
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiProperty({ example: 'contato@industriaexemplo.com.br' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '(91) 98283-6424' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: ['pix', 'card'], example: 'pix' })
  @IsIn(['pix', 'card'])
  paymentMethod: 'pix' | 'card';

  @ApiPropertyOptional({ description: 'Token do cartão gerado pelo SDK JS do Mercado Pago (obrigatório se paymentMethod = card)' })
  @ValidateIf((dto) => dto.paymentMethod === 'card')
  @IsString()
  cardToken?: string;

  @ApiPropertyOptional({ description: 'Bandeira/ID do meio de pagamento (ex: master, visa) — obrigatório se paymentMethod = card' })
  @ValidateIf((dto) => dto.paymentMethod === 'card')
  @IsString()
  cardPaymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Número de parcelas — obrigatório se paymentMethod = card' })
  @ValidateIf((dto) => dto.paymentMethod === 'card')
  @IsInt()
  @Min(1)
  installments?: number;

  @ApiPropertyOptional({ description: 'ID do banco emissor do cartão' })
  @IsOptional()
  @IsString()
  issuerId?: string;
}
