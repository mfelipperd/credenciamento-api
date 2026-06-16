import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProspectType {
  EXPOSITOR = 'EXPOSITOR',   // comprador de stand
  VISITANTE = 'VISITANTE',   // lojista / visitante da feira
}

export enum ProspectStatus {
  NOVO = 'NOVO',
  CONTATADO = 'CONTATADO',
  RESPONDEU = 'RESPONDEU',
  INTERESSADO = 'INTERESSADO',
  CONVERTIDO = 'CONVERTIDO',
  DESCARTADO = 'DESCARTADO',
}

export enum ProspectSource {
  MANUAL = 'MANUAL',
  BUSCA_CNPJ = 'BUSCA_CNPJ',
  IMPORTACAO_CSV = 'IMPORTACAO_CSV',
  INDICACAO = 'INDICACAO',
}

@Entity('prospects')
@Index(['fairId', 'cnpj'], { unique: true, where: 'cnpj IS NOT NULL' })
export class Prospect {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  fairId: string;

  @Column({ type: 'enum', enum: ProspectType, default: ProspectType.VISITANTE })
  type: ProspectType;

  @Column({ type: 'enum', enum: ProspectStatus, default: ProspectStatus.NOVO })
  status: ProspectStatus;

  @Column({ type: 'enum', enum: ProspectSource, default: ProspectSource.MANUAL })
  source: ProspectSource;

  @Column({ nullable: true, length: 14 })
  cnpj: string;

  @Column({ length: 255 })
  razaoSocial: string;

  @Column({ nullable: true, length: 255 })
  nomeFantasia: string;

  @Column({ nullable: true, length: 255 })
  email: string;

  @Column({ nullable: true, length: 20 })
  phone: string;

  @Column({ nullable: true, length: 100 })
  city: string;

  @Column({ nullable: true, length: 2 })
  state: string;

  @Column({ nullable: true, length: 10 })
  cnaeCode: string;

  @Column({ nullable: true, length: 255 })
  cnaeDescription: string;

  @Column({ nullable: true, length: 100 })
  cnaeSector: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ nullable: true })
  convertedAt: Date;

  @Column({ nullable: true })
  lastContactAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
