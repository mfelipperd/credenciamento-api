import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod } from '../../finance/common/enums/finance.enums';
import { Stand } from '../../finance/stands/entities/stand.entity';
import { ExhibitorAccount } from '../../exhibitors/entities/exhibitor-account.entity';
import { Fair } from '../../fairs/entity/fair.entity';
import { StandReservationStatus } from '../enums/stand-reservation-status.enum';

@Entity('stand_reservation_payments')
@Index(['standId', 'status'])
export class StandReservationPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  standId: number;

  @Column()
  exhibitorAccountId: string;

  @Column()
  fairId: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: StandReservationStatus,
    default: StandReservationStatus.PENDING,
  })
  status: StandReservationStatus;

  @Column({ default: 1 })
  installments: number;

  @Column('bigint', {
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  amountCents: number;

  @Column('bigint', {
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  interestCents: number;

  @Column({ nullable: true })
  mpPaymentId?: string;

  @Column({ nullable: true })
  mpPreferenceId?: string;

  @Column('text', { nullable: true })
  pixQrCode?: string;

  @Column('longtext', { nullable: true })
  pixQrCodeBase64?: string;

  @Column('text', { nullable: true })
  pixCopyPaste?: string;

  @Column({ nullable: true })
  boletoUrl?: string;

  @Column({ nullable: true })
  boletoBarcode?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Stand)
  @JoinColumn({ name: 'standId' })
  stand: Stand;

  @ManyToOne(() => ExhibitorAccount)
  @JoinColumn({ name: 'exhibitorAccountId' })
  exhibitorAccount: ExhibitorAccount;

  @ManyToOne(() => Fair)
  @JoinColumn({ name: 'fairId' })
  fair: Fair;
}
