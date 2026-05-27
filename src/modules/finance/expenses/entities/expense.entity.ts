import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { Category } from '../../../categories/entity/categories.entity';
import { Account } from '../../common/entities/account.entity';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => Fair, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fairId' })
  fair: Fair;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account: Account;
}
