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
import { InstallmentStatus } from '../../common/enums/finance.enums';
import { Revenue } from './revenue.entity';

@Entity('finance_revenue_installments')
@Index(['revenueId', 'status', 'dueDate'])
@Index(['paidAt'])
@Index(['dueDate', 'status'])
export class RevenueInstallment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  revenueId: string;

  @Column()
  n: number; // número da parcela (1..N)

  @Column()
  dueDate: Date;

  @Column('bigint', {
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  valueCents: number;

  @Column({
    type: 'enum',
    enum: InstallmentStatus,
    default: InstallmentStatus.A_VENCER,
  })
  status: InstallmentStatus;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  proofUrl: string; // comprovante (opcional MVP)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos serão adicionados depois
  @ManyToOne(() => Revenue, (revenue) => revenue.installments)
  @JoinColumn({ name: 'revenueId' })
  revenue: Revenue;

  // @OneToMany(() => Attachment, (attachment) => attachment.installment)
  // attachments: Attachment[];
}
