import { ECategory } from 'src/enum/category';
import { EHowDidYouKnow } from 'src/enum/didyouknow';
import { CheckIn } from 'src/modules/checkins/entity/checkins.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('visitors')
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  registrationCode: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  company: string;

  @Column()
  email: string;

  @Column()
  cnpj: string;

  @Column()
  phone: string;

  @Column()
  zipCode: string;

  @Column({ nullable: true })
  street: string;

  @Column({ nullable: true })
  neighborhood: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true, length: 2 })
  state: string;

  @Column({ type: 'text', nullable: true })
  sectors: string;

  @Column({ type: 'enum', enum: EHowDidYouKnow })
  howDidYouKnow: EHowDidYouKnow;

  @Column({
    type: 'enum',
    enum: ECategory,
  })
  category: string;

  @CreateDateColumn()
  registrationDate: Date;

  @OneToMany(() => CheckIn, (checkIn) => checkIn.visitor) checkIns: CheckIn[];
}
