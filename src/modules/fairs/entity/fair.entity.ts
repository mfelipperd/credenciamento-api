import { Category } from 'src/modules/categories/entity/categories.entity';
import { HowDidYouKnow } from 'src/modules/how-did-you-know/how-did-you-know.entity';
import { Sector } from 'src/modules/sectors/sectors.entity';
import { Visitor } from 'src/modules/visitors/entities/visitor.entity';
import { UserFair } from 'src/modules/users/entities/user-fair.entity';
import { StandConfiguration } from './stand-configuration.entity';
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

  @Column({ length: 500, nullable: true })
  googleMapsUrl: string; // URL do Google Maps do local

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

  // Campos de data e hora (temporariamente opcionais para migração)
  @Column({ type: 'date', nullable: true })
  startDate: Date; // Data de início da feira

  @Column({ type: 'date', nullable: true })
  endDate: Date; // Data de fim da feira

  @Column({ type: 'time', nullable: true })
  startTime: string; // Horário de início (HH:mm)

  @Column({ type: 'time', nullable: true })
  endTime: string; // Horário de fim (HH:mm)

  @Column({ type: 'datetime', nullable: true })
  startDateTime: Date; // Data e hora de início combinadas

  @Column({ type: 'datetime', nullable: true })
  endDateTime: Date; // Data e hora de fim combinadas

  // Configurações de stands
  @Column({ type: 'int', default: 0 })
  totalStands: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPerSquareMeter: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  setupCostPerSquareMeter: number;


  // Análise de margem
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  expectedRevenue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  expectedProfit: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  expectedProfitMargin: number;

  @Column({ type: 'text', nullable: true })
  insights: string; // JSON string com insights de negócio

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

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

  // 🔹 Relacionamento com configurações de stands
  @OneToMany(() => StandConfiguration, (standConfig) => standConfig.fair)
  standConfigurations: StandConfiguration[];
}
