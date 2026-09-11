import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Fair } from './fair.entity';
import { EntryModel } from '../../finance/entry-models/entities/entry-model.entity';

@Entity('stand_configurations')
export class StandConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  fairId: string;

  @Column({ length: 50 })
  name: string; // Ex: "Stand 2x3", "Stand 3x3", "Stand 4x4"

  /** Modelo de lançamento financeiro correspondente — usado pra gerar a Revenue
   * automaticamente quando uma reserva online desse tipo de stand é paga. */
  @Column({ type: 'uuid', nullable: true })
  entryModelId: string | null;

  @ManyToOne(() => EntryModel, { nullable: true })
  @JoinColumn({ name: 'entryModelId' })
  entryModel?: EntryModel;

  @Column({ type: 'int' })
  width: number; // Largura em metros

  @Column({ type: 'int' })
  height: number; // Altura em metros

  @Column({ type: 'int' })
  quantity: number; // Quantidade disponível

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerSquareMeter: number; // Preço por m²

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  setupCostPerSquareMeter: number; // Custo de montagem por m²

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number; // Preço total (área * preço por m²)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  anchorPrice: number | null; // Valor de mercado projetado (âncora), pra exibir riscado ao lado do totalPrice

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalSetupCost: number; // Custo total de montagem

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  profitPerStand: number; // Lucro por stand

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  profitMargin: number; // Margem de lucro em %

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Fair, (fair) => fair.standConfigurations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fairId' })
  fair: Fair;
}
