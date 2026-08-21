import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entitie/users.entity';
import { ExhibitorFairMember } from './exhibitor-fair-member.entity';
import { Exhibitor } from './exhibitor.entity';

export enum ExhibitorMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

@Entity('exhibitor_members')
@Index(['exhibitorId', 'normalizedName'], { unique: true })
@Index(['userId'])
export class ExhibitorMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  exhibitorId: string;

  @Column({ nullable: true })
  userId?: number | null;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  normalizedName: string;

  @Column({ length: 255, nullable: true })
  email?: string | null;

  @Column({ length: 30, nullable: true })
  phone?: string | null;

  @Column({ length: 255, nullable: true })
  jobTitle?: string | null;

  @Column({
    type: 'enum',
    enum: ExhibitorMemberRole,
    default: ExhibitorMemberRole.STAFF,
  })
  role: ExhibitorMemberRole;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Exhibitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibitorId' })
  exhibitor: Exhibitor;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User | null;

  @OneToMany(() => ExhibitorFairMember, (item) => item.member)
  fairMemberships: ExhibitorFairMember[];
}
