import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Length, IsUUID } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty({ 
    description: 'ID da feira',
    example: '0299a14d-10f1-4799-bf18-a0ecfec99d62'
  })
  @IsUUID()
  fairId: string;

  @ApiProperty({ 
    description: 'Valor do saque',
    example: 5000.00,
    minimum: 0.01
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ 
    description: 'Motivo do saque',
    example: 'Retirada mensal de lucros',
    required: false
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;

  @ApiProperty({ 
    description: 'Dados bancários para transferência',
    example: 'Banco: 001, Agência: 1234, Conta: 56789-0',
    required: false
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  bankDetails?: string;

  @ApiProperty({ 
    description: 'Observações adicionais',
    example: 'Transferência urgente',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
