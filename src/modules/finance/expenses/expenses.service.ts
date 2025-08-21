import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
  ) {}

  async create(createExpenseDto: CreateExpenseDto): Promise<Expense> {
    const expense = this.expensesRepository.create(createExpenseDto);
    return await this.expensesRepository.save(expense);
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
