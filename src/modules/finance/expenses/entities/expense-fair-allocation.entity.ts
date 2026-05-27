import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Expense } from './expense.entity';
import { Fair } from 'src/modules/fairs/entity/fair.entity';

/**
 * Define o percentual de uma despesa overhead alocado a cada feira.
 * Usada apenas quando Expense.isOverhead = true.
 */
@Entity('expense_fair_allocations')
@Index(['expenseId', 'fairId'], { unique: true })
export class ExpenseFairAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  expenseId: string;

  @Column()
  fairId: string;

  /**
   * Fração decimal (0.0001 a 1.0000). A soma de todos os registros
   * do mesmo expenseId deve ser 1.0.
   */
  @Column('decimal', {
    precision: 5,
    scale: 4,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  percentual: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Expense, (expense) => expense.fairAllocations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'expenseId' })
  expense: Expense;

  @ManyToOne(() => Fair)
  @JoinColumn({ name: 'fairId' })
  fair: Fair;
}
