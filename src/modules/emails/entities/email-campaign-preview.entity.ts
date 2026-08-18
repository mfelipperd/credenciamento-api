import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @Column({ length: 36 })
  targetFairId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  templateFairId: string | null;

  @Column('simple-json')
  additionalFairIds: string[];

  @Column({ length: 10, default: 'all' })
  sendTo: string;

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
