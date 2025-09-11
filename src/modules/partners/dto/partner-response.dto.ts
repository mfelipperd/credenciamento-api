import { ApiProperty } from '@nestjs/swagger';
import { Partner } from '../entities/partner.entity';

export class PartnerResponseDto {
  @ApiProperty({ description: 'ID do sócio' })
  id: string;

  @ApiProperty({ description: 'ID do usuário associado' })
  userId: string;

  @ApiProperty({ description: 'Nome do sócio' })
  name: string;

  @ApiProperty({ description: 'CPF do sócio' })
  cpf: string;

  @ApiProperty({ description: 'Email do sócio', required: false })
  email?: string;

  @ApiProperty({ description: 'Telefone do sócio', required: false })
  phone?: string;

  @ApiProperty({ description: 'Porcentagem de participação' })
  percentage: number;

  @ApiProperty({ description: 'Total de ganhos acumulados' })
  totalEarnings: number;

  @ApiProperty({ description: 'Total já sacado' })
  totalWithdrawn: number;

  @ApiProperty({ description: 'Saldo disponível para saque' })
  availableBalance: number;

  @ApiProperty({ description: 'Se está ativo' })
  isActive: boolean;

  @ApiProperty({ description: 'Observações', required: false })
  notes?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  constructor(partner: Partner) {
    this.id = partner.id;
    this.userId = partner.userId;
    this.name = partner.name;
    this.cpf = partner.cpf;
    this.email = partner.email;
    this.phone = partner.phone;
    this.percentage = partner.percentage;
    this.totalEarnings = partner.totalEarnings;
    this.totalWithdrawn = partner.totalWithdrawn;
    this.availableBalance = partner.availableBalance;
    this.isActive = partner.isActive;
    this.notes = partner.notes;
    this.createdAt = partner.createdAt;
    this.updatedAt = partner.updatedAt;
  }
}
