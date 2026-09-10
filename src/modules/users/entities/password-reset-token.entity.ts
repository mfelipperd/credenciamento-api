import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../entitie/users.entity';

export type PasswordResetTokenType = 'first_access' | 'password_reset';

@Entity('password_reset_tokens')
@Index(['userId', 'type', 'usedAt'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 64 })
  codeHash: string;

  @Column({ type: 'enum', enum: ['first_access', 'password_reset'] })
  type: PasswordResetTokenType;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
