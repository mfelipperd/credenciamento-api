import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Account } from '../../common/entities/account.entity';
import { OverheadExpenseAllocation } from './overhead-expense-allocation.entity';

@Entity('overhead_expenses')
export class OverheadExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Categoria livre: ex. "Aluguel", "Pessoal", "Impostos" */
  @Column({ length: 255 })
  categoria: string;

  @Column({ nullable: true })
  accountId: string;

  @Column({ length: 500, nullable: true })
  descricao: string;

  @Column('decimal', { precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'date' })
  data: Date;

  @Column('text', { nullable: true })
  observacoes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @OneToMany(
    () => OverheadExpenseAllocation,
    (allocation) => allocation.overheadExpense,
    { cascade: true, eager: false },
  )
  allocations: OverheadExpenseAllocation[];
}
