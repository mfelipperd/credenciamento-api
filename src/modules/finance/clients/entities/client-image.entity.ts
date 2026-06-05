import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Client } from './client.entity';

@Entity('finance_client_images')
@Index(['clientId'])
@Index(['registeredFairId'])
export class ClientImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @Column()
  registeredFairId: string;

  @Column({ length: 500 })
  url: string;

  @Column({ nullable: true, length: 255 })
  caption: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Client, (client) => client.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @OneToMany(() => ClientImageFair, (cif) => cif.image, { cascade: true, eager: true })
  imageFairs: ClientImageFair[];
}

@Entity('finance_client_image_fairs')
@Index(['imageId'])
@Index(['fairId'])
export class ClientImageFair {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  imageId: string;

  @Column()
  fairId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ClientImage, (image) => image.imageFairs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'imageId' })
  image: ClientImage;
}
