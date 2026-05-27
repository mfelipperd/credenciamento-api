import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { OverheadExpense } from './overhead-expense.entity';

@Entity('overhead_expense_allocations')
@Index(['overheadExpenseId'])
@Index(['fairId'])
export class OverheadExpenseAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  overheadExpenseId: string;

  @Column()
  fairId: string;

  /**
   * Percentual desta feira na despesa (0.0001 a 1.0000).
   * Ex: 0.5000 = 50 %
   */
  @Column('decimal', { precision: 5, scale: 4 })
  percentual: number;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => OverheadExpense, (e) => e.allocations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'overheadExpenseId' })
  overheadExpense: OverheadExpense;

  @ManyToOne(() => Fair, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'fairId' })
  fair: Fair;
}
