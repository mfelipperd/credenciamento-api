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
import { Partner } from './partner.entity';

@Entity('fair_partners')
@Index(['fairId', 'partnerId'], { unique: true })
export class FairPartner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fairId: string;

  @Column()
  partnerId: string;

  @Column('decimal', {
    precision: 5,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  percentage: number; // Porcentagem específica para esta feira

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  totalEarnings: number; // Ganhos específicos desta feira

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  totalWithdrawn: number; // Saques específicos desta feira

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  availableBalance: number; // Saldo disponível desta feira

  @Column({ default: true })
  isActive: boolean; // Se o sócio está ativo nesta feira

  @Column('text', { nullable: true })
  notes: string; // Observações específicas desta feira

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner;

  // Métodos de cálculo
  getCurrentBalance(): number {
    return this.availableBalance;
  }

  getTotalEarnings(): number {
    return this.totalEarnings;
  }

  getTotalWithdrawn(): number {
    return this.totalWithdrawn;
  }

  canWithdraw(amount: number): boolean {
    return this.isActive && amount > 0 && amount <= this.availableBalance;
  }
}
