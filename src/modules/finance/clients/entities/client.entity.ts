import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Brand } from './brand.entity';
import { ClientImage } from './client-image.entity';

@Entity('finance_clients')
@Index(['name'])
@Index(['fairId'])
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fairId: string;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  cnpj: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  responsavel: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Brand, (brand) => brand.client, { cascade: true })
  brands: Brand[];

  @OneToMany(() => ClientImage, (image) => image.client)
  images: ClientImage[];

  // Relacionamento será adicionado depois
  // @OneToMany(() => Revenue, (revenue) => revenue.client)
  // revenues: Revenue[];
}

