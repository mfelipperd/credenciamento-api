import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @Column({ length: 36 })
  targetFairId: string;

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
