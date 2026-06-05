import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Fair } from './entity/fair.entity';
import { FairDaySchedule } from './entity/fair-day-schedule.entity';
import { Repository } from 'typeorm';
import { CreateInputFairDto } from './fair.dto';
import { UpdateFairDto } from './dto/update-fair.dto';
import { FairResponseDto } from './dto/fair-response.dto';
import { RevenuesService } from '../finance/revenues/revenues.service';
import { ExpensesService } from '../finance/expenses/expenses.service';

@Injectable()
export class FairsService {
  private readonly logger = new Logger(FairsService.name);

  constructor(
    @InjectRepository(Fair) private fairRepository: Repository<Fair>,
    @InjectRepository(FairDaySchedule)
    private dayScheduleRepository: Repository<FairDaySchedule>,
    private readonly revenuesService: RevenuesService,
    private readonly expensesService: ExpensesService,
  ) {}

  private async getFinancialData(fairId: string): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netBalance: number;
    profitMargin: number;
    totalRevenues: number;
    totalExpensesCount: number;
  }> {
    try {
      const revenueStats =
        await this.revenuesService.getRevenueStatsByFair(fairId);
      const totalExpenses = await this.expensesService.getTotalByFair(fairId);
      const expenses = await this.expensesService.findAllByFair(fairId);
      const totalExpensesCount = expenses.length;
      const totalRevenue = revenueStats.totalValue;
      const netBalance = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (netBalance / totalRevenue) * 100 : 0;

      return {
        totalRevenue,
        totalExpenses,
        netBalance,
        profitMargin: Math.round(profitMargin * 100) / 100,
        totalRevenues: revenueStats.totalRevenues,
        totalExpensesCount,
      };
    } catch (error) {
      this.logger.warn(
        `Erro ao buscar dados financeiros da feira ${fairId}: ${(error as Error).message}`,
      );
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netBalance: 0,
        profitMargin: 0,
        totalRevenues: 0,
        totalExpensesCount: 0,
      };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private relations = ['standConfigurations', 'daySchedules'];

  private async saveDaySchedules(
    fairId: string,
    schedules: CreateInputFairDto['daySchedules'],
  ) {
    if (!schedules?.length) return;
    const entities = schedules.map((s) =>
      this.dayScheduleRepository.create({
        fairId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        note: s.note ?? null,
      }),
    );
    await this.dayScheduleRepository.save(entities);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async createFair(dto: CreateInputFairDto): Promise<FairResponseDto> {
    this.logger.log(`Criando nova feira: ${dto.name}`);

    const { standConfigurations: _sc, daySchedules, ...fairData } = dto;
    const newFair = this.fairRepository.create(fairData);
    const result = await this.fairRepository.save(newFair);

    await this.saveDaySchedules(result.id, daySchedules);

    const created = await this.fairRepository.findOne({
      where: { id: result.id },
      relations: this.relations,
    });

    this.logger.log(`Feira criada com sucesso: ${result.id}`);
    return new FairResponseDto(created!);
  }

  async findAll(uf?: string, status?: string): Promise<FairResponseDto[]> {
    this.logger.log(
      `Buscando feiras — uf: ${uf ?? 'all'} | status: ${status ?? 'all'}`,
    );

    const qb = this.fairRepository
      .createQueryBuilder('fair')
      .leftJoinAndSelect('fair.standConfigurations', 'standConfig')
      .leftJoinAndSelect('fair.daySchedules', 'daySchedule')
      // MySQL não suporta NULLS LAST — usar ISNULL() para colocar nulos no final
      .orderBy('ISNULL(fair.startDate)', 'ASC')
      .addOrderBy('fair.startDate', 'ASC')
      .addOrderBy('fair.createdAt', 'DESC');

    if (uf) {
      qb.andWhere('fair.state = :uf', { uf: uf.toUpperCase() });
    }
    if (status) {
      qb.andWhere('fair.status = :status', { status });
    }

    const fairs = await qb.getMany();

    return Promise.all(
      fairs.map(async (fair) => {
        const financial = await this.getFinancialData(fair.id);
        return new FairResponseDto({ ...fair, ...financial } as Fair);
      }),
    );
  }

  async findOne(id: string): Promise<FairResponseDto> {
    this.logger.log(`Buscando feira: ${id}`);

    const fair = await this.fairRepository.findOne({
      where: { id },
      relations: this.relations,
    });

    if (!fair) throw new NotFoundException(`Feira com ID ${id} não encontrada`);

    const financial = await this.getFinancialData(fair.id);
    return new FairResponseDto({ ...fair, ...financial } as Fair);
  }

  async update(id: string, dto: UpdateFairDto): Promise<FairResponseDto> {
    this.logger.log(`Atualizando feira: ${id}`);

    const fair = await this.fairRepository.findOne({
      where: { id },
      relations: this.relations,
    });
    if (!fair) throw new NotFoundException(`Feira com ID ${id} não encontrada`);

    const { daySchedules, standConfigurations: _sc, ...fairData } = dto as any;
    Object.assign(fair, fairData);
    await this.fairRepository.save(fair);

    // Se daySchedules foi enviado, substitui os existentes
    if (daySchedules !== undefined) {
      await this.dayScheduleRepository.delete({ fairId: id });
      await this.saveDaySchedules(id, daySchedules);
    }

    const updated = await this.fairRepository.findOne({
      where: { id },
      relations: this.relations,
    });

    this.logger.log(`Feira atualizada com sucesso: ${id}`);
    return new FairResponseDto(updated!);
  }

  async remove(id: string): Promise<{ message: string }> {
    this.logger.log(`Removendo feira: ${id}`);

    const fair = await this.fairRepository.findOne({ where: { id } });
    if (!fair) throw new NotFoundException(`Feira com ID ${id} não encontrada`);

    const manager = this.fairRepository.manager;

    // Deletar registros em tabelas sem CASCADE definido no banco,
    // para evitar FK constraint error no MySQL
    await manager.query(`DELETE FROM fair_visitor    WHERE fairsId   = ?`, [
      id,
    ]);
    await manager.query(`DELETE FROM stands          WHERE fair_id   = ?`, [
      id,
    ]);
    await manager.query(`DELETE FROM fair_partners   WHERE fairId    = ?`, [
      id,
    ]);

    await this.fairRepository.remove(fair);
    this.logger.log(`Feira removida com sucesso: ${id}`);
    return { message: 'Feira removida com sucesso' };
  }

  async toggleActive(id: string): Promise<FairResponseDto> {
    this.logger.log(`Alternando status ativo da feira: ${id}`);

    const fair = await this.fairRepository.findOne({
      where: { id },
      relations: this.relations,
    });
    if (!fair) throw new NotFoundException(`Feira com ID ${id} não encontrada`);

    fair.isActive = !fair.isActive;
    await this.fairRepository.save(fair);

    this.logger.log(
      `Status da feira alterado para: ${fair.isActive ? 'ativo' : 'inativo'}`,
    );
    return new FairResponseDto(fair);
  }

  /** Compatibilidade com código legado */
  getFairs() {
    return this.findAll();
  }
}
