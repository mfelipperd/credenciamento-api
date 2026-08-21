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
import { User } from '../../users/entitie/users.entity';
import { ExhibitorMemberRole } from './exhibitor-member.entity';
import { Exhibitor } from './exhibitor.entity';

export enum ExhibitorInvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

@Entity('exhibitor_invitations')
@Index(['tokenHash'], { unique: true })
@Index(['exhibitorId', 'email'])
export class ExhibitorInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  exhibitorId: string;

  @Column({ length: 255 })
  email: string;

  @Column({ type: 'enum', enum: ExhibitorMemberRole })
  role: ExhibitorMemberRole;

  @Column({ length: 64 })
  tokenHash: string;

  @Column({
    type: 'enum',
    enum: ExhibitorInvitationStatus,
    default: ExhibitorInvitationStatus.PENDING,
  })
  status: ExhibitorInvitationStatus;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ nullable: true })
  invitedBy?: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Exhibitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibitorId' })
  exhibitor: Exhibitor;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invitedBy' })
  inviter?: User | null;
}
