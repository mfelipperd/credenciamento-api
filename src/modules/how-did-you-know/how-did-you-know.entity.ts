import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Fair } from 'src/modules/fairs/entity/fair.entity';

@Entity('how_did_you_know')
export class HowDidYouKnow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @ManyToOne(() => Fair, (fair) => fair.howDidYouKnow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fairId' })
  fair: Fair;
}
