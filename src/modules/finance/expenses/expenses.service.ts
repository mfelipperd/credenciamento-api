import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseFairAllocation } from './entities/expense-fair-allocation.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { SetOverheadDto } from './dto/set-overhead.dto';
import { FinanceCategory } from '../common/entities/finance-category.entity';
import { Account } from '../common/entities/account.entity';

export interface DirectOverheadItem {
  id: string;
  category: { id: string; name: string } | null;
  descricao: string | null;
  data: Date;
  valorTotal: number;
  percentualDesteFair: number;
  valorAlocado: number;
  account: { id: string; nomeConta: string; banco: string } | null;
  feirasRateadas: Array<{
    fairId: string;
    fairName: string;
    percentual: number;
  }>;
  source: 'direct_overhead'; // distingue de overhead_expenses
}

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    @InjectRepository(ExpenseFairAllocation)
    private allocationRepository: Repository<ExpenseFairAllocation>,
    @InjectRepository(FinanceCategory)
    private categoryRepository: Repository<FinanceCategory>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private resolveAllocations(
    fairs: { fairId: string; percentual?: number }[],
  ): { fairId: string; percentual: number }[] {
    const hasAny = fairs.some((f) => f.percentual !== undefined);

    if (!hasAny) {
      const equal = Math.round((1 / fairs.length) * 10000) / 10000;
      const allocs = fairs.map((f, i) => ({
        fairId: f.fairId,
        percentual: i < fairs.length - 1 ? equal : 0,
      }));
      const sumOthers = allocs
        .slice(0, -1)
        .reduce((s, a) => s + a.percentual, 0);
      allocs[allocs.length - 1].percentual =
        Math.round((1 - sumOthers) * 10000) / 10000;
      return allocs;
    }

    const missing = fairs.filter((f) => f.percentual === undefined);
    if (missing.length > 0) {
      throw new BadRequestException(
        'Quando percentual manual é usado, todos os itens devem ter percentual.',
      );
    }

    const sum = fairs.reduce((s, f) => s + f.percentual!, 0);
    if (Math.abs(sum - 1) > 0.001) {
      throw new BadRequestException(
        `A soma dos percentuais deve ser 100%. Atual: ${(sum * 100).toFixed(2)}%`,
      );
    }

    return fairs.map((f) => ({ fairId: f.fairId, percentual: f.percentual! }));
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async create(createExpenseDto: CreateExpenseDto): Promise<Expense> {
    try {
      if (createExpenseDto.valor <= 0) {
        throw new BadRequestException('Valor deve ser maior que zero');
      }

      if (createExpenseDto.data) {
        const data = new Date(createExpenseDto.data);
        if (isNaN(data.getTime())) {
          throw new BadRequestException('Data inválida');
        }
      }

      const category = await this.categoryRepository.findOne({
        where: [
          { id: createExpenseDto.categoryId, fairId: createExpenseDto.fairId },
          { id: createExpenseDto.categoryId, global: true },
        ],
      });

      if (!category) {
        throw new BadRequestException(
          `Categoria com ID ${createExpenseDto.categoryId} não encontrada (nem específica da feira ${createExpenseDto.fairId}, nem global)`,
        );
      }

      const account = await this.accountRepository.findOne({
        where: { id: createExpenseDto.accountId },
      });

      if (!account) {
        throw new BadRequestException(
          `Conta bancária com ID ${createExpenseDto.accountId} não encontrada`,
        );
      }

      const expense = this.expensesRepository.create(createExpenseDto);
      return await this.expensesRepository.save(expense);
    } catch (error: any) {
      this.logger.error(`Erro ao criar despesa: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) throw error;

      if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new BadRequestException(
          'Erro de referência no banco. Verifique se os IDs estão corretos.',
        );
      }
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException('Despesa duplicada');
      }

      throw new BadRequestException(`Erro ao criar despesa: ${error.message}`);
    }
  }

  /**
   * Retorna apenas despesas DIRETAS da feira (isOverhead = false).
   * Despesas com isOverhead = true aparecem em findOverheadAllocatedForFair().
   */
  async findAllByFair(fairId: string): Promise<Expense[]> {
    const expenses = await this.expensesRepository.find({
      where: { fairId, isOverhead: false },
      relations: ['category', 'account', 'fair'],
      order: { data: 'DESC' },
    });

    return expenses.sort((a, b) => {
      const catA = a.category?.nome ?? '';
      const catB = b.category?.nome ?? '';
      if (catA !== catB) return catA.localeCompare(catB);
      return new Date(b.data).getTime() - new Date(a.data).getTime();
    });
  }

  /**
   * Retorna despesas diretas marcadas como overhead (isOverhead = true)
   * que possuem alocação para a feira informada.
   */
  async findOverheadAllocatedForFair(
    fairId: string,
  ): Promise<DirectOverheadItem[]> {
    const allocations = await this.allocationRepository.find({
      where: { fairId },
      relations: [
        'expense',
        'expense.category',
        'expense.account',
        'expense.fairAllocations',
        'expense.fairAllocations.fair',
        'fair',
      ],
      order: { expense: { data: 'DESC' } },
    });

    return allocations.map((alloc) => {
      const exp = alloc.expense;
      const valorTotal = Number(exp.valor);
      const pct = Number(alloc.percentual);

      return {
        id: exp.id,
        category: exp.category
          ? { id: exp.category.id, name: exp.category.nome }
          : null,
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
        feirasRateadas: exp.fairAllocations.map((a) => ({
          fairId: a.fairId,
          fairName: a.fair?.name ?? a.fairId,
          percentual: Number(a.percentual),
        })),
        source: 'direct_overhead' as const,
      };
    });
  }

  /** Total de overhead direto alocado para a feira */
  async getTotalDirectOverheadForFair(fairId: string): Promise<number> {
    const items = await this.findOverheadAllocatedForFair(fairId);
    return items.reduce((sum, i) => sum + i.valorAlocado, 0);
  }

  /**
   * Busca despesas parecidas (mesma feira, direta ou rateada via overhead) pra
   * evitar duplicidade antes de cadastrar uma nova. Pelo menos um filtro
   * (valor, descricaoContains ou data) deve ser informado.
   */
  async findSimilarExpenses(params: {
    fairId: string;
    valor?: number;
    descricaoContains?: string;
    data?: string;
    diasTolerancia?: number;
  }): Promise<Expense[]> {
    const { fairId, valor, descricaoContains, data, diasTolerancia = 45 } =
      params;

    if (valor === undefined && !descricaoContains && !data) {
      throw new BadRequestException(
        'Informe pelo menos um filtro: valor, descricaoContains ou data.',
      );
    }

    const qb = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .leftJoinAndSelect('expense.fairAllocations', 'allocation')
      .where(
        new Brackets((qb2) => {
          qb2
            .where('expense.fairId = :fairId AND expense.isOverhead = false', {
              fairId,
            })
            .orWhere('allocation.fairId = :fairId', { fairId });
        }),
      );

    if (valor !== undefined) {
      qb.andWhere('ABS(expense.valor - :valor) <= 0.5', { valor });
    }
    if (descricaoContains) {
      qb.andWhere('expense.descricao LIKE :desc', {
        desc: `%${descricaoContains}%`,
      });
    }
    if (data) {
      qb.andWhere('ABS(DATEDIFF(expense.data, :data)) <= :dias', {
        data,
        dias: diasTolerancia,
      });
    }

    return qb.orderBy('expense.data', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Expense> {
    const expense = await this.expensesRepository.findOne({
      where: { id },
      relations: [
        'category',
        'account',
        'fair',
        'fairAllocations',
        'fairAllocations.fair',
      ],
    });

    if (!expense) {
      throw new NotFoundException(`Despesa com ID ${id} não encontrada`);
    }

    return expense;
  }

  async update(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
  ): Promise<Expense> {
    // Garante que a despesa existe (lança 404 caso contrário).
    await this.findOne(id);

    // Usa update() em vez de carregar a entidade com relações + save():
    // quando a entidade é carregada com `category`/`account` populados e
    // depois recebe um novo categoryId/accountId via Object.assign, o
    // TypeORM prioriza o objeto de relação já carregado (com o id antigo)
    // na hora de resolver a FK no save(), sobrescrevendo silenciosamente
    // o novo valor — o update parece funcionar (200) mas não persiste.
    await this.expensesRepository.update(id, updateExpenseDto);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const expense = await this.findOne(id);
    await this.expensesRepository.remove(expense);
  }

  // ─── Overhead direto ─────────────────────────────────────────────────────────

  /**
   * Marca uma despesa como overhead e define as feiras do rateio.
   * Pode ser chamado em despesas já existentes ou novas.
   * Se chamado novamente na mesma despesa, substitui as alocações anteriores.
   */
  async setOverhead(id: string, dto: SetOverheadDto): Promise<Expense> {
    const expense = await this.findOne(id);
    const allocations = this.resolveAllocations(dto.fairs);

    await this.dataSource.transaction(async (manager) => {
      // Remove alocações anteriores se existirem
      await manager.delete(ExpenseFairAllocation, { expenseId: id });

      // Marca como overhead
      expense.isOverhead = true;
      await manager.save(Expense, expense);

      // Cria novas alocações
      const entities = allocations.map((a) =>
        Object.assign(new ExpenseFairAllocation(), {
          expenseId: id,
          fairId: a.fairId,
          percentual: a.percentual,
        }),
      );
      await manager.save(ExpenseFairAllocation, entities);

      this.logger.log(
        `Despesa ${id} marcada como overhead — feiras: ${allocations
          .map((a) => `${a.fairId}(${(a.percentual * 100).toFixed(0)}%)`)
          .join(', ')}`,
      );
    });

    return this.findOne(id);
  }

  /**
   * Remove o flag de overhead e exclui todas as alocações.
   * A despesa volta a aparecer em directExpenses.
   */
  async unsetOverhead(id: string): Promise<Expense> {
    const expense = await this.findOne(id);
    if (!expense.isOverhead) return expense;

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ExpenseFairAllocation, { expenseId: id });
      expense.isOverhead = false;
      await manager.save(Expense, expense);
    });

    return this.findOne(id);
  }

  // ─── Relatórios ─────────────────────────────────────────────────────────────

  /** Total de despesas DIRETAS (isOverhead = false) da feira */
  async getTotalByFair(fairId: string): Promise<number> {
    const expenses = await this.expensesRepository.find({
      where: { fairId, isOverhead: false },
      select: ['id', 'valor'],
    });
    return expenses.reduce((sum, e) => sum + Number(e.valor), 0);
  }

  async getTotalByCategory(
    fairId: string,
  ): Promise<Array<{ categoryId: string; total: number }>> {
    return this.expensesRepository
      .createQueryBuilder('expense')
      .select('expense.categoryId', 'categoryId')
      .addSelect('SUM(expense.valor)', 'total')
      .where('expense.fairId = :fairId AND expense.isOverhead = false', {
        fairId,
      })
      .groupBy('expense.categoryId')
      .getRawMany();
  }

  async getTotalByAccount(
    fairId: string,
  ): Promise<Array<{ accountId: string; total: number }>> {
    return this.expensesRepository
      .createQueryBuilder('expense')
      .select('expense.accountId', 'accountId')
      .addSelect('SUM(expense.valor)', 'total')
      .where('expense.fairId = :fairId AND expense.isOverhead = false', {
        fairId,
      })
      .groupBy('expense.accountId')
      .getRawMany();
  }
}
