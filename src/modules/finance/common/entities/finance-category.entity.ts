import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('finance_categories')
export class FinanceCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  nome: string;

  @Column({ nullable: true })
  parentId: string;

  @Column({ default: true })
  global: boolean;

  @Column({ nullable: true })
  fairId: string;

  // Relacionamento com categoria pai (auto-referência)
  @ManyToOne(() => FinanceCategory, (category) => category.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent: FinanceCategory;

  // Relacionamento com categorias filhas
  @OneToMany(() => FinanceCategory, (category) => category.parent)
  children: FinanceCategory[];
}
