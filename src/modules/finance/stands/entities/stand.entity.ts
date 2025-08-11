import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Fair } from '../../../fairs/entity/fair.entity';
import { Revenue } from '../../revenues/entities/revenue.entity';

@Entity('stands')
export class Stand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'stand_number' })
  standNumber: number;

  @Column({ name: 'fair_id' })
  fairId: string;

  @Column({ name: 'revenue_id', nullable: true })
  revenueId?: string;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Fair)
  @JoinColumn({ name: 'fair_id' })
  fair: Fair;

  @OneToOne(() => Revenue, { nullable: true })
  @JoinColumn({ name: 'revenue_id' })
  revenue?: Revenue;
}
