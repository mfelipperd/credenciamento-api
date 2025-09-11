import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Fair } from 'src/modules/fairs/entity/fair.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Fair, (fair) => fair.categories, { onDelete: 'CASCADE' }) // 🔹 Confirme que a relação está correta
  @JoinColumn({ name: 'fairId' }) // 🔹 Garante que a chave estrangeira está correta
  fair: Fair;
}
