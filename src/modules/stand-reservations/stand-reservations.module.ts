import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stand } from '../finance/stands/entities/stand.entity';
import { ClientsModule } from '../finance/clients/clients.module';
import { RevenuesModule } from '../finance/revenues/revenues.module';
import { ExhibitorsModule } from '../exhibitors/exhibitors.module';
import { ExhibitorAuthModule } from '../exhibitor-auth/exhibitor-auth.module';
import { StandReservationPayment } from './entities/stand-reservation-payment.entity';
import { StandReservationItem } from './entities/stand-reservation-item.entity';
import { StandReservationsController } from './stand-reservations.controller';
import { StandReservationsService } from './stand-reservations.service';
import { MercadoPagoService } from './mercado-pago.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stand, StandReservationPayment, StandReservationItem]),
    ClientsModule,
    RevenuesModule,
    ExhibitorsModule,
    ExhibitorAuthModule,
  ],
  controllers: [StandReservationsController],
  providers: [StandReservationsService, MercadoPagoService],
})
export class StandReservationsModule {}
