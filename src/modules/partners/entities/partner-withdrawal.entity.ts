import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Partner } from './partner.entity';

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

@Entity('partner_withdrawals')
export class PartnerWithdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  partnerId: string;

  @Column()
  fairId: string;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Column({ length: 500, nullable: true })
  reason: string; // Motivo do saque

  @Column({ length: 500, nullable: true })
  rejectionReason: string; // Motivo da rejeição (se aplicável)

  @Column({ nullable: true })
  approvedBy: string; // ID do admin que aprovou

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ length: 500, nullable: true })
  bankDetails: string; // Dados bancários para transferência

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => Partner, (partner) => partner.withdrawals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner;
}
