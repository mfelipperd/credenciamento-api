import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { CheckIn } from 'src/modules/checkins/entity/checkins.entity';
import { ECategory } from 'src/enum/category';
import { EHowDidYouKnow } from 'src/enum/didyouknow';
import { User } from 'src/modules/users/entitie/users.entity';
import { Fair } from 'src/modules/fairs/entity/fair.entity';

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

  @Column({ type: 'simple-array' })
  sectors: string[];

  @Column({ type: 'enum', enum: EHowDidYouKnow })
  howDidYouKnow: EHowDidYouKnow;

  @Column({ type: 'enum', enum: ECategory })
  category: ECategory;

  @CreateDateColumn()
  registrationDate: Date;

  @ManyToOne(() => User, (user) => user.visitors, { nullable: true })
  createdBy?: User;

  @OneToMany(() => CheckIn, (checkIn) => checkIn.visitor)
  checkIns: CheckIn[];

  @ManyToMany(() => Fair, (fair) => fair.fair_visitor)
  fair_visitor: Fair[];
}
