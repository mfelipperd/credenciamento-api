import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Category } from '../../categories/entity/categories.entity';
import { Account } from '../common/entities/account.entity';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async create(createExpenseDto: CreateExpenseDto): Promise<Expense> {
    try {
      this.logger.log(`Criando despesa: ${JSON.stringify(createExpenseDto)}`);

      // Validações adicionais
      if (createExpenseDto.valor <= 0) {
        throw new BadRequestException('Valor deve ser maior que zero');
      }

      if (createExpenseDto.data) {
        const data = new Date(createExpenseDto.data);
        if (isNaN(data.getTime())) {
          throw new BadRequestException('Data inválida');
        }
      }

      // Debug: Verificar se a categoria existe
      this.logger.log(
        `Buscando categoria: ${createExpenseDto.categoryId} na feira: ${createExpenseDto.fairId}`,
      );

      // Validar se a categoria existe na feira específica
      const category = await this.categoryRepository.findOne({
        where: {
          id: createExpenseDto.categoryId,
          fair: { id: createExpenseDto.fairId },
        },
        relations: ['fair'],
      });

      this.logger.log(`Resultado da busca da categoria:`, category);

      if (!category) {
        throw new BadRequestException(
          `Categoria com ID ${createExpenseDto.categoryId} não encontrada na feira ${createExpenseDto.fairId}`,
        );
      }

      // Debug: Verificar se a conta existe
      this.logger.log(`Buscando conta: ${createExpenseDto.accountId}`);

      // Validar se a conta existe (global)
      const account = await this.accountRepository.findOne({
        where: { id: createExpenseDto.accountId },
      });

      this.logger.log(`Resultado da busca da conta:`, account);

      if (!account) {
        throw new BadRequestException(
          `Conta bancária com ID ${createExpenseDto.accountId} não encontrada`,
        );
      }

      this.logger.log(
        `Validações passaram: categoria "${category.name}" e conta "${account.nomeConta}"`,
      );

      // Debug: Criar a despesa
      this.logger.log(`Criando entidade Expense com dados:`, createExpenseDto);

      const expense = this.expensesRepository.create(createExpenseDto);
      this.logger.log(`Entidade Expense criada:`, expense);

      // Debug: Salvar a despesa
      this.logger.log(`Salvando despesa no banco...`);

      const savedExpense = await this.expensesRepository.save(expense);
      this.logger.log(`Despesa salva com sucesso: ${savedExpense.id}`);

      return savedExpense;
    } catch (error: any) {
      this.logger.error(`Erro ao criar despesa: ${error.message}`, error.stack);
      this.logger.error(`Tipo do erro:`, typeof error);
      this.logger.error(`Código do erro:`, error.code);
      this.logger.error(`Stack completo:`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      // Tratar erros específicos do banco de dados
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          throw new BadRequestException(
            'Erro de referência no banco de dados. Verifique se os IDs estão corretos.',
          );
        }

        if (error.code === 'ER_DUP_ENTRY') {
          throw new BadRequestException('Despesa duplicada');
        }

        if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
          throw new BadRequestException('Formato de dados inválido');
        }
      }

      throw new BadRequestException(`Erro ao criar despesa: ${error.message}`);
    }
  }

  async findAllByFair(fairId: string): Promise<Expense[]> {
    return await this.expensesRepository.find({
      where: { fairId },
      relations: ['category', 'account'],
      order: { data: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Expense> {
    const expense = await this.expensesRepository.findOne({
      where: { id },
      relations: ['category', 'account', 'fair'],
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
    const expense = await this.findOne(id);

    // Se estiver alterando a feira, verificar se a nova feira existe
    if (updateExpenseDto.fairId && updateExpenseDto.fairId !== expense.fairId) {
      // Aqui você pode adicionar validação se a nova feira existe
    }

    Object.assign(expense, updateExpenseDto);
    return await this.expensesRepository.save(expense);
  }

  async remove(id: string): Promise<void> {
    const expense = await this.findOne(id);
    await this.expensesRepository.remove(expense);
  }

  // Relatórios
  async getTotalByFair(fairId: string): Promise<number> {
    const result = await this.expensesRepository
      .createQueryBuilder('expense')
      .select('SUM(expense.valor)', 'total')
      .where('expense.fairId = :fairId', { fairId })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  async getTotalByCategory(
    fairId: string,
  ): Promise<Array<{ categoryId: string; total: number }>> {
    return await this.expensesRepository
      .createQueryBuilder('expense')
      .select('expense.categoryId', 'categoryId')
      .addSelect('SUM(expense.valor)', 'total')
      .where('expense.fairId = :fairId', { fairId })
      .groupBy('expense.categoryId')
      .getRawMany();
  }

  async getTotalByAccount(
    fairId: string,
  ): Promise<Array<{ accountId: string; total: number }>> {
    return await this.expensesRepository
      .createQueryBuilder('expense')
      .select('expense.accountId', 'accountId')
      .addSelect('SUM(expense.valor)', 'total')
      .where('expense.fairId = :fairId', { fairId })
      .groupBy('expense.accountId')
      .getRawMany();
  }
}
