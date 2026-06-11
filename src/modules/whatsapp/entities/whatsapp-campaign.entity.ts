import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('whatsapp_campaigns')
export class WhatsappCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 36 })
  targetFairId: string;

  @Column({ length: 10, default: 'all' })
  sendTo: 'all' | 'absent';

  @Column({ type: 'text' })
  messageTemplate: string;

  @Column({ length: 50, unique: true })
  campaignTag: string;

  @Column({ default: 0 })
  totalQueued: number;

  @Column({ default: 0 })
  totalSent: number;

  @Column({ default: 0 })
  totalFailed: number;

  @CreateDateColumn()
  createdAt: Date;
}
