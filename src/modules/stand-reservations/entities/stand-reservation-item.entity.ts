import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Stand } from '../../finance/stands/entities/stand.entity';
import { StandReservationPayment } from './stand-reservation-payment.entity';

/** Um stand dentro de uma reserva — uma StandReservationPayment pode ter vários */
@Entity('stand_reservation_items')
export class StandReservationItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reservationPaymentId: string;

  @Column()
  standId: number;

  /** Preço desse stand no momento da reserva (o preço do tipo pode mudar depois) */
  @Column('bigint', {
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  priceCents: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => StandReservationPayment, (payment) => payment.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservationPaymentId' })
  reservationPayment: StandReservationPayment;

  @ManyToOne(() => Stand)
  @JoinColumn({ name: 'standId' })
  stand: Stand;
}
