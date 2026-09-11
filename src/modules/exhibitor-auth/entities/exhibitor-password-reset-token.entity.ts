import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ExhibitorAccount } from '../../exhibitors/entities/exhibitor-account.entity';

export type ExhibitorPasswordResetTokenType = 'first_access' | 'password_reset';

@Entity('exhibitor_password_reset_tokens')
@Index(['exhibitorAccountId', 'type', 'usedAt'])
export class ExhibitorPasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  exhibitorAccountId: string;

  @ManyToOne(() => ExhibitorAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibitorAccountId' })
  exhibitorAccount: ExhibitorAccount;

  @Column({ length: 64 })
  codeHash: string;

  @Column({ type: 'enum', enum: ['first_access', 'password_reset'] })
  type: ExhibitorPasswordResetTokenType;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
