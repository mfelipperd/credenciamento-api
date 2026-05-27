import { Category } from 'src/modules/categories/entity/categories.entity';
import { HowDidYouKnow } from 'src/modules/how-did-you-know/how-did-you-know.entity';
import { Sector } from 'src/modules/sectors/sectors.entity';
import { Visitor } from 'src/modules/visitors/entities/visitor.entity';
import { UserFair } from 'src/modules/users/entities/user-fair.entity';
import { StandConfiguration } from './stand-configuration.entity';
import { FairDaySchedule } from './fair-day-schedule.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';

export enum FairStatus {
  UPCOMING  = 'upcoming',
  ONGOING   = 'ongoing',
  ENDED     = 'ended',
  CANCELLED = 'cancelled',
}

@Entity('fairs')
export class Fair {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Identidade ────────────────────────────────────────────────────────────

  @Column({ length: 255 })
  name: string;

  /** Edição da feira: "1ª Edição", "ExpoMultimix 2026" */
  @Column({ length: 100, nullable: true })
  edition: string | null;

  /** Descrição curta exibida no site e nos e-mails */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** URL da imagem de capa/banner */
  @Column({ length: 500, nullable: true })
  bannerUrl: string | null;

  /** Ciclo de vida: upcoming → ongoing → ended (ou cancelled) */
  @Column({
    type: 'enum',
    enum: FairStatus,
    default: FairStatus.UPCOMING,
  })
  status: FairStatus;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // ── Local / Endereço ──────────────────────────────────────────────────────

  /** Campo legado: texto livre de localização (mantido para compatibilidade) */
  @Column({ length: 255 })
  location: string;

  /** Nome do pavilhão/venue: "Centro de Convenções Vasco Vasques" */
  @Column({ length: 255, nullable: true })
  venueName: string | null;

  /** Logradouro */
  @Column({ length: 255, nullable: true })
  address: string | null;

  /** Número do endereço */
  @Column({ length: 20, nullable: true })
  number: string | null;

  /** Complemento */
  @Column({ length: 100, nullable: true })
  complement: string | null;

  /** Bairro */
  @Column({ length: 100, nullable: true })
  neighborhood: string | null;

  /** Cidade */
  @Column({ length: 100, nullable: true })
  city: string | null;

  /**
   * UF (2 letras): "AM", "PA", "SP"
   * Usado para filtrar feiras por estado: GET /fairs?uf=AM
   */
  @Column({ length: 2, nullable: true })
  state: string | null;

  @Column({ length: 10, nullable: true })
  zipCode: string | null;

  @Column({ length: 50, nullable: true })
  country: string | null;

  /** Link direto do Google Maps para o local */
  @Column({ length: 500, nullable: true })
  googleMapsUrl: string | null;

  /**
   * Latitude do local (ex: -3.1190275)
   * Usada para gerar links Uber, 99 e Waze no e-mail
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  /**
   * Longitude do local (ex: -60.0217314)
   * Usada para gerar links Uber, 99 e Waze no e-mail
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  // ── Datas e horários ──────────────────────────────────────────────────────

  /** Data de início da feira */
  @Column({ type: 'date', nullable: true })
  startDate: Date | null;

  /** Data de encerramento da feira */
  @Column({ type: 'date', nullable: true })
  endDate: Date | null;

  /**
   * Horário padrão de abertura (HH:mm) — usado quando não há FairDaySchedule
   * para o dia específico
   */
  @Column({ type: 'time', nullable: true })
  startTime: string | null;

  /**
   * Horário padrão de encerramento (HH:mm) — usado quando não há FairDaySchedule
   * para o dia específico
   */
  @Column({ type: 'time', nullable: true })
  endTime: string | null;

  /** @deprecated Use startDate + startTime separadamente */
  @Column({ type: 'datetime', nullable: true })
  startDateTime: Date | null;

  /** @deprecated Use endDate + endTime separadamente */
  @Column({ type: 'datetime', nullable: true })
  endDateTime: Date | null;

  // ── Planejamento ──────────────────────────────────────────────────────────

  /** Meta de visitantes para a feira */
  @Column({ type: 'int', nullable: true })
  expectedVisitors: number | null;

  /** Número de expositores/marcas participantes */
  @Column({ type: 'int', nullable: true })
  expectedExhibitors: number | null;

  // ── Configurações de stands ───────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  totalStands: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPerSquareMeter: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  setupCostPerSquareMeter: number;

  // ── Análise de margem ─────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  expectedRevenue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  expectedProfit: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  expectedProfitMargin: number;

  @Column({ type: 'text', nullable: true })
  insights: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relacionamentos ───────────────────────────────────────────────────────

  @ManyToMany(() => Visitor, (visitor: Visitor) => visitor.fair_visitor)
  @JoinTable({ name: 'fair_visitor' })
  fair_visitor: Visitor[];

  @OneToMany(() => Category, (category) => category.fair)
  categories: Category[];

  @OneToMany(() => Sector, (sector) => sector.fair)
  sectors: Sector[];

  @OneToMany(() => HowDidYouKnow, (howDidYouKnow) => howDidYouKnow.fair)
  howDidYouKnow: HowDidYouKnow[];

  @OneToMany(() => UserFair, (userFair) => userFair.fair)
  userFairs: UserFair[];

  @OneToMany(() => StandConfiguration, (standConfig) => standConfig.fair)
  standConfigurations: StandConfiguration[];

  /** Programação detalhada por dia (horários que diferem do padrão) */
  @OneToMany(() => FairDaySchedule, (schedule) => schedule.fair, {
    cascade: true,
  })
  daySchedules: FairDaySchedule[];
}
