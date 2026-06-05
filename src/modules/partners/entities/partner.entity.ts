import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PartnerWithdrawal } from './partner-withdrawal.entity';

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string; // Referência ao usuário

  @Column({ length: 255 })
  name: string;

  @Column({ length: 14, unique: true, nullable: true })
  cpf: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  percentage: number; // Porcentagem de participação nos lucros (0-100)

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalEarnings: number; // Total de ganhos acumulados

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalWithdrawn: number; // Total já sacado

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  availableBalance: number; // Saldo disponível para saque

  @Column({ default: true })
  isActive: boolean;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @OneToMany(() => PartnerWithdrawal, (withdrawal) => withdrawal.partner)
  withdrawals: PartnerWithdrawal[];

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
