import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Revenue } from './entities/revenue.entity';
import { RevenueInstallment } from './entities/revenue-installment.entity';
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
  ) {}

  async create(createRevenueDto: CreateRevenueDto): Promise<Revenue> {
    // Criar a receita
    const revenue = this.revenueRepository.create(createRevenueDto);
    const savedRevenue = await this.revenueRepository.save(revenue);

    // Criar as parcelas automaticamente
    await this.createInstallments(savedRevenue);

    // Retornar receita com parcelas
    return await this.findOne(savedRevenue.id);
  }

  private async createInstallments(revenue: Revenue): Promise<void> {
    const installments: Partial<RevenueInstallment>[] = [];
    const numberOfInstallments = revenue.numberOfInstallments || 1;
    const installmentValue = Math.floor(
      revenue.contractValue / numberOfInstallments,
    );
    const remainder = revenue.contractValue % numberOfInstallments;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + (i - 1)); // Primeira parcela no mês atual, depois mês a mês

      // A última parcela recebe o valor residual
      const valueCents =
        i === numberOfInstallments
          ? installmentValue + remainder
          : installmentValue;

      installments.push({
        revenueId: revenue.id,
        n: i,
        valueCents,
        dueDate,
        status: InstallmentStatus.A_VENCER,
      });
    }

    await this.installmentRepository.save(installments);
  }

  async findAll(): Promise<Revenue[]> {
    return await this.revenueRepository.find({
      relations: ['client', 'entryModel', 'installments'],
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

  async findOne(id: string): Promise<Revenue> {
    const revenue = await this.revenueRepository.findOne({
      where: { id },
      relations: ['client', 'entryModel', 'installments'],
    });

    if (!revenue) {
      throw new NotFoundException(`Receita com ID ${id} não encontrada`);
    }

    return revenue;
  }

  async update(
    id: string,
    updateRevenueDto: UpdateRevenueDto,
  ): Promise<Revenue> {
    const revenue = await this.findOne(id);

    Object.assign(revenue, updateRevenueDto);

    return await this.revenueRepository.save(revenue);
  }

  async remove(id: string): Promise<void> {
    const revenue = await this.findOne(id);
    await this.revenueRepository.remove(revenue);
  }

  async findByClient(clientId: string): Promise<Revenue[]> {
    return await this.revenueRepository.find({
      where: { clientId },
      relations: ['client', 'entryModel'],
      order: { createdAt: 'ASC' },
    });
  }

  async findByStatus(status: string): Promise<Revenue[]> {
    return await this.revenueRepository.find({
      where: { status: status as RevenueStatus },
      relations: ['client', 'entryModel', 'installments'],
      order: { createdAt: 'ASC' },
    });
  }

  async confirmInstallmentPayment(
    installmentId: string,
    confirmPaymentDto: ConfirmInstallmentPaymentDto,
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
}
