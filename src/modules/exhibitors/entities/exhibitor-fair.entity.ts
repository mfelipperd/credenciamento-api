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
import { Fair } from '../../fairs/entity/fair.entity';
import { ExhibitorFairMember } from './exhibitor-fair-member.entity';
import { Exhibitor } from './exhibitor.entity';

export enum ExhibitorFairStatus {
  INVITED = 'INVITED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('exhibitor_fairs')
@Index(['exhibitorId', 'fairId'], { unique: true })
export class ExhibitorFair {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  exhibitorId: string;

  @Column()
  fairId: string;

  @Column({
    type: 'enum',
    enum: ExhibitorFairStatus,
    default: ExhibitorFairStatus.CONFIRMED,
  })
  status: ExhibitorFairStatus;

  @Column({ length: 100, nullable: true })
  source?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Exhibitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibitorId' })
  exhibitor: Exhibitor;

  @ManyToOne(() => Fair, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fairId' })
  fair: Fair;

  @OneToMany(() => ExhibitorFairMember, (item) => item.exhibitorFair)
  members: ExhibitorFairMember[];
}
