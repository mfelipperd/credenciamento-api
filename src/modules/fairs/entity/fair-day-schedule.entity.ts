import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fair } from './fair.entity';

@Entity('fair_day_schedules')
export class FairDaySchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Referência à feira */
  @ManyToOne(() => Fair, (fair) => fair.daySchedules, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'fairId' })
  fair: Fair;

  @Column({ length: 36 })
  fairId: string;

  /** Data do dia (YYYY-MM-DD) */
  @Column({ type: 'date' })
  date: string;

  /** Horário de abertura deste dia (HH:mm) */
  @Column({ type: 'time' })
  startTime: string;

  /** Horário de encerramento deste dia (HH:mm) */
  @Column({ type: 'time' })
  endTime: string;

  /** Observação opcional sobre o dia (ex: "Encerramento antecipado") */
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;
}
