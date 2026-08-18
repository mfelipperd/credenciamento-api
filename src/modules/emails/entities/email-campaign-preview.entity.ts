import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AudienceQuery } from '../types/audience-query';

@Entity('email_campaign_previews')
export class EmailCampaignPreview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 500 })
  subject: string;

  @Column({ type: 'longtext' })
  htmlContent: string;

  // Legacy targeting (targetFairId/templateFairId/additionalFairIds/sendTo) — set
  // when the preview was NOT built with audienceQuery.
  @Column({ type: 'varchar', length: 36, nullable: true })
  targetFairId: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  templateFairId: string | null;

  @Column('simple-json')
  additionalFairIds: string[];

  @Column({ type: 'varchar', length: 10, nullable: true })
  sendTo: string | null;

  // Advanced multi-fair segmentation — set instead of the legacy fields above
  // when the preview was built with audienceQuery.
  @Column({ type: 'simple-json', nullable: true })
  audienceQuery: AudienceQuery | null;

  @Column({ default: 0 })
  totalRecipients: number;

  @Column({ default: 0 })
  suppressedByBrevo: number;

  @Column({ default: false })
  used: boolean;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
