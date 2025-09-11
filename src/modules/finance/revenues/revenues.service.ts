import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Revenue } from './entities/revenue.entity';
import { RevenueInstallment } from './entities/revenue-installment.entity';
import { Stand } from '../stands/entities/stand.entity';
import {
  CreateRevenueDto,
  UpdateRevenueDto,
  ConfirmInstallmentPaymentDto,
} from './revenues.dto';
import {
  RevenueStatus,
  InstallmentStatus,
} from '../common/enums/finance.enums';

@Injectable()
export class RevenuesService {
  constructor(
    @InjectRepository(Revenue)
    private readonly revenueRepository: Repository<Revenue>,
    @InjectRepository(RevenueInstallment)
    private readonly installmentRepository: Repository<RevenueInstallment>,
    @InjectRepository(Stand)
    private readonly standRepository: Repository<Stand>,
  ) {}

  async create(createRevenueDto: CreateRevenueDto): Promise<Revenue> {
    try {
      console.log('[REVENUES] Iniciando criação de receita:', createRevenueDto);

      const { standNumber, fairId, ...revenueData } = createRevenueDto;

      // Criar a receita
      console.log('[REVENUES] Criando receita com dados:', revenueData);
      const revenue = this.revenueRepository.create({
        ...revenueData,
        fairId, // Adicionar fairId explicitamente
      });
      console.log('[REVENUES] Receita criada (antes de salvar):', revenue);

      const savedRevenue = await this.revenueRepository.save(revenue);
      console.log('[REVENUES] Receita salva com sucesso:', savedRevenue);

      // Se foi fornecido um número de stand válido (maior que 0), vincular o stand à receita
      if (standNumber && standNumber > 0) {
        console.log('[REVENUES] Buscando stand:', { standNumber, fairId });
        const stand = await this.standRepository.findOne({
          where: {
            standNumber,
            fairId: fairId,
          },
        });

        if (!stand) {
          console.log('[REVENUES] Stand não encontrado');
          throw new BadRequestException(
            `Stand número ${standNumber} não encontrado na feira ${fairId}`,
          );
        }

        if (!stand.isAvailable) {
          console.log('[REVENUES] Stand já ocupado');
          throw new BadRequestException(
            `Stand número ${standNumber} já está ocupado`,
          );
        }

        console.log('[REVENUES] Stand encontrado e disponível:', stand);

        // Vincular o stand à receita
        console.log('[REVENUES] Vinculando stand à receita');
        stand.revenueId = savedRevenue.id;
        stand.isAvailable = false;
        await this.standRepository.save(stand);
        console.log('[REVENUES] Stand atualizado com sucesso');
      } else {
        console.log(
          '[REVENUES] Nenhum stand fornecido - receita sem vínculo com stand',
        );
      }

      // Criar as parcelas automaticamente
      console.log('[REVENUES] Criando parcelas');
      await this.createInstallments(savedRevenue);
      console.log('[REVENUES] Parcelas criadas com sucesso');

      // Retornar receita com parcelas e stand (se houver)
      console.log('[REVENUES] Buscando receita completa');
      const finalRevenue = await this.findOne(savedRevenue.id, fairId);
      console.log('[REVENUES] Receita completa encontrada');

      return finalRevenue;
    } catch (error) {
      console.error('[REVENUES] Erro ao criar receita:', error);
      if (error instanceof Error) {
        console.error('[REVENUES] Stack trace:', error.stack);
      }
      throw error;
    }
  }

