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
import { StandConfiguration } from '../../../fairs/entity/stand-configuration.entity';

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

  @Column({ name: 'stand_configuration_id', type: 'uuid', nullable: true })
  standConfigurationId?: string;

  @Column({ name: 'held_until', type: 'datetime', nullable: true })
  heldUntil?: Date | null;

  @Column({ name: 'held_by_reservation_id', type: 'uuid', nullable: true })
  heldByReservationId?: string | null;

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

  @ManyToOne(() => StandConfiguration, { nullable: true })
  @JoinColumn({ name: 'stand_configuration_id' })
  standConfiguration?: StandConfiguration;
}
