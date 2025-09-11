import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from './entities/partner.entity';
import { FairPartner } from './entities/fair-partner.entity';
import { PartnersService } from './partners.service';
import { FairPartnersService } from './fair-partners.service';

@Injectable()
export class ProfitDistributionService {
  private readonly logger = new Logger(ProfitDistributionService.name);

  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(FairPartner)
    private fairPartnerRepository: Repository<FairPartner>,
    private partnersService: PartnersService,
    private fairPartnersService: FairPartnersService,
  ) {}

  /**
   * Distribui lucro de uma feira entre os sócios ativos desta feira
   * @param fairId ID da feira
   * @param totalProfit Lucro total da feira
   */
  async distributeProfit(fairId: string, totalProfit: number): Promise<void> {
    this.logger.log(`Iniciando distribuição de lucro para feira ${fairId}: R$ ${totalProfit.toFixed(2)}`);

    // Buscar todos os sócios ativos desta feira específica
    const fairPartners = await this.fairPartnerRepository.find({
      where: { fairId, isActive: true },
      relations: ['partner'],
      order: { percentage: 'DESC' }
    });

    if (fairPartners.length === 0) {
      this.logger.warn(`Nenhum sócio ativo encontrado para a feira ${fairId}`);
      return;
    }

    // Verificar se a soma das porcentagens não excede 100%
    const totalPercentage = fairPartners.reduce((sum, fp) => sum + fp.percentage, 0);
    
    if (totalPercentage > 100) {
      this.logger.error(`Soma das porcentagens excede 100%: ${totalPercentage}%`);
      throw new Error('A soma das porcentagens dos sócios não pode exceder 100%');
    }

    // Distribuir lucro proporcionalmente
    for (const fairPartner of fairPartners) {
      if (fairPartner.percentage > 0) {
        const partnerShare = (totalProfit * fairPartner.percentage) / 100;
        
        // Atualizar ganhos específicos desta feira
        await this.fairPartnersService.updateEarnings(fairId, fairPartner.partnerId, partnerShare);
        
        this.logger.log(
          `Sócio ${fairPartner.partner.name} recebeu R$ ${partnerShare.toFixed(2)} ` +
          `(${fairPartner.percentage}% do lucro total da feira ${fairId})`
        );
      }
    }

    this.logger.log(`Distribuição de lucro concluída para feira ${fairId}`);
  }

  /**
   * Calcula quanto cada sócio receberia sem efetuar a distribuição
   * @param fairId ID da feira
   * @param totalProfit Lucro total da feira
   */
  async calculateProfitDistribution(fairId: string, totalProfit: number): Promise<{
    partnerId: string;
    partnerName: string;
    percentage: number;
    share: number;
  }[]> {
    const fairPartners = await this.fairPartnerRepository.find({
      where: { fairId, isActive: true },
      relations: ['partner'],
      order: { percentage: 'DESC' }
    });

    return fairPartners.map(fairPartner => ({
      partnerId: fairPartner.partnerId,
      partnerName: fairPartner.partner.name,
      percentage: fairPartner.percentage,
      share: (totalProfit * fairPartner.percentage) / 100
    }));
  }

  /**
   * Obtém resumo da distribuição de lucros de uma feira específica
   */
  async getDistributionSummary(fairId: string): Promise<{
    fairId: string;
    totalActivePartners: number;
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
      order: { percentage: 'DESC' }
    });

    const totalPercentage = fairPartners.reduce((sum, fp) => sum + fp.percentage, 0);

    return {
      fairId,
      totalActivePartners: fairPartners.length,
      totalPercentage,
      partners: fairPartners.map(fp => ({
        partnerId: fp.partnerId,
        partnerName: fp.partner.name,
        percentage: fp.percentage,
        totalEarnings: fp.totalEarnings,
        availableBalance: fp.availableBalance
      }))
    };
  }
}
