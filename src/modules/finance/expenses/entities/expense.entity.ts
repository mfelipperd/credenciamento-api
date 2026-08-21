import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { FinanceCategory } from '../../common/entities/finance-category.entity';
import { Account } from '../../common/entities/account.entity';
import { ExpenseFairAllocation } from './expense-fair-allocation.entity';

@Entity('finance_expenses')
@Index(['fairId', 'data'])
@Index(['categoryId'])
@Index(['accountId'])
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fairId: string;

  @Column()
  categoryId: string;

  @Column()
  accountId: string;

  @Column({ length: 500, nullable: true })
  descricao: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  valor: number;

  @Column({ type: 'date' })
  data: Date;

  @Column('text', { nullable: true })
  observacoes: string;

  /**
   * Quando true, a despesa é um custo compartilhado entre feiras.
   * O rateio é definido em fairAllocations (expense_fair_allocations).
   * A despesa NÃO aparece em directExpenses — apenas em allocatedOverhead
   * para cada feira com alocação.
   */
  @Column({ default: false })
  isOverhead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => Fair, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fairId' })
  fair: Fair;

  @ManyToOne(() => FinanceCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: FinanceCategory;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @OneToMany(() => ExpenseFairAllocation, (alloc) => alloc.expense, {
    cascade: true,
  })
  fairAllocations: ExpenseFairAllocation[];
}
