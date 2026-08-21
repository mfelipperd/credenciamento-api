import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { OverheadExpense } from './entities/overhead-expense.entity';
import { OverheadExpenseAllocation } from './entities/overhead-expense-allocation.entity';
import { FinanceCategory } from '../common/entities/finance-category.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Category } from '../../categories/entity/categories.entity';
import {
  CreateOverheadExpenseDto,
  UpdateOverheadExpenseDto,
  ConvertExpenseToOverheadDto,
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
    @InjectRepository(FinanceCategory)
    private readonly financeCategoryRepo: Repository<FinanceCategory>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Category)
    private readonly fairCategoryRepo: Repository<Category>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async validateCategory(categoryId: string): Promise<FinanceCategory> {
    const category = await this.financeCategoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new BadRequestException(
        `Categoria com ID ${categoryId} não encontrada. Use GET /finance/categories para listar as categorias globais disponíveis.`,
      );
    }
    if (!category.global) {
      throw new BadRequestException(
        `A categoria "${category.nome}" não é global. Overhead expenses devem usar categorias com global: true.`,
      );
    }
    return category;
  }

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
      const equal = Math.round((1 / fairs.length) * 10000) / 10000;
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

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(dto: CreateOverheadExpenseDto): Promise<OverheadExpense> {
    this.logger.log(
      `Criando overhead expense: categoryId=${dto.categoryId} — R$ ${dto.valor}`,
    );

    await this.validateCategory(dto.categoryId);
    const allocations = this.resolveAllocations(dto.fairs);

    return this.dataSource.transaction(async (manager) => {
      const expense = Object.assign(new OverheadExpense(), {
        categoryId: dto.categoryId,
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
      relations: ['category', 'account', 'allocations', 'allocations.fair'],
      order: { data: 'DESC' },
    });
  }

  async findOne(id: string): Promise<OverheadExpense> {
    const expense = await this.overheadRepo.findOne({
      where: { id },
      relations: ['category', 'account', 'allocations', 'allocations.fair'],
    });
    if (!expense) {
      throw new NotFoundException(
        `Overhead expense com ID ${id} não encontrado`,
      );
    }
    return expense;
  }

  async update(
    id: string,
    dto: UpdateOverheadExpenseDto,
  ): Promise<OverheadExpense> {
    this.logger.log(`Atualizando overhead expense: ${id}`);
    const expense = await this.findOne(id);

    if (dto.categoryId) {
      await this.validateCategory(dto.categoryId);
    }

    const { fairs, ...fields } = dto;
    Object.assign(expense, fields);

    await this.dataSource.transaction(async (manager) => {
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
    });

    // findOne fora da transação — dados já commitados
    return this.findOne(id);
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
        'overheadExpense.category',
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
        category: exp.category
          ? { id: exp.category.id, nome: exp.category.nome }
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

  // ── Conversão de despesa direta → overhead ─────────────────────────────────

  /**
   * Converte uma despesa direta (finance_expenses) em uma overhead expense.
   *
   * Fluxo:
   * 1. Localiza a despesa direta pelo ID (com categoria).
   * 2. Determina a finance_category global a usar:
   *    - Se `dto.financeCategoryId` for fornecido → valida e usa.
   *    - Caso contrário → busca finance_category com nome igual ao da categoria da despesa (case-insensitive).
   *      Se não existir → cria automaticamente.
   * 3. Em transação: cria overhead_expense + allocations e remove a despesa original.
   */
  async convertExpenseToOverhead(
    expenseId: string,
    dto: ConvertExpenseToOverheadDto,
  ): Promise<OverheadExpense> {
    // 1. Buscar despesa direta
    const directExpense = await this.expenseRepo.findOne({
      where: { id: expenseId },
      relations: ['category', 'account'],
    });

    if (!directExpense) {
      throw new NotFoundException(
        `Despesa com ID ${expenseId} não encontrada.`,
      );
    }

    // 2. Determinar a finance_category global
    let financeCategory: FinanceCategory;

    if (dto.financeCategoryId) {
      financeCategory = await this.validateCategory(dto.financeCategoryId);
    } else {
      const categoryName =
        directExpense.category?.nome ?? directExpense.descricao ?? 'Overhead';

      // Tenta encontrar uma categoria global com o mesmo nome (case-insensitive)
      const existing = await this.financeCategoryRepo.findOne({
        where: { nome: ILike(categoryName), global: true },
      });

      if (existing) {
        financeCategory = existing;
        this.logger.log(
          `Usando finance_category existente "${financeCategory.nome}" (id=${financeCategory.id})`,
        );
      } else {
        // Cria automaticamente como categoria global
        const newCategory = Object.assign(new FinanceCategory(), {
          nome: categoryName.toUpperCase(),
          global: true,
          isRequired: false,
        });
        financeCategory = await this.financeCategoryRepo.save(newCategory);
        this.logger.log(
          `Criada finance_category "${financeCategory.nome}" (id=${financeCategory.id})`,
        );
      }
    }

    // 3. Resolver alocações
    const allocations = this.resolveAllocations(dto.fairs);

    // 4. Transação: cria overhead + allocations + remove despesa original
    const overheadId = await this.dataSource.transaction(async (manager) => {
      const overhead = Object.assign(new OverheadExpense(), {
        categoryId: financeCategory.id,
        accountId: directExpense.accountId ?? null,
        descricao: directExpense.descricao ?? null,
        valor: directExpense.valor,
        data: directExpense.data,
        observacoes: directExpense.observacoes ?? null,
      });
      const savedOverhead = await manager.save(OverheadExpense, overhead);

      const allocationEntities = allocations.map((a) =>
        Object.assign(new OverheadExpenseAllocation(), {
          overheadExpenseId: savedOverhead.id,
          fairId: a.fairId,
          percentual: a.percentual,
        }),
      );
      await manager.save(OverheadExpenseAllocation, allocationEntities);

      // Remove a despesa direta original
      await manager.remove(Expense, directExpense);

      this.logger.log(
        `Despesa ${expenseId} convertida para overhead ${savedOverhead.id} ` +
          `(categoria: "${financeCategory.nome}", feiras: ${allocations.map((a) => a.fairId).join(', ')})`,
      );

      return savedOverhead.id;
    });

    // findOne fora da transação — dados já commitados, repositório enxerga normalmente
    return this.findOne(overheadId);
  }

  // ── Categorias globais disponíveis ──────────────────────────────────────────

  /** Lista categorias globais de finance_categories para uso no overhead */
  async findGlobalCategories(): Promise<FinanceCategory[]> {
    return this.financeCategoryRepo.find({
      where: { global: true },
      order: { nome: 'ASC' },
    });
  }
}
