import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Fair } from 'src/modules/fairs/entity/fair.entity';

@Entity('finance_cash_flow')
@Index(['fairId', 'period'])
@Index(['period'])
export class CashFlow {
  @ApiProperty({
    description: 'ID único do fluxo de caixa',
    example: '89d8a3ce-36b0-4fe9-b338-ca46fc5855e3',
    type: 'string',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'ID da feira associada',
    example: '89d8a3ce-36b0-4fe9-b338-ca46fc5855e3',
    type: 'string',
    format: 'uuid',
  })
  @Column()
  fairId: string;

  @ApiProperty({
    description: 'Data de referência (mês/ano)',
    example: '2025-01-31',
    type: 'string',
    format: 'date',
  })
  @Column({ type: 'date' })
  period: Date; // Data de referência (mês/ano)

  @ApiProperty({
    description: 'Total de receitas para o período',
    example: 15000.0,
    type: 'number',
    format: 'decimal',
  })
  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalRevenue: number; // Total de receitas

  @ApiProperty({
    description: 'Total de despesas para o período',
    example: 8000.0,
    type: 'number',
    format: 'decimal',
  })
  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalExpenses: number; // Total de despesas

  @ApiProperty({
    description: 'Saldo líquido (receitas - despesas)',
    example: 7000.0,
    type: 'number',
    format: 'decimal',
  })
  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  netBalance: number; // Saldo líquido (receitas - despesas)

  @ApiProperty({
    description: 'Margem de lucro em porcentagem',
    example: 46.67,
    type: 'number',
    format: 'decimal',
  })
  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  profitMargin: number; // Margem de lucro em porcentagem

  @ApiProperty({
    description: 'Observações sobre o período',
    example: 'Janeiro 2025 - Alta temporada de feiras',
    type: 'string',
    nullable: true,
  })
  @Column('text', { nullable: true })
  notes: string; // Observações sobre o período

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2025-01-31T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2025-01-31T15:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ApiProperty({
    description: 'Feira associada ao fluxo de caixa',
    type: () => Fair,
  })
  @ManyToOne(() => Fair, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fairId' })
  fair: Fair;

  // Campos calculados (não persistidos)
  @ApiProperty({
    description: 'Indica se a feira é lucrativa',
    example: true,
    type: 'boolean',
  })
  get isProfitable(): boolean {
    return this.netBalance > 0;
  }

  @ApiProperty({
    description: 'Margem de lucro formatada',
    example: '46.67%',
    type: 'string',
  })
  get profitMarginFormatted(): string {
    return `${this.profitMargin.toFixed(2)}%`;
  }

  @ApiProperty({
    description: 'Saldo formatado com sinal',
    example: '+R$ 7000.00',
    type: 'string',
  })
  get balanceFormatted(): string {
    return this.netBalance >= 0
      ? `+R$ ${this.netBalance.toFixed(2)}`
      : `-R$ ${Math.abs(this.netBalance).toFixed(2)}`;
  }
}
