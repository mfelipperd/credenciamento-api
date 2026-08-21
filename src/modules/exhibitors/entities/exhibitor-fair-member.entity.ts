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
import { ExhibitorFair } from './exhibitor-fair.entity';
import { ExhibitorMember } from './exhibitor-member.entity';

export enum ExhibitorCredentialStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

@Entity('exhibitor_fair_members')
@Index(['exhibitorFairId', 'memberId'], { unique: true })
@Index(['credentialCode'], { unique: true })
export class ExhibitorFairMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  exhibitorFairId: string;

  @Column()
  memberId: string;

  @Column({ length: 36, unique: true })
  credentialCode: string;

  @Column({
    type: 'enum',
    enum: ExhibitorCredentialStatus,
    default: ExhibitorCredentialStatus.ACTIVE,
  })
  status: ExhibitorCredentialStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ExhibitorFair, (item) => item.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exhibitorFairId' })
  exhibitorFair: ExhibitorFair;

  @ManyToOne(() => ExhibitorMember, (member) => member.fairMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'memberId' })
  member: ExhibitorMember;
}
