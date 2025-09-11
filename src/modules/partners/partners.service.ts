import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Partner } from './entities/partner.entity';
import { PartnerWithdrawal, WithdrawalStatus } from './entities/partner-withdrawal.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { PartnerResponseDto } from './dto/partner-response.dto';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(PartnerWithdrawal)
    private withdrawalRepository: Repository<PartnerWithdrawal>,
  ) {}

  async create(createPartnerDto: CreatePartnerDto): Promise<PartnerResponseDto> {
    // Verificar se já existe sócio com este CPF
    const existingPartner = await this.partnerRepository.findOne({
      where: { cpf: createPartnerDto.cpf }
    });

    if (existingPartner) {
      throw new BadRequestException('Já existe um sócio cadastrado com este CPF');
    }

    // Verificar se já existe sócio com este userId
    const existingUserPartner = await this.partnerRepository.findOne({
      where: { userId: createPartnerDto.userId }
    });

    if (existingUserPartner) {
      throw new BadRequestException('Este usuário já possui um perfil de sócio');
    }

    // Validar porcentagem disponível
    await this.validatePercentageAvailability(createPartnerDto.percentage);

    const partner = this.partnerRepository.create(createPartnerDto);
    const savedPartner = await this.partnerRepository.save(partner);
    
    this.logger.log(`Sócio criado: ${savedPartner.name} (ID: ${savedPartner.id})`);
    return new PartnerResponseDto(savedPartner);
  }

  async findAll(): Promise<PartnerResponseDto[]> {
    const partners = await this.partnerRepository.find({
      order: { name: 'ASC' }
    });
    
    return partners.map(partner => new PartnerResponseDto(partner));
  }

  async findOne(id: string): Promise<PartnerResponseDto> {
    const partner = await this.partnerRepository.findOne({
      where: { id },
      relations: ['withdrawals']
    });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    return new PartnerResponseDto(partner);
  }


  async update(id: string, updatePartnerDto: UpdatePartnerDto): Promise<PartnerResponseDto> {
    const partner = await this.partnerRepository.findOne({ where: { id } });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    // Verificar CPF único se estiver sendo alterado
    if (updatePartnerDto.cpf && updatePartnerDto.cpf !== partner.cpf) {
      const existingPartner = await this.partnerRepository.findOne({
        where: { cpf: updatePartnerDto.cpf }
      });

      if (existingPartner) {
        throw new BadRequestException('Já existe um sócio cadastrado com este CPF');
      }
    }

    // Validar porcentagem disponível se estiver sendo alterada
    if (updatePartnerDto.percentage !== undefined) {
      await this.validatePercentageAvailability(updatePartnerDto.percentage, id);
    }

    Object.assign(partner, updatePartnerDto);
    const updatedPartner = await this.partnerRepository.save(partner);
    
    this.logger.log(`Sócio atualizado: ${updatedPartner.name} (ID: ${updatedPartner.id})`);
    return new PartnerResponseDto(updatedPartner);
  }

  async remove(id: string): Promise<void> {
    const partner = await this.partnerRepository.findOne({ where: { id } });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    await this.partnerRepository.remove(partner);
    this.logger.log(`Sócio removido: ${partner.name} (ID: ${id})`);
  }

  // Métodos para controle financeiro
  async updateEarnings(partnerId: string, amount: number): Promise<void> {
    const partner = await this.partnerRepository.findOne({ where: { id: partnerId } });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    partner.totalEarnings += amount;
    partner.availableBalance += amount;

    await this.partnerRepository.save(partner);
    this.logger.log(`Ganhos atualizados para ${partner.name}: +R$ ${amount.toFixed(2)}`);
  }

  async createWithdrawal(partnerId: string, createWithdrawalDto: CreateWithdrawalDto): Promise<PartnerWithdrawal> {
    const partner = await this.partnerRepository.findOne({ where: { id: partnerId } });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    if (!partner.canWithdraw(createWithdrawalDto.amount)) {
      throw new BadRequestException('Valor solicitado excede o saldo disponível ou sócio inativo');
    }

    const withdrawal = this.withdrawalRepository.create({
      ...createWithdrawalDto,
      partnerId,
      status: WithdrawalStatus.PENDING
    });

    const savedWithdrawal = await this.withdrawalRepository.save(withdrawal);
    this.logger.log(`Saque solicitado por ${partner.name}: R$ ${createWithdrawalDto.amount.toFixed(2)}`);
    
    return savedWithdrawal;
  }

  async getWithdrawals(partnerId: string): Promise<PartnerWithdrawal[]> {
    return await this.withdrawalRepository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' }
    });
  }

  async approveWithdrawal(withdrawalId: string, approvedBy: string): Promise<PartnerWithdrawal> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
      relations: ['partner']
    });

    if (!withdrawal) {
      throw new NotFoundException('Solicitação de saque não encontrada');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Esta solicitação já foi processada');
    }

    // Atualizar saldo do sócio
    withdrawal.partner.totalWithdrawn += withdrawal.amount;
    withdrawal.partner.availableBalance -= withdrawal.amount;

    // Atualizar status do saque
    withdrawal.status = WithdrawalStatus.APPROVED;
    withdrawal.approvedBy = approvedBy;
    withdrawal.approvedAt = new Date();

    await this.partnerRepository.save(withdrawal.partner);
    const updatedWithdrawal = await this.withdrawalRepository.save(withdrawal);

    this.logger.log(`Saque aprovado: ${withdrawal.partner.name} - R$ ${withdrawal.amount.toFixed(2)}`);
    return updatedWithdrawal;
  }

  async rejectWithdrawal(withdrawalId: string, rejectionReason: string): Promise<PartnerWithdrawal> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId }
    });

    if (!withdrawal) {
      throw new NotFoundException('Solicitação de saque não encontrada');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Esta solicitação já foi processada');
    }

    withdrawal.status = WithdrawalStatus.REJECTED;
    withdrawal.rejectionReason = rejectionReason;

    const updatedWithdrawal = await this.withdrawalRepository.save(withdrawal);
    this.logger.log(`Saque rejeitado: ID ${withdrawalId} - Motivo: ${rejectionReason}`);
    
    return updatedWithdrawal;
  }

  async getFinancialSummary(partnerId: string): Promise<{
    totalEarnings: number;
    totalWithdrawn: number;
    availableBalance: number;
    pendingWithdrawals: number;
    totalWithdrawals: number;
  }> {
    const partner = await this.partnerRepository.findOne({ where: { id: partnerId } });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    const withdrawals = await this.withdrawalRepository.find({
      where: { partnerId }
    });

    const pendingWithdrawals = withdrawals
      .filter(w => w.status === WithdrawalStatus.PENDING)
      .reduce((sum, w) => sum + w.amount, 0);

    return {
      totalEarnings: partner.totalEarnings,
      totalWithdrawn: partner.totalWithdrawn,
      availableBalance: partner.availableBalance,
      pendingWithdrawals,
      totalWithdrawals: withdrawals.length
    };
  }

  /**
   * Valida se a porcentagem solicitada está disponível
   * @param percentage Porcentagem solicitada
   * @param excludePartnerId ID do sócio a ser excluído da validação (para updates)
   */
  private async validatePercentageAvailability(percentage: number, excludePartnerId?: string): Promise<void> {
    // Buscar todos os sócios ativos, excluindo o sócio atual (para updates)
    let activePartners;
    
    if (excludePartnerId) {
      activePartners = await this.partnerRepository.find({
        where: { 
          isActive: true,
          id: Not(excludePartnerId)
        }
      });
    } else {
      activePartners = await this.partnerRepository.find({
        where: { isActive: true }
      });
    }

    // Calcular porcentagem total já utilizada
    const usedPercentage = activePartners.reduce((sum, partner) => sum + partner.percentage, 0);
    const availablePercentage = 100 - usedPercentage;

    if (percentage > availablePercentage) {
      throw new BadRequestException(
        `Porcentagem solicitada (${percentage}%) excede o valor disponível (${availablePercentage}%). ` +
        `Porcentagem total já utilizada: ${usedPercentage}%`
      );
    }

    this.logger.log(
      `Validação de porcentagem: ${percentage}% solicitado, ${availablePercentage}% disponível ` +
      `(${usedPercentage}% já utilizado)`
    );
  }

  /**
   * Obtém a porcentagem máxima disponível para um novo sócio
   */
  async getAvailablePercentage(): Promise<number> {
    const activePartners = await this.partnerRepository.find({
      where: { isActive: true }
    });

    const usedPercentage = activePartners.reduce((sum, partner) => sum + partner.percentage, 0);
    return 100 - usedPercentage;
  }

  async findByUserId(userId: number): Promise<Partner | null> {
    return await this.partnerRepository.findOne({
      where: { userId: userId.toString() }
    });
  }
}
