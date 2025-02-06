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

  @ManyToOne(() => Fair, (fair) => fair.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fairId' }) // 🔹 O TypeORM já cria a coluna `fairId`
  fair: Fair;
}