  private async createInstallments(revenue: Revenue): Promise<void> {
    try {
      console.log(
        '[INSTALLMENTS] Iniciando criação de parcelas para receita:',
        revenue.id,
      );

      const installments: Partial<RevenueInstallment>[] = [];
      const numberOfInstallments = revenue.numberOfInstallments || 1;
      const installmentValue = Math.floor(
        revenue.contractValue / numberOfInstallments,
      );
      const remainder = revenue.contractValue % numberOfInstallments;

      console.log('[INSTALLMENTS] Configuração:', {
        numberOfInstallments,
        contractValue: revenue.contractValue,
        installmentValue,
        remainder,
      });

      for (let i = 1; i <= numberOfInstallments; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + (i - 1)); // Primeira parcela no mês atual, depois mês a mês

        // A última parcela recebe o valor residual
        const valueCents =
          i === numberOfInstallments
            ? installmentValue + remainder
            : installmentValue;

        const installment = {
          revenueId: revenue.id,
          n: i,
          valueCents,
          dueDate,
          status: InstallmentStatus.A_VENCER,
        };

        console.log(`[INSTALLMENTS] Parcela ${i}:`, installment);
        installments.push(installment);
      }

      console.log('[INSTALLMENTS] Salvando', installments.length, 'parcelas');
      const savedInstallments =
        await this.installmentRepository.save(installments);
      console.log(
        '[INSTALLMENTS] Parcelas salvas com sucesso:',
        savedInstallments.length,
      );
    } catch (error) {
      console.error('[INSTALLMENTS] Erro ao criar parcelas:', error);
      throw error;
    }
  }

  async findAll(): Promise<Revenue[]> {
    return await this.revenueRepository.find({
      relations: ['client', 'entryModel', 'installments', 'stand'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByFair(
    fairId: string,
    filters?: { status?: string; clientId?: string },
  ): Promise<Revenue[]> {
    const where: Record<string, any> = { fairId };

    if (filters?.status) {
      where.status = filters.status as RevenueStatus;
    }

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    return await this.revenueRepository.find({
      where,
      relations: ['client', 'entryModel', 'installments'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, fairId: string): Promise<Revenue> {
    const revenue = await this.revenueRepository.findOne({
      where: { id, fairId },
      relations: ['client', 'entryModel', 'installments'],
    });

    if (!revenue) {
      throw new NotFoundException(
        `Receita com ID ${id} não encontrada na feira ${fairId}`,
      );
    }

    return revenue;
  }

  async update(
    id: string,
    updateRevenueDto: UpdateRevenueDto,
    fairId: string,
  ): Promise<Revenue> {
    const revenue = await this.findOne(id, fairId);

    Object.assign(revenue, updateRevenueDto);

    return await this.revenueRepository.save(revenue);
  }

  async remove(id: string): Promise<void> {
    console.log(`[SERVICE] Iniciando remoção da receita: ${id}`);

    try {
      // Buscar a receita para verificar se existe
      console.log(`[SERVICE] Buscando receita ${id} no banco...`);
      const revenue = await this.revenueRepository.findOne({
        where: { id },
        relations: ['installments'],
      });

      if (!revenue) {
        console.log(`[SERVICE] Receita ${id} não encontrada`);
        throw new NotFoundException('Receita não encontrada');
      }

      console.log(
        `[SERVICE] Receita encontrada: ${id}, installments: ${revenue.installments?.length || 0}`,
      );

      // Remover primeiro as parcelas (installments) se existirem
      if (revenue.installments && revenue.installments.length > 0) {
        console.log(
          `[SERVICE] Removendo ${revenue.installments.length} parcelas da receita ${id}...`,
        );
        await this.installmentRepository.remove(revenue.installments);
        console.log(`[SERVICE] Parcelas removidas com sucesso`);
      }

      // Verificar e remover stands relacionados se existirem
      console.log(
        `[SERVICE] Verificando stands relacionados à receita ${id}...`,
      );
      const standsQuery = this.revenueRepository.manager.query(
        'SELECT COUNT(*) as count FROM stands WHERE revenue_id = ?',
        [id],
      );
      const standsCount = await standsQuery;

      if (standsCount && standsCount[0]?.count > 0) {
        console.log(
          `[SERVICE] Removendo ${standsCount[0].count} stands relacionados à receita ${id}...`,
        );
        await this.revenueRepository.manager.query(
          'UPDATE stands SET revenue_id = NULL WHERE revenue_id = ?',
          [id],
        );
        console.log(`[SERVICE] Stands desvinculados com sucesso`);
      }

      // Agora remover a receita
      console.log(`[SERVICE] Removendo receita ${id}...`);
      await this.revenueRepository.remove(revenue);
      console.log(`[SERVICE] Receita ${id} removida com sucesso`);
    } catch (error) {
      console.log(`[SERVICE] Erro detalhado ao remover receita ${id}:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });

      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new Error(
          'Não é possível remover esta receita pois ela possui dados relacionados. Remova primeiro os dados dependentes.',
        );
      }

      throw error;
    }
  }

  async findByClient(clientId: string, fairId: string): Promise<Revenue[]> {
    return await this.revenueRepository.find({
      where: { clientId, fairId },
      relations: ['client', 'entryModel'],
      order: { createdAt: 'ASC' },
    });
  }

  async findByStatus(status: string, fairId: string): Promise<Revenue[]> {
    return await this.revenueRepository.find({
      where: { status: status as RevenueStatus, fairId },
      relations: ['client', 'entryModel', 'installments'],
      order: { createdAt: 'ASC' },
    });
  }

  async confirmInstallmentPayment(
    installmentId: string,
    confirmPaymentDto: ConfirmInstallmentPaymentDto,
    fairId: string,
  ): Promise<RevenueInstallment> {
    const installment = await this.installmentRepository.findOne({
      where: { id: installmentId },
      relations: ['revenue'],
    });

    if (!installment) {
      throw new NotFoundException(
        `Parcela com ID ${installmentId} não encontrada`,
      );
    }

    // Validar se a receita pertence à feira correta
    if (installment.revenue.fairId !== fairId) {
      throw new NotFoundException(`Parcela não encontrada na feira ${fairId}`);
    }

    // Atualizar parcela
    installment.status = InstallmentStatus.PAGA;
    installment.paidAt = confirmPaymentDto.paidAt;
    if (confirmPaymentDto.proofUrl) {
      installment.proofUrl = confirmPaymentDto.proofUrl;
    }

    const savedInstallment = await this.installmentRepository.save(installment);

    // Atualizar status da receita
    await this.updateRevenueStatus(installment.revenueId);

    return savedInstallment;
  }

  private async updateRevenueStatus(revenueId: string): Promise<void> {
    const revenue = await this.revenueRepository.findOne({
      where: { id: revenueId },
      relations: ['installments'],
    });

    if (!revenue) return;

    const installments = revenue.installments;
    const paidInstallments = installments.filter(
      (i) => i.status === InstallmentStatus.PAGA,
    );
    const overdueInstallments = installments.filter((i) => {
      return i.status !== InstallmentStatus.PAGA && new Date() > i.dueDate;
    });

    let newStatus: RevenueStatus;

    if (paidInstallments.length === installments.length) {
      newStatus = RevenueStatus.PAGO;
    } else if (overdueInstallments.length > 0) {
      newStatus = RevenueStatus.EM_ATRASO;
    } else if (paidInstallments.length > 0) {
      newStatus = RevenueStatus.EM_ANDAMENTO;
    } else {
      newStatus = RevenueStatus.PENDENTE;
    }

    if (revenue.status !== newStatus) {
      revenue.status = newStatus;
      await this.revenueRepository.save(revenue);
    }
  }

  // Método para obter estatísticas de receitas por feira
  async getRevenueStatsByFair(fairId: string): Promise<{
    totalValue: number;
    totalRevenues: number;
    averagePerRevenue: number;
  }> {
    const result = await this.revenueRepository
      .createQueryBuilder('revenue')
      .select('SUM(revenue.contractValue)', 'totalValue')
      .addSelect('COUNT(revenue.id)', 'totalRevenues')
      .where('revenue.fairId = :fairId', { fairId })
      .getRawOne();

    const totalValue = parseFloat(result.totalValue) || 0;
    const totalRevenues = parseInt(result.totalRevenues) || 0;
    const averagePerRevenue = totalRevenues > 0 ? totalValue / totalRevenues : 0;

    return {
      totalValue,
      totalRevenues,
      averagePerRevenue: Math.round(averagePerRevenue * 100) / 100, // Arredondar para 2 casas decimais
    };
  }
}
