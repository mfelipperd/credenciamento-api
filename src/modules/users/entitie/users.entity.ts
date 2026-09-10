import { EUserRole } from 'src/enum/role';
import { Visitor } from 'src/modules/visitors/entities/visitor.entity';
import { UserFair } from '../entities/user-fair.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: EUserRole })
  role: EUserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  passwordSet: boolean;

  @Column({ length: 14, nullable: true })
  cpf: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Visitor, (visitor) => visitor.createdBy)
  visitors: Visitor[];

  @OneToMany(() => UserFair, (userFair) => userFair.user)
  userFairs: UserFair[];
}
