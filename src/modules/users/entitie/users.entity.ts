import { ArrayNotEmpty, IsArray, IsOptional, IsUUID } from 'class-validator';
import { EUserRole } from 'src/enum/role';
import { Visitor } from 'src/modules/visitors/entities/visitor.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('users')
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

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Visitor, (visitor) => visitor.createdBy)
  visitors: Visitor[];
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  fairIds?: string[];
}
