import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  RevenueStatus,
  PaymentMethod,
  EntryModelType,
} from '../../common/enums/finance.enums';
import { Client } from '../../clients/entities/client.entity';
import { EntryModel } from '../../entry-models/entities/entry-model.entity';
import { RevenueInstallment } from './revenue-installment.entity';
import { Stand } from '../../stands/entities/stand.entity';

@Entity('finance_revenues')
@Index(['fairId', 'status', 'type'])
@Index(['clientId'])
export class Revenue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fairId: string;

  @Column({
    type: 'enum',
    enum: EntryModelType,
  })
  type: EntryModelType;

  @Column()
  entryModelId: string;

  @Column()
  clientId: string;

  @Column('bigint', {
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  baseValue: number;

  @Column('bigint', {
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  discountCents: number;

  @Column('bigint', {
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  contractValue: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({ default: 1 })
  numberOfInstallments: number;

  @Column({ nullable: true })
  condition: string;

  @Column({
    type: 'enum',
    enum: RevenueStatus,
    default: RevenueStatus.PENDENTE,
  })
  status: RevenueStatus;

  @Column('text', { nullable: true })
  notes: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => EntryModel)
  @JoinColumn({ name: 'entryModelId' })
  entryModel: EntryModel;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @OneToOne(() => Stand, (stand) => stand.revenue, { nullable: true })
  stand?: Stand;

  @OneToMany(() => RevenueInstallment, (installment) => installment.revenue, {
    cascade: true,
  })
  installments: RevenueInstallment[];

  // Relacionamentos serão adicionados depois
  // @OneToMany(() => Attachment, (attachment) => attachment.revenue)
  // attachments: Attachment[];

  // Campos calculados (implementar depois)
  // @Expose()
  // get paidCents(): number {
  //   return this.installments?.filter(i => i.status === InstallmentStatus.PAGA)
  //     .reduce((sum, i) => sum + i.valueCents, 0) || 0;
  // }

  // @Expose()
  // get openCents(): number {
  //   return this.contractValue - this.paidCents;
  // }

  // @Expose()
  // get nextDueDate(): Date | null {
  //   const openInstallments = this.installments?.filter(
  //     i => i.status === InstallmentStatus.A_VENCER || i.status === InstallmentStatus.VENCIDA
  //   ).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  //   return openInstallments?.[0]?.dueDate || null;
  // }
}
