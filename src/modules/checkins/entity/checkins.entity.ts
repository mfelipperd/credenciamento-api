import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Visitor } from '../../visitors/entities/visitor.entity';

@Entity('checkins')
export class CheckIn {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Visitor, (visitor) => visitor.registrationCode, {
    onDelete: 'CASCADE',
  })
  visitor: Visitor;

  @Column({ type: 'date' })
  checkInDate: string;

  @CreateDateColumn()
  createdAt: Date;
}
