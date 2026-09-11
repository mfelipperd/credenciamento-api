import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExhibitorAccount } from '../../exhibitors/entities/exhibitor-account.entity';
import { Fair } from '../../fairs/entity/fair.entity';
import { StandReservationStatus } from '../enums/stand-reservation-status.enum';
import { StandReservationItem } from './stand-reservation-item.entity';

/**
 * Uma reserva de stand(s) via checkout Mercado Pago (Orders API) — pode
 * cobrir vários stands numa única cobrança (ver StandReservationItem). O
 * próprio `id` dessa entidade é enviado como `external_reference` pro
 * Mercado Pago, e o `mpOrderId` guarda o `id` da order que eles devolvem.
 *
 * Quem compra é um visitante anônimo — ele ainda não tem ExhibitorAccount
 * nesse momento (a conta só é provisionada depois que o pagamento é
 * confirmado, via ExhibitorAuthService.provisionAfterPayment). Por isso os
 * dados do comprador ficam guardados aqui, e exhibitorAccountId só é
 * preenchido no fim do fluxo.
 */
@Entity('stand_reservation_payments')
export class StandReservationPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fairId: string;

  @Column({ length: 255 })
  buyerCompanyName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  buyerCnpj?: string;

  @Column({ length: 255 })
  buyerEmail: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  buyerPhone?: string;

  /** Preenchido só depois que o pagamento é aprovado e a conta é provisionada */
  @Column({ nullable: true })
  exhibitorAccountId?: string;

  @Column({
    type: 'enum',
    enum: StandReservationStatus,
    default: StandReservationStatus.PENDING,
  })
  status: StandReservationStatus;

  /** Valor nominal total (soma do preço dos stands), em centavos */
  @Column('bigint', {
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  amountCents: number;

  /** ID da order no Mercado Pago (POST /v1/orders) */
  @Column({ type: 'varchar', length: 64, nullable: true })
  mpOrderId?: string;

  /** Status da order reportado pelo Mercado Pago (ex: "processed", "action_required") */
  @Column({ type: 'varchar', length: 32, nullable: true })
  mpStatus?: string;

  /** 'pix' | 'master' | 'visa' | etc — payment_method.id devolvido pelo MP */
  @Column({ type: 'varchar', length: 32, nullable: true })
  paymentMethodId?: string;

  @Column({ nullable: true })
  installments?: number;

  /** Pix: copia-e-cola, pra mostrar/copiar na tela na hora */
  @Column('text', { nullable: true })
  pixQrCode?: string;

  /** Pix: imagem do QR Code em base64, pra renderizar direto na tela */
  @Column('longtext', { nullable: true })
  pixQrCodeBase64?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ExhibitorAccount, { nullable: true })
  @JoinColumn({ name: 'exhibitorAccountId' })
  exhibitorAccount?: ExhibitorAccount;

  @ManyToOne(() => Fair)
  @JoinColumn({ name: 'fairId' })
  fair: Fair;

  @OneToMany(() => StandReservationItem, (item) => item.reservationPayment, {
    cascade: true,
  })
  items: StandReservationItem[];
}
