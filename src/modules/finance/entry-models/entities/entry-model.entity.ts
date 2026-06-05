import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EntryModelType } from '../../common/enums/finance.enums';

@Entity('finance_entry_models')
@Index(['fairId', 'type', 'active'])
export class EntryModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fairId: string;

  @Column({
    type: 'enum',
    enum: EntryModelType,
  })
  type: EntryModelType;

  @Column()
  name: string;

  @Column('bigint', {
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  baseValue: number; // centavos

  @Column('bigint', {
    nullable: true,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  costCents: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamento será adicionado depois
  // @OneToMany(() => Revenue, (revenue) => revenue.entryModel)
  // revenues: Revenue[];
}
