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
import { Exhibitor } from './exhibitor.entity';

@Entity('exhibitor_accounts')
@Index(['email'], { unique: true })
export class ExhibitorAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  exhibitorId: string;

  @Column({ length: 255 })
  email: string;

  /** Nulo até o expositor definir a senha via fluxo de primeiro acesso (pós-pagamento) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ default: false })
  passwordSet: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Exhibitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibitorId' })
  exhibitor: Exhibitor;
}
