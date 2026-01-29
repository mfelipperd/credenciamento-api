import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { CheckIn } from 'src/modules/checkins/entity/checkins.entity';
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

  @Column({ length: 255, nullable: true })
  street: string;

  @Column({ length: 50, nullable: true })
  number: string;

  @Column({ length: 255, nullable: true })
  complement: string;

  @Column({ length: 255, nullable: true })
  neighborhood: string;

  @Column({ length: 255, nullable: true })
  city: string;

  @Column({ length: 2, nullable: true })
  state: string;

  @Column({ type: 'simple-array' })
  sectors: string[];

  @Column()
  howDidYouKnow: string;

  @Column()
  category: string;

  @CreateDateColumn()
  registrationDate: Date;

  @ManyToOne(() => User, (user) => user.visitors, { nullable: true })
  createdBy?: User;

  @OneToMany(() => CheckIn, (checkIn) => checkIn.visitor)
  checkIns: CheckIn[];

  @ManyToMany(() => Fair, (fair) => fair.fair_visitor)
  @JoinTable({
    name: 'fair_visitor',
    joinColumn: {
      name: 'visitorsRegistrationCode',
      referencedColumnName: 'registrationCode',
    },
    inverseJoinColumn: {
      name: 'fairsId', // coluna que referencia Fair
      referencedColumnName: 'id',
    },
  })
  fair_visitor: Fair[];
}
