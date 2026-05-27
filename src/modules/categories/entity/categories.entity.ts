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

  /**
   * FK explícita para permitir queries diretas: where: { fairId }
   * Sem isso, o TypeORM não resolve corretamente o nested-where via relação.
   */
  @Column({ nullable: true })
  fairId: string;

  @ManyToOne(() => Fair, (fair) => fair.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fairId' })
  fair: Fair;
}
