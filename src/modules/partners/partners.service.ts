import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Partner } from './entities/partner.entity';
import {
  PartnerWithdrawal,
  WithdrawalStatus,
} from './entities/partner-withdrawal.entity';
import { FairPartner } from './entities/fair-partner.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { PartnerResponseDto } from './dto/partner-response.dto';
import { CashFlowService } from '../finance/cash-flow/cash-flow.service';
import { Fair } from '../fairs/entity/fair.entity';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(PartnerWithdrawal)
    private withdrawalRepository: Repository<PartnerWithdrawal>,
    @InjectRepository(FairPartner)
    private fairPartnerRepository: Repository<FairPartner>,
    @InjectRepository(Fair)
    private fairRepository: Repository<Fair>,
    @Inject(forwardRef(() => CashFlowService))
    private cashFlowService: CashFlowService,
  ) {}

  async create(
    createPartnerDto: CreatePartnerDto,
  ): Promise<PartnerResponseDto> {
    // Verificar se já existe sócio com este CPF
    const existingPartner = await this.partnerRepository.findOne({
      where: { cpf: createPartnerDto.cpf },
    });

    if (existingPartner) {
      throw new BadRequestException(
        'Já existe um sócio cadastrado com este CPF',
      );
    }

    // Verificar se já existe sócio com este userId
    const existingUserPartner = await this.partnerRepository.findOne({
      where: { userId: createPartnerDto.userId },
    });

    if (existingUserPartner) {
      throw new BadRequestException(
        'Este usuário já possui um perfil de sócio',
      );
    }

    // Validar porcentagem disponível
    await this.validatePercentageAvailability(createPartnerDto.percentage);

    const partner = this.partnerRepository.create(createPartnerDto);
    const savedPartner = await this.partnerRepository.save(partner);

    this.logger.log(
      `Sócio criado: ${savedPartner.name} (ID: ${savedPartner.id})`,
    );
    return new PartnerResponseDto(savedPartner);
  }

  async findAll(): Promise<PartnerResponseDto[]> {
    const partners = await this.partnerRepository.find({
      order: { name: 'ASC' },
    });

    return partners.map((partner) => new PartnerResponseDto(partner));
  }

  async findOne(id: string): Promise<PartnerResponseDto> {
    const partner = await this.partnerRepository.findOne({
      where: { id },
      relations: ['withdrawals'],
    });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    return new PartnerResponseDto(partner);
  }

  async update(
    id: string,
    updatePartnerDto: UpdatePartnerDto,
  ): Promise<PartnerResponseDto> {
    const partner = await this.partnerRepository.findOne({ where: { id } });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    // Verificar CPF único se estiver sendo alterado
    if (updatePartnerDto.cpf && updatePartnerDto.cpf !== partner.cpf) {
      const existingPartner = await this.partnerRepository.findOne({
        where: { cpf: updatePartnerDto.cpf },
      });

      if (existingPartner) {
        throw new BadRequestException(
          'Já existe um sócio cadastrado com este CPF',
        );
      }
    }

    // Validar porcentagem disponível se estiver sendo alterada
    if (updatePartnerDto.percentage !== undefined) {
      await this.validatePercentageAvailability(
        updatePartnerDto.percentage,
        id,
      );
    }

    Object.assign(partner, updatePartnerDto);
    const updatedPartner = await this.partnerRepository.save(partner);

    this.logger.log(
      `Sócio atualizado: ${updatedPartner.name} (ID: ${updatedPartner.id})`,
    );
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
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    partner.totalEarnings += amount;
    partner.availableBalance += amount;

    await this.partnerRepository.save(partner);
    this.logger.log(
      `Ganhos atualizados para ${partner.name}: +R$ ${amount.toFixed(2)}`,
    );
  }

  async createWithdrawal(
    partnerId: string,
    createWithdrawalDto: CreateWithdrawalDto,
  ): Promise<PartnerWithdrawal> {
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    if (!partner.isActive) {
      throw new BadRequestException('Sócio inativo');
    }

    // Validar se o sócio tem participação na feira
    const fairPartner = await this.fairPartnerRepository.findOne({
      where: { partnerId, fairId: createWithdrawalDto.fairId, isActive: true },
    });

    if (!fairPartner) {
      throw new BadRequestException(
        'Sócio não possui participação ativa nesta feira',
      );
    }

    // Obter saldo disponível específico da feira
    const financialSummary = await this.getFinancialSummaryByFair(
      partnerId,
      createWithdrawalDto.fairId,
    );
    const availableBalance = financialSummary.availableBalance;

    if (createWithdrawalDto.amount <= 0) {
      throw new BadRequestException('Valor deve ser maior que zero');
    }

    if (createWithdrawalDto.amount > availableBalance) {
      throw new BadRequestException(
        `Valor solicitado (R$ ${createWithdrawalDto.amount.toFixed(2)}) excede o saldo disponível na feira ${financialSummary.fairName} (R$ ${availableBalance.toFixed(2)})`,
      );
    }

    const withdrawal = this.withdrawalRepository.create({
      ...createWithdrawalDto,
      partnerId,
      status: WithdrawalStatus.PENDING,
    });

    const savedWithdrawal = await this.withdrawalRepository.save(withdrawal);
    this.logger.log(
      `Saque solicitado por ${partner.name} na feira ${financialSummary.fairName}: R$ ${createWithdrawalDto.amount.toFixed(2)} (Saldo disponível: R$ ${availableBalance.toFixed(2)})`,
    );

    return savedWithdrawal;
  }

  async getWithdrawals(partnerId: string): Promise<PartnerWithdrawal[]> {
    return await this.withdrawalRepository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
    });
  }

  async getWithdrawalsByPartnerAndFair(
    partnerId: string,
    fairId: string,
  ): Promise<PartnerWithdrawal[]> {
    // Verificar se o sócio existe
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });
    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    // Verificar se o sócio tem participação na feira
    const fairPartner = await this.fairPartnerRepository.findOne({
      where: { partnerId, fairId, isActive: true },
    });

    if (!fairPartner) {
      throw new NotFoundException(
        'Sócio não possui participação ativa nesta feira',
      );
    }

    // Buscar saques do sócio específicos desta feira
    const withdrawals = await this.withdrawalRepository.find({
      where: { partnerId, fairId },
      order: { createdAt: 'DESC' },
    });

    this.logger.log(
      `Histórico de saques do sócio ${partner.name} na feira ${fairId}: ${withdrawals.length} saques encontrados`,
    );

    return withdrawals;
  }

  async getWithdrawalsByFair(fairId: string): Promise<PartnerWithdrawal[]> {
    // Buscar todos os sócios que participam da feira
    const fairPartners = await this.fairPartnerRepository.find({
      where: { fairId, isActive: true },
      relations: ['partner'],
    });

    if (fairPartners.length === 0) {
      return [];
    }

    // Extrair IDs dos sócios
    const partnerIds = fairPartners.map((fp) => fp.partnerId);

    // Buscar apenas os saques específicos desta feira
    const withdrawals = await this.withdrawalRepository.find({
      where: {
        partnerId: In(partnerIds),
        fairId: fairId,
      },
      relations: ['partner'],
      order: { createdAt: 'DESC' },
    });

    this.logger.log(
      `Buscando saques da feira ${fairId}: ${withdrawals.length} saques encontrados para ${partnerIds.length} sócios`,
    );

    return withdrawals;
  }

  async approveWithdrawal(
    withdrawalId: string,
    approvedBy: string,
  ): Promise<PartnerWithdrawal> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
      relations: ['partner'],
    });

    if (!withdrawal) {
      throw new NotFoundException('Solicitação de saque não encontrada');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Esta solicitação já foi processada');
    }

    // Atualizar status do saque
    withdrawal.status = WithdrawalStatus.APPROVED;
    withdrawal.approvedBy = approvedBy;
    withdrawal.approvedAt = new Date();

    const updatedWithdrawal = await this.withdrawalRepository.save(withdrawal);

    this.logger.log(
      `Saque aprovado: ${withdrawal.partner.name} - R$ ${Number(withdrawal.amount).toFixed(2)}`,
    );
    return updatedWithdrawal;
  }

  async rejectWithdrawal(
    withdrawalId: string,
    rejectionReason: string,
  ): Promise<PartnerWithdrawal> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
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
    this.logger.log(
      `Saque rejeitado: ID ${withdrawalId} - Motivo: ${rejectionReason}`,
    );

    return updatedWithdrawal;
  }

  async getFinancialSummary(partnerId: string): Promise<{
    totalEarnings: number;
    totalWithdrawn: number;
    availableBalance: number;
    pendingWithdrawals: number;
    totalWithdrawals: number;
    percentage: number;
    fairEarnings: Array<{
      fairId: string;
      fairName: string;
      percentage: number;
      earnings: number;
      isProfitable: boolean;
    }>;
  }> {
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    // Buscar participações do sócio em feiras
    const fairPartners = await this.fairPartnerRepository.find({
      where: { partnerId, isActive: true },
      relations: ['partner'],
    });

    // Calcular ganhos reais baseados nas feiras
    let totalEarnings = 0;
    let totalWithdrawn = 0;
    let availableBalance = 0;
    const fairEarnings: Array<{
      fairId: string;
      fairName: string;
      percentage: number;
      earnings: number;
      isProfitable: boolean;
    }> = [];

    for (const fairPartner of fairPartners) {
      // Buscar análise de fluxo de caixa da feira
      try {
        const fairAnalysis = await this.cashFlowService.getFairCashFlowAnalysis(
          fairPartner.fairId,
        );

        // Calcular ganho proporcional do sócio nesta feira
        const partnerShare =
          (fairAnalysis.netProfit * fairPartner.percentage) / 100;

        // Buscar nome da feira
        const fair = await this.fairRepository.findOne({
          where: { id: fairPartner.fairId },
        });
        const fairName = fair ? fair.name : `Feira ${fairPartner.fairId}`;

        fairEarnings.push({
          fairId: fairPartner.fairId,
          fairName,
          percentage: fairPartner.percentage,
          earnings: partnerShare,
          isProfitable: fairAnalysis.isProfitable,
        });

        // Somar apenas se a feira for lucrativa
        if (fairAnalysis.isProfitable) {
          totalEarnings += partnerShare;
        }
      } catch (error) {
        this.logger.warn(
          `Erro ao calcular ganhos da feira ${fairPartner.fairId}: ${error.message}`,
        );
      }
    }

    // Calcular saldo disponível (ganhos - saques)
    const withdrawals = await this.withdrawalRepository.find({
      where: { partnerId },
    });

    const approvedWithdrawals = withdrawals
      .filter((w) => w.status === WithdrawalStatus.APPROVED)
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const pendingWithdrawals = withdrawals
      .filter((w) => w.status === WithdrawalStatus.PENDING)
      .reduce((sum, w) => sum + Number(w.amount), 0);

    totalWithdrawn = approvedWithdrawals;
    availableBalance = totalEarnings - totalWithdrawn;

    // Calcular porcentagem média do sócio (média ponderada pelas feiras)
    const totalPercentage = fairPartners.reduce(
      (sum, fp) => sum + fp.percentage,
      0,
    );
    const averagePercentage =
      fairPartners.length > 0 ? totalPercentage / fairPartners.length : 0;

    this.logger.log(
      `Resumo financeiro do sócio ${partner.name}: Ganhos R$ ${totalEarnings.toFixed(2)}, Saques R$ ${totalWithdrawn.toFixed(2)}, Disponível R$ ${availableBalance.toFixed(2)}`,
    );

    return {
      totalEarnings,
      totalWithdrawn,
      availableBalance,
      pendingWithdrawals,
      totalWithdrawals: withdrawals.length,
      percentage: averagePercentage,
      fairEarnings,
    };
  }

  async getFinancialSummaryByFair(
    partnerId: string,
    fairId: string,
  ): Promise<{
    totalEarnings: number;
    totalWithdrawn: number;
    availableBalance: number;
    pendingWithdrawals: number;
    totalWithdrawals: number;
    percentage: number;
    fairName: string;
    isProfitable: boolean;
  }> {
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    // Buscar participação do sócio na feira específica
    const fairPartner = await this.fairPartnerRepository.findOne({
      where: { partnerId, fairId, isActive: true },
      relations: ['partner'],
    });

    if (!fairPartner) {
      throw new NotFoundException(
        'Sócio não possui participação ativa nesta feira',
      );
    }

    // Buscar análise de fluxo de caixa da feira
    const fairAnalysis =
      await this.cashFlowService.getFairCashFlowAnalysis(fairId);

    // Calcular ganho proporcional do sócio nesta feira
    const partnerShare =
      (fairAnalysis.netProfit * fairPartner.percentage) / 100;

    // Buscar nome da feira
    const fair = await this.fairRepository.findOne({ where: { id: fairId } });
    const fairName = fair ? fair.name : `Feira ${fairId}`;

    // Calcular saques apenas desta feira específica
    const withdrawals = await this.withdrawalRepository.find({
      where: { partnerId, fairId },
    });

    const approvedWithdrawals = withdrawals
      .filter((w) => w.status === WithdrawalStatus.APPROVED)
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const pendingWithdrawals = withdrawals
      .filter((w) => w.status === WithdrawalStatus.PENDING)
      .reduce((sum, w) => sum + Number(w.amount), 0);

    // Para uma feira específica, o saldo disponível é baseado apenas nos ganhos desta feira
    const totalEarnings = fairAnalysis.isProfitable ? partnerShare : 0;
    const totalWithdrawn = approvedWithdrawals;
    const availableBalance = totalEarnings - totalWithdrawn;

    this.logger.log(
      `Resumo financeiro do sócio ${partner.name} na feira ${fairName}: Ganhos R$ ${totalEarnings.toFixed(2)}, Saques R$ ${totalWithdrawn.toFixed(2)}, Disponível R$ ${availableBalance.toFixed(2)}`,
    );

    return {
      totalEarnings,
      totalWithdrawn,
      availableBalance,
      pendingWithdrawals,
      totalWithdrawals: withdrawals.length,
      percentage: fairPartner.percentage,
      fairName,
      isProfitable: fairAnalysis.isProfitable,
    };
  }

  /**
   * Valida se a porcentagem solicitada está disponível
   * @param percentage Porcentagem solicitada
   * @param excludePartnerId ID do sócio a ser excluído da validação (para updates)
   */
  private async validatePercentageAvailability(
    percentage: number,
    excludePartnerId?: string,
  ): Promise<void> {
    // Buscar todos os sócios ativos, excluindo o sócio atual (para updates)
    let activePartners;

    if (excludePartnerId) {
      activePartners = await this.partnerRepository.find({
        where: {
          isActive: true,
          id: Not(excludePartnerId),
        },
      });
    } else {
      activePartners = await this.partnerRepository.find({
        where: { isActive: true },
      });
    }

    // Calcular porcentagem total já utilizada
    const usedPercentage = activePartners.reduce(
      (sum, partner) => sum + partner.percentage,
      0,
    );
    const availablePercentage = 100 - usedPercentage;

    if (percentage > availablePercentage) {
      throw new BadRequestException(
        `Porcentagem solicitada (${percentage}%) excede o valor disponível (${availablePercentage}%). ` +
          `Porcentagem total já utilizada: ${usedPercentage}%`,
      );
    }

    this.logger.log(
      `Validação de porcentagem: ${percentage}% solicitado, ${availablePercentage}% disponível ` +
        `(${usedPercentage}% já utilizado)`,
    );
  }

  /**
   * Obtém a porcentagem máxima disponível para um novo sócio
   */
  async getAvailablePercentage(): Promise<number> {
    const activePartners = await this.partnerRepository.find({
      where: { isActive: true },
    });

    const usedPercentage = activePartners.reduce(
      (sum, partner) => sum + partner.percentage,
      0,
    );
    return 100 - usedPercentage;
  }

  async findByUserId(userId: number): Promise<Partner | null> {
    return await this.partnerRepository.findOne({
      where: { userId: userId.toString() },
    });
  }

  async getPartnerProfile(userId: number): Promise<{
    id: string;
    userId: string;
    name: string;
    cpf: string;
    email: string;
    phone: string;
    percentage: number;
    totalEarnings: number;
    totalWithdrawn: number;
    availableBalance: number;
    isActive: boolean;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    fairEarnings: Array<{
      fairId: string;
      fairName: string;
      percentage: number;
      earnings: number;
      isProfitable: boolean;
    }>;
  }> {
    const partner = await this.partnerRepository.findOne({
      where: { userId: userId.toString() },
    });

    if (!partner) {
      throw new NotFoundException('Sócio não encontrado');
    }

    // Buscar participações do sócio em feiras
    const fairPartners = await this.fairPartnerRepository.find({
      where: { partnerId: partner.id, isActive: true },
      relations: ['partner'],
    });

    // Calcular ganhos reais baseados nas feiras
    let totalEarnings = 0;
    let totalWithdrawn = 0;
    let availableBalance = 0;
    const fairEarnings: Array<{
      fairId: string;
      fairName: string;
      percentage: number;
      earnings: number;
      isProfitable: boolean;
    }> = [];

    for (const fairPartner of fairPartners) {
      // Buscar análise de fluxo de caixa da feira
      try {
        const fairAnalysis = await this.cashFlowService.getFairCashFlowAnalysis(
          fairPartner.fairId,
        );

        // Calcular ganho proporcional do sócio nesta feira
        const partnerShare =
          (fairAnalysis.netProfit * fairPartner.percentage) / 100;

        // Buscar nome da feira
        const fair = await this.fairRepository.findOne({
          where: { id: fairPartner.fairId },
        });
        const fairName = fair ? fair.name : `Feira ${fairPartner.fairId}`;

        fairEarnings.push({
          fairId: fairPartner.fairId,
          fairName,
          percentage: fairPartner.percentage,
          earnings: partnerShare,
          isProfitable: fairAnalysis.isProfitable,
        });

        // Somar apenas se a feira for lucrativa
        if (fairAnalysis.isProfitable) {
          totalEarnings += partnerShare;
        }
      } catch (error) {
        this.logger.warn(
          `Erro ao calcular ganhos da feira ${fairPartner.fairId}: ${error.message}`,
        );
      }
    }

    // Calcular saldo disponível (ganhos - saques)
    const withdrawals = await this.withdrawalRepository.find({
      where: { partnerId: partner.id },
    });

    const approvedWithdrawals = withdrawals
      .filter((w) => w.status === WithdrawalStatus.APPROVED)
      .reduce((sum, w) => sum + w.amount, 0);

    totalWithdrawn = approvedWithdrawals;
    availableBalance = totalEarnings - totalWithdrawn;

    // Calcular porcentagem média do sócio (média ponderada pelas feiras)
    const totalPercentage = fairPartners.reduce(
      (sum, fp) => sum + fp.percentage,
      0,
    );
    const averagePercentage =
      fairPartners.length > 0 ? totalPercentage / fairPartners.length : 0;

    return {
      id: partner.id,
      userId: partner.userId,
      name: partner.name,
      cpf: partner.cpf,
      email: partner.email,
      phone: partner.phone,
      percentage: averagePercentage,
      totalEarnings,
      totalWithdrawn,
      availableBalance,
      isActive: partner.isActive,
      notes: partner.notes,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
      fairEarnings,
    };
  }
}
