import { ApiProperty } from '@nestjs/swagger';
import { FairPartner } from '../entities/fair-partner.entity';

export class FairPartnerResponseDto {
  @ApiProperty({ description: 'ID da associação feira-sócio' })
  id: string;

  @ApiProperty({ description: 'ID da feira' })
  fairId: string;

  @ApiProperty({ description: 'ID do sócio' })
  partnerId: string;

  @ApiProperty({ description: 'Porcentagem de participação nesta feira' })
  percentage: number;

  @ApiProperty({ description: 'Ganhos específicos desta feira' })
  totalEarnings: number;

  @ApiProperty({ description: 'Saques específicos desta feira' })
  totalWithdrawn: number;

  @ApiProperty({ description: 'Saldo disponível desta feira' })
  availableBalance: number;

  @ApiProperty({ description: 'Saques pendentes nesta feira' })
  pendingWithdrawals: number;

  @ApiProperty({ description: 'Se está ativo nesta feira' })
  isActive: boolean;

  @ApiProperty({
    description: 'Observações específicas desta feira',
    required: false,
  })
  notes?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  // Dados do sócio (se incluído)
  @ApiProperty({ description: 'Nome do sócio', required: false })
  partnerName?: string;

  @ApiProperty({ description: 'CPF do sócio', required: false })
  partnerCpf?: string;

  @ApiProperty({ description: 'Email do sócio', required: false })
  partnerEmail?: string;

  constructor(fairPartner: FairPartner, includePartnerData = false) {
    this.id = fairPartner.id;
    this.fairId = fairPartner.fairId;
    this.partnerId = fairPartner.partnerId;
    this.percentage = fairPartner.percentage;
    this.totalEarnings = fairPartner.totalEarnings;
    this.totalWithdrawn = fairPartner.totalWithdrawn;
    this.availableBalance = fairPartner.availableBalance;
    this.isActive = fairPartner.isActive;
    this.notes = fairPartner.notes;
    this.createdAt = fairPartner.createdAt;
    this.updatedAt = fairPartner.updatedAt;

    if (includePartnerData && fairPartner.partner) {
      this.partnerName = fairPartner.partner.name;
      this.partnerCpf = fairPartner.partner.cpf;
      this.partnerEmail = fairPartner.partner.email;
    }
  }
}
