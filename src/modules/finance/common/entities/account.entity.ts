import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AccountType {
  CORRENTE = 'corrente',
  POUPANCA = 'poupanca',
  OUTRO = 'outro',
}

@Entity('finance_accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  nomeConta: string;

  @Column({ length: 255, nullable: true })
  banco: string;

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.CORRENTE,
  })
  tipo: AccountType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
