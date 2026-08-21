import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { Client } from '../../finance/clients/entities/client.entity';
import { Exhibitor } from './exhibitor.entity';

@Entity('exhibitor_finance_clients')
@Index(['exhibitorId', 'clientId'], { unique: true })
@Index(['clientId'], { unique: true })
export class ExhibitorFinanceClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  exhibitorId: string;

  @Column()
  clientId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Exhibitor, (exhibitor) => exhibitor.financeClients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exhibitorId' })
  exhibitor: Exhibitor;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;
}
