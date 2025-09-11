import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../entitie/users.entity';
import { Fair } from '../../fairs/entity/fair.entity';

@Entity('user_fairs')
export class UserFair {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @Column('uuid')
  fairId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  role: string; // Pode ser 'admin', 'manager', 'operator', etc. para diferentes níveis de acesso por feira

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.userFairs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Fair, fair => fair.userFairs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fairId' })
  fair: Fair;
}
