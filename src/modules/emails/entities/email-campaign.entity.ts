import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AudienceQuery } from '../types/audience-query';

@Entity('email_campaigns')
export class EmailCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 500 })
  subject: string;

  @Column({ type: 'longtext' })
  htmlContent: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  targetFairId: string | null;

  // Set when the campaign was built with the advanced multi-fair segmentation
  // (preview_marketing_email's audienceQuery) instead of targetFairId/sendTo —
  // null for campaigns sent the classic way.
  @Column({ type: 'simple-json', nullable: true })
  audienceQuery: AudienceQuery | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  templateFairId: string | null;

  @Column({ length: 10, default: 'all' })
  sendTo: string;

  @Column({ default: 0 })
  totalQueued: number;

  @Column({ default: 0 })
  suppressedCount: number;

  @Column({ length: 50, unique: true })
  brevoTag: string;

  @CreateDateColumn()
  sentAt: Date;
}
