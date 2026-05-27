import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OverheadExpense } from './entities/overhead-expense.entity';
import { OverheadExpenseAllocation } from './entities/overhead-expense-allocation.entity';
import {
  CreateOverheadExpenseDto,
  UpdateOverheadExpenseDto,
  FairAllocationDto,
  AllocatedOverheadItem,
} from './dto/overhead-expense.dto';

@Injectable()
export class OverheadExpensesService {
  private readonly logger = new Logger(OverheadExpensesService.name);

  constructor(
    @InjectRepository(OverheadExpense)
    private readonly overheadRepo: Repository<OverheadExpense>,
    @InjectRepository(OverheadExpenseAllocation)
    private readonly allocationRepo: Repository<OverheadExpenseAllocation>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Resolve percentuais a partir da lista de fairs do DTO.
   * - Se nenhum item tiver percentual → divisão igualitária.
   * - Se ao menos um tiver → todos devem ter e a soma deve ser 1.0.
   */
  private resolveAllocations(
    fairs: FairAllocationDto[],
  ): { fairId: string; percentual: number }[] {
    const hasAnyPercentual = fairs.some((f) => f.percentual !== undefined);

    if (!hasAnyPercentual) {
      // Divisão igualitária
      const equal = Math.round((1 / fairs.length) * 10000) / 10000;
      // Ajuste de arredondamento na última parcela
      const allocations = fairs.map((f, i) => ({
        fairId: f.fairId,
        percentual: i < fairs.length - 1 ? equal : 0,
      }));
      const sumOthers = allocations
        .slice(0, -1)
        .reduce((s, a) => s + a.percentual, 0);
      allocations[allocations.length - 1].percentual =
        Math.round((1 - sumOthers) * 10000) / 10000;
      return allocations;
    }

    // Percentuais manuais — todos devem estar presentes
    const missing = fairs.filter((f) => f.percentual === undefined);
    if (missing.length > 0) {
      throw new BadRequestException(
        'Quando percentual manual é usado, todos os itens de feiras devem ter percentual definido.',
      );
    }

    const sum = fairs.reduce((s, f) => s + f.percentual!, 0);
    if (Math.abs(sum - 1) > 0.001) {
      throw new BadRequestException(
        `A soma dos percentuais deve ser 100 %. Atual: ${(sum * 100).toFixed(2)} %.`,
      );
    }

    return fairs.map((f) => ({ fairId: f.fairId, percentual: f.percentual! }));
  }

  private async saveAllocations(
    overheadExpenseId: string,
    allocations: { fairId: string; percentual: number }[],
  ): Promise<void> {
    const entities = allocations.map((a) =>
      this.allocationRepo.create({
        overheadExpenseId,
        fairId: a.fairId,
        percentual: a.percentual,
      }),
    );
    await this.allocationRepo.save(entities);
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(dto: CreateOverheadExpenseDto): Promise<OverheadExpense> {
    this.logger.log(`Criando overhead expense: ${dto.categoria} — R$ ${dto.valor}`);

    const allocations = this.resolveAllocations(dto.fairs);

    return this.dataSource.transaction(async (manager) => {
      const expense = Object.assign(new OverheadExpense(), {
        categoria: dto.categoria,
        accountId: dto.accountId ?? null,
        descricao: dto.descricao ?? null,
        valor: dto.valor,
        data: dto.data,
        observacoes: dto.observacoes ?? null,
      });
      const saved = await manager.save(OverheadExpense, expense);

      const allocationEntities = allocations.map((a) =>
        Object.assign(new OverheadExpenseAllocation(), {
          overheadExpenseId: saved.id,
          fairId: a.fairId,
          percentual: a.percentual,
        }),
      );
      await manager.save(OverheadExpenseAllocation, allocationEntities);

      return this.findOne(saved.id);
    });
  }

  async findAll(): Promise<OverheadExpense[]> {
    return this.overheadRepo.find({
      relations: ['account', 'allocations', 'allocations.fair'],
      order: { data: 'DESC' },
    });
  }

  async findOne(id: string): Promise<OverheadExpense> {
    const expense = await this.overheadRepo.findOne({
      where: { id },
      relations: ['account', 'allocations', 'allocations.fair'],
    });
    if (!expense) {
      throw new NotFoundException(`Overhead expense com ID ${id} não encontrado`);
    }
    return expense;
  }

  async update(
    id: string,
    dto: UpdateOverheadExpenseDto,
  ): Promise<OverheadExpense> {
    this.logger.log(`Atualizando overhead expense: ${id}`);
    const expense = await this.findOne(id);

    const { fairs, ...fields } = dto;
    Object.assign(expense, fields);

    return this.dataSource.transaction(async (manager) => {
      await manager.save(expense);

      if (fairs !== undefined) {
        await manager.delete(OverheadExpenseAllocation, {
          overheadExpenseId: id,
        });
        const allocations = this.resolveAllocations(fairs);
        const entities = allocations.map((a) =>
          Object.assign(new OverheadExpenseAllocation(), {
            overheadExpenseId: id,
            fairId: a.fairId,
            percentual: a.percentual,
          }),
        );
        await manager.save(OverheadExpenseAllocation, entities);
      }

      return this.findOne(id);
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    const expense = await this.findOne(id);
    await this.overheadRepo.remove(expense);
    return { message: 'Overhead expense removida com sucesso' };
  }

  // ── Consulta por feira ───────────────────────────────────────────────────────

  /**
   * Retorna todas as despesas overhead alocadas a uma feira específica,
   * já com o valor calculado para aquela feira.
   */
  async findAllocatedForFair(fairId: string): Promise<AllocatedOverheadItem[]> {
    const allocations = await this.allocationRepo.find({
      where: { fairId },
      relations: [
        'overheadExpense',
        'overheadExpense.account',
        'overheadExpense.allocations',
        'overheadExpense.allocations.fair',
      ],
      order: { overheadExpense: { data: 'DESC' } },
    });

    return allocations.map((alloc) => {
      const exp = alloc.overheadExpense;
      const valorTotal = Number(exp.valor);
      const pct = Number(alloc.percentual);

      return {
        id: exp.id,
        categoria: exp.categoria,
        descricao: exp.descricao ?? null,
        data: exp.data,
        valorTotal,
        percentualDesteFair: pct,
        valorAlocado: Math.round(valorTotal * pct * 100) / 100,
        account: exp.account
          ? {
              id: exp.account.id,
              nomeConta: exp.account.nomeConta,
              banco: exp.account.banco,
            }
          : null,
        feirasRateadas: exp.allocations.map((a) => ({
          fairId: a.fairId,
          fairName: a.fair?.name ?? a.fairId,
          percentual: Number(a.percentual),
        })),
      };
    });
  }

  /** Total de overhead alocado para a feira (soma de valorAlocado) */
  async getTotalAllocatedForFair(fairId: string): Promise<number> {
    const items = await this.findAllocatedForFair(fairId);
    return items.reduce((sum, i) => sum + i.valorAlocado, 0);
  }
}
