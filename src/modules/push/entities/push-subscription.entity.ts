import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 512, unique: true })
  endpoint: string;

  @Column({ length: 255 })
  p256dh: string;

  @Column({ length: 255 })
  auth: string;

  @CreateDateColumn()
  createdAt: Date;
}
