import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('finance_attachments')
@Index(['entityType', 'entityId'])
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string; // "revenue" | "installment"

  @Column()
  entityId: string;

  @Column()
  filename: string;

  @Column()
  url: string;

  @Column()
  mime: string;

  @Column()
  sizeBytes: number;

  @Column()
  uploadedBy: string;

  @CreateDateColumn()
  uploadedAt: Date;

  // Relacionamentos serão adicionados depois
  // @ManyToOne(() => Revenue, { nullable: true })
  // @JoinColumn({ name: 'entityId' })
  // revenue: Revenue;

  // @ManyToOne(() => RevenueInstallment, { nullable: true })
  // @JoinColumn({ name: 'entityId' })
  // installment: RevenueInstallment;
}
