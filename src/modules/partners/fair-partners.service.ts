import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { FairPartner } from './entities/fair-partner.entity';
import { Partner } from './entities/partner.entity';
import { User } from '../users/entitie/users.entity';
import { CreateFairPartnerDto } from './dto/create-fair-partner.dto';
import { UpdateFairPartnerDto } from './dto/update-fair-partner.dto';
import { FairPartnerResponseDto } from './dto/fair-partner-response.dto';
import { EUserRole } from '../../enum/role';

@Injectable()
export class FairPartnersService {
  private readonly logger = new Logger(FairPartnersService.name);

  constructor(
    @InjectRepository(FairPartner)
    private fairPartnerRepository: Repository<FairPartner>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(
    createFairPartnerDto: CreateFairPartnerDto,
  ): Promise<FairPartnerResponseDto> {
    // O partnerId enviado é na verdade o userId, vamos buscar o usuário primeiro
    const user = await this.userRepository.findOne({
      where: { id: +createFairPartnerDto.partnerId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.role !== EUserRole.PARTNER) {
      throw new BadRequestException(
        'Usuário deve ter role PARTNER para ser associado como sócio',
      );
    }

    // Verificar se já existe registro na tabela partners para este usuário
    let partner = await this.partnerRepository.findOne({
      where: { userId: user.id.toString() },
    });

    // Se não existe, criar automaticamente
    if (!partner) {
      this.logger.log(
        `Auto-criando registro de sócio para usuário: ${user.name} (ID: ${user.id})`,
      );

      const newPartner = this.partnerRepository.create({
        userId: user.id.toString(),
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone,
        percentage: 0, // Será atualizado pela porcentagem da feira
        totalEarnings: 0,
        totalWithdrawn: 0,
        availableBalance: 0,
        isActive: user.isActive,
      });

      const savedPartner = await this.partnerRepository.save(newPartner);
      partner = Array.isArray(savedPartner) ? savedPartner[0] : savedPartner;

      if (partner) {
        this.logger.log(
          `Sócio criado automaticamente: ${partner.name} (ID: ${partner.id})`,
        );
      }
    }

    // Verificar se já existe associação para esta feira e sócio
    if (!partner) {
      throw new BadRequestException('Erro ao criar registro do sócio');
    }

    const existingFairPartner = await this.fairPartnerRepository.findOne({
      where: {
        fairId: createFairPartnerDto.fairId,
        partnerId: partner.id,
      },
    });

    if (existingFairPartner) {
      throw new BadRequestException(
        'Este sócio já está associado a esta feira',
      );
    }

    // Validar porcentagem disponível para esta feira
    await this.validatePercentageAvailability(
      createFairPartnerDto.fairId,
      createFairPartnerDto.percentage,
    );

    const fairPartnerData = {
      fairId: createFairPartnerDto.fairId,
      partnerId: partner.id,
      percentage: createFairPartnerDto.percentage,
      isActive: createFairPartnerDto.isActive ?? true,
      notes: createFairPartnerDto.notes,
      totalEarnings: 0,
      totalWithdrawn: 0,
      availableBalance: 0,
    };

    this.logger.log(
      `Criando FairPartner com dados: ${JSON.stringify(fairPartnerData)}`,
    );

    const fairPartner = this.fairPartnerRepository.create(fairPartnerData);
    const savedFairPartner = await this.fairPartnerRepository.save(fairPartner);

    this.logger.log(
      `Sócio ${partner?.name || 'N/A'} associado à feira ${createFairPartnerDto.fairId} ` +
        `com ${createFairPartnerDto.percentage}%`,
    );

    return new FairPartnerResponseDto(savedFairPartner);
  }

  async findAllByFair(fairId: string): Promise<FairPartnerResponseDto[]> {
    const fairPartners = await this.fairPartnerRepository.find({
      where: { fairId },
      relations: ['partner'],
      order: { percentage: 'DESC' },
    });

    return fairPartners.map((fp) => new FairPartnerResponseDto(fp, true));
  }

  async findAllByPartner(partnerId: string): Promise<FairPartnerResponseDto[]> {
    const fairPartners = await this.fairPartnerRepository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
    });

    return fairPartners.map((fp) => new FairPartnerResponseDto(fp));
  }

  async findOne(id: string): Promise<FairPartnerResponseDto> {
    const fairPartner = await this.fairPartnerRepository.findOne({
      where: { id },
      relations: ['partner'],
    });

    if (!fairPartner) {
      throw new NotFoundException('Associação feira-sócio não encontrada');
    }

    return new FairPartnerResponseDto(fairPartner, true);
  }

  async update(
    id: string,
    updateFairPartnerDto: UpdateFairPartnerDto,
  ): Promise<FairPartnerResponseDto> {
    const fairPartner = await this.fairPartnerRepository.findOne({
      where: { id },
      relations: ['partner'],
    });

    if (!fairPartner) {
      throw new NotFoundException('Associação feira-sócio não encontrada');
    }

    // Validar porcentagem disponível se estiver sendo alterada
    if (updateFairPartnerDto.percentage !== undefined) {
      await this.validatePercentageAvailability(
        fairPartner.fairId,
        updateFairPartnerDto.percentage,
        id,
      );
    }

    Object.assign(fairPartner, updateFairPartnerDto);
    const updatedFairPartner =
      await this.fairPartnerRepository.save(fairPartner);

    this.logger.log(
      `Associação feira-sócio atualizada: ${fairPartner.partner.name} ` +
        `na feira ${fairPartner.fairId}`,
    );

    return new FairPartnerResponseDto(updatedFairPartner, true);
  }

  async remove(id: string): Promise<void> {
    const fairPartner = await this.fairPartnerRepository.findOne({
      where: { id },
      relations: ['partner'],
    });

    if (!fairPartner) {
      throw new NotFoundException('Associação feira-sócio não encontrada');
    }

    await this.fairPartnerRepository.remove(fairPartner);
    this.logger.log(
      `Sócio ${fairPartner.partner.name} removido da feira ${fairPartner.fairId}`,
    );
  }

  // Métodos para controle financeiro específico por feira
  async updateEarnings(
    fairId: string,
    partnerId: string,
    amount: number,
  ): Promise<void> {
    const fairPartner = await this.fairPartnerRepository.findOne({
      where: { fairId, partnerId },
    });

    if (!fairPartner) {
      throw new NotFoundException('Associação feira-sócio não encontrada');
    }

    fairPartner.totalEarnings += amount;
    fairPartner.availableBalance += amount;

    await this.fairPartnerRepository.save(fairPartner);
    this.logger.log(
      `Ganhos atualizados para feira ${fairId}, sócio ${partnerId}: +R$ ${amount.toFixed(2)}`,
    );
  }

  async getFinancialSummary(
    fairId: string,
    partnerId: string,
  ): Promise<{
    fairId: string;
    partnerId: string;
    percentage: number;
    totalEarnings: number;
    totalWithdrawn: number;
    availableBalance: number;
  }> {
    const fairPartner = await this.fairPartnerRepository.findOne({
      where: { fairId, partnerId },
    });

    if (!fairPartner) {
      throw new NotFoundException('Associação feira-sócio não encontrada');
    }

    return {
      fairId: fairPartner.fairId,
      partnerId: fairPartner.partnerId,
      percentage: fairPartner.percentage,
      totalEarnings: fairPartner.totalEarnings,
      totalWithdrawn: fairPartner.totalWithdrawn,
      availableBalance: fairPartner.availableBalance,
    };
  }

  async getFairPartnersSummary(fairId: string): Promise<{
    fairId: string;
    totalPartners: number;
    totalPercentage: number;
    partners: {
      partnerId: string;
      partnerName: string;
      percentage: number;
      totalEarnings: number;
      availableBalance: number;
    }[];
  }> {
    const fairPartners = await this.fairPartnerRepository.find({
      where: { fairId, isActive: true },
      relations: ['partner'],
      order: { percentage: 'DESC' },
    });

    const totalPercentage = fairPartners.reduce(
      (sum, fp) => sum + fp.percentage,
      0,
    );

    return {
      fairId,
      totalPartners: fairPartners.length,
      totalPercentage,
      partners: fairPartners.map((fp) => ({
        partnerId: fp.partnerId,
        partnerName: fp.partner.name,
        percentage: fp.percentage,
        totalEarnings: fp.totalEarnings,
        availableBalance: fp.availableBalance,
      })),
    };
  }

  /**
   * Valida se a porcentagem solicitada está disponível para esta feira
   */
  private async validatePercentageAvailability(
    fairId: string,
    percentage: number,
    excludeId?: string,
  ): Promise<void> {
    let fairPartners;

    if (excludeId) {
      fairPartners = await this.fairPartnerRepository.find({
        where: {
          fairId,
          isActive: true,
          id: Not(excludeId),
        },
      });
    } else {
      fairPartners = await this.fairPartnerRepository.find({
        where: {
          fairId,
          isActive: true,
        },
      });
    }

    const usedPercentage = fairPartners.reduce(
      (sum, fp) => sum + fp.percentage,
      0,
    );
    const availablePercentage = 100 - usedPercentage;

    if (percentage > availablePercentage) {
      throw new BadRequestException(
        `Porcentagem solicitada (${percentage}%) excede o valor disponível ` +
          `para esta feira (${availablePercentage}%). ` +
          `Porcentagem total já utilizada: ${usedPercentage}%`,
      );
    }

    this.logger.log(
      `Validação feira ${fairId}: ${percentage}% solicitado, ` +
        `${availablePercentage}% disponível (${usedPercentage}% já utilizado)`,
    );
  }

  /**
   * Obtém a porcentagem máxima disponível para esta feira
   */
  async getAvailablePercentage(fairId: string): Promise<number> {
    const fairPartners = await this.fairPartnerRepository.find({
      where: { fairId, isActive: true },
    });

    const usedPercentage = fairPartners.reduce(
      (sum, fp) => sum + fp.percentage,
      0,
    );
    return 100 - usedPercentage;
  }
}
