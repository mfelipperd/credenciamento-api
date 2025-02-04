import { Visitor } from 'src/modules/visitors/entities/visitor.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';

@Entity('fairs')
export class Fair {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  location: string;

  @Column({ type: 'date' })
  date: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => Visitor, (visitor: Visitor) => visitor.fair_visitor)
  @JoinTable({ name: 'fair_visitor' }) // ✅ Define explicitamente a tabela de junção
  fair_visitor: Visitor[];
}
