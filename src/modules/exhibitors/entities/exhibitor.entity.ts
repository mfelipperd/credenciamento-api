import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExhibitorFinanceClient } from './exhibitor-finance-client.entity';

export enum ExhibitorType {
  BRAND = 'BRAND',
  FACTORY = 'FACTORY',
  DISTRIBUTOR = 'DISTRIBUTOR',
  OTHER = 'OTHER',
}

@Entity('exhibitors')
@Index(['normalizedName'], { unique: true })
export class Exhibitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  normalizedName: string;

  @Column({ type: 'enum', enum: ExhibitorType, default: ExhibitorType.OTHER })
  type: ExhibitorType;

  @Column({ type: 'varchar', length: 14, nullable: true })
  cnpj?: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ExhibitorFinanceClient, (link) => link.exhibitor)
  financeClients: ExhibitorFinanceClient[];
}
