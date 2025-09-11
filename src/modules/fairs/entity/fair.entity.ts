import { Category } from 'src/modules/categories/entity/categories.entity';
import { HowDidYouKnow } from 'src/modules/how-did-you-know/how-did-you-know.entity';
import { Sector } from 'src/modules/sectors/sectors.entity';
import { Visitor } from 'src/modules/visitors/entities/visitor.entity';
import { UserFair } from 'src/modules/users/entities/user-fair.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';

@Entity('fairs')
export class Fair {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  location: string;

  // Campos de endereço detalhado
  @Column({ length: 255, nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 50, nullable: true })
  state: string;

  @Column({ length: 20, nullable: true })
  zipCode: string;

  @Column({ length: 100, nullable: true })
  country: string;

  // Campos de data e hora
  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column({ type: 'datetime', nullable: true })
  startDateTime: Date;

  @Column({ type: 'datetime', nullable: true })
  endDateTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  // Relacionamento com visitantes
  @ManyToMany(() => Visitor, (visitor: Visitor) => visitor.fair_visitor)
  @JoinTable({ name: 'fair_visitor' }) // ✅ Define explicitamente a tabela de junção
  fair_visitor: Visitor[];

  // 🔹 Novo relacionamento com categorias
  @OneToMany(() => Category, (category) => category.fair)
  categories: Category[];

  // 🔹 Novo relacionamento com setores
  @OneToMany(() => Sector, (sector) => sector.fair)
  sectors: Sector[];

  // 🔹 Novo relacionamento com "Como nos conheceu"
  @OneToMany(() => HowDidYouKnow, (howDidYouKnow) => howDidYouKnow.fair)
  howDidYouKnow: HowDidYouKnow[];

  // 🔹 Relacionamento com usuários através da tabela de associação
  @OneToMany(() => UserFair, (userFair) => userFair.fair)
  userFairs: UserFair[];
}
