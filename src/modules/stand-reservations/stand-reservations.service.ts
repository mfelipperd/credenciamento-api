import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Stand } from '../finance/stands/entities/stand.entity';
import { ClientsService } from '../finance/clients/clients.service';
import { ExhibitorsService } from '../exhibitors/exhibitors.service';
import { ExhibitorAuthService } from '../exhibitor-auth/exhibitor-auth.service';
import { RevenuesService } from '../finance/revenues/revenues.service';
import { PaymentMethod } from '../finance/common/enums/finance.enums';
import { StandReservationPayment } from './entities/stand-reservation-payment.entity';
import { StandReservationItem } from './entities/stand-reservation-item.entity';
import { StandReservationStatus } from './enums/stand-reservation-status.enum';
import { CreateStandReservationDto } from './stand-reservations.dto';
import { isMercadoPagoOrderPaid, MercadoPagoService } from './mercado-pago.service';

const HOLD_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class StandReservationsService {
  private readonly logger = new Logger(StandReservationsService.name);

  constructor(
    @InjectRepository(Stand)
    private readonly standRepository: Repository<Stand>,
    @InjectRepository(StandReservationPayment)
    private readonly reservationRepository: Repository<StandReservationPayment>,
    @InjectRepository(StandReservationItem)
    private readonly reservationItemRepository: Repository<StandReservationItem>,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly clientsService: ClientsService,
    private readonly exhibitorsService: ExhibitorsService,
    private readonly exhibitorAuthService: ExhibitorAuthService,
    private readonly revenuesService: RevenuesService,
    private readonly configService: ConfigService,
  ) {}

  async createCheckout(dto: CreateStandReservationDto) {
    if (dto.paymentMethod === 'card' && (!dto.cardToken || !dto.cardPaymentMethodId || !dto.installments)) {
      throw new BadRequestException(
        'cardToken, cardPaymentMethodId e installments são obrigatórios pra pagamento no cartão',
      );
    }

    const now = new Date();
    const selected = await this.standRepository.find({
      where: { id: In(dto.standIds), fairId: dto.fairId },
      relations: { standConfiguration: true },
    });

    if (selected.length !== dto.standIds.length) {
      throw new NotFoundException('Um ou mais stands não foram encontrados nessa feira');
    }

    for (const stand of selected) {
      const isHeld = !!stand.heldUntil && stand.heldUntil > now;
      if (!stand.isAvailable || isHeld) {
        throw new BadRequestException(
          `Stand ${stand.standNumber} não está mais disponível`,
        );
      }
      if (!stand.standConfiguration) {
        throw new BadRequestException(
          `Stand ${stand.standNumber} ainda não tem um tipo/preço configurado`,
        );
      }
    }

    const amountCents = selected.reduce(
      (sum, s) => sum + Math.round(Number(s.standConfiguration!.totalPrice) * 100),
      0,
    );

    const reservation = await this.reservationRepository.save(
      this.reservationRepository.create({
        fairId: dto.fairId,
        buyerCompanyName: dto.companyName,
        buyerCnpj: dto.cnpj,
        buyerEmail: dto.email,
        buyerPhone: dto.phone,
        amountCents,
        status: StandReservationStatus.PENDING,
      }),
    );

    const items = selected.map((stand) =>
      this.reservationItemRepository.create({
        reservationPaymentId: reservation.id,
        standId: stand.id,
        priceCents: Math.round(Number(stand.standConfiguration!.totalPrice) * 100),
      }),
    );
    await this.reservationItemRepository.save(items);

    const heldUntil = new Date(now.getTime() + HOLD_DURATION_MS);
    await this.standRepository.update(
      { id: In(selected.map((s) => s.id)) },
      { heldUntil, heldByReservationId: reservation.id },
    );

    const apiUrl = this.configService.get<string>('API_URL') ?? '';
    const description = selected
      .map((s) => `Stand ${s.standNumber} (${s.standConfiguration!.name})`)
      .join(', ');
    const [firstName, ...rest] = dto.companyName.trim().split(' ');
    const payer = {
      email: dto.email,
      firstName: firstName || dto.companyName,
      lastName: rest.join(' ') || firstName || dto.companyName,
      cpf: dto.cnpj?.length === 11 ? dto.cnpj : undefined,
    };

    const result =
      dto.paymentMethod === 'pix'
        ? await this.mercadoPagoService.createPixOrder({
            externalReference: reservation.id,
            amountCents,
            description,
            notificationUrl: `${apiUrl}/webhooks/mercado-pago`,
            payer,
          })
        : await this.mercadoPagoService.createCardOrder({
            externalReference: reservation.id,
            amountCents,
            description,
            notificationUrl: `${apiUrl}/webhooks/mercado-pago`,
            cardToken: dto.cardToken!,
            installments: dto.installments!,
            issuerId: dto.issuerId,
            paymentMethodId: dto.cardPaymentMethodId!,
            payer,
          });

    reservation.mpOrderId = result.mpOrderId;
    reservation.mpStatus = result.status;
    reservation.paymentMethodId = result.paymentMethodId;
    reservation.installments = result.installments;
    reservation.pixQrCode = result.pixQrCode;
    reservation.pixQrCodeBase64 = result.pixQrCodeBase64;
    await this.reservationRepository.save(reservation);

    if (isMercadoPagoOrderPaid(result.status, result.statusDetail)) {
      await this.approveReservation(reservation.id, result.status);
    }

    return {
      reservationId: reservation.id,
      status: reservation.status,
      pixQrCode: reservation.pixQrCode,
      pixQrCodeBase64: reservation.pixQrCodeBase64,
    };
  }

  /**
   * Chamado pelo webhook do Mercado Pago. A assinatura (x-signature) já foi
   * validada no controller antes de chegar aqui; mesmo assim, buscamos a
   * order direto na API (GET /v1/orders/:id) em vez de confiar em qualquer
   * valor de status que porventura viesse no corpo do webhook.
   */
  async confirmPaymentFromWebhook(mpOrderId: string) {
    const reservation = await this.reservationRepository.findOne({
      where: { mpOrderId },
    });
    if (!reservation) {
      this.logger.warn(`Webhook Mercado Pago pra order desconhecida: ${mpOrderId}`);
      return;
    }
    if (reservation.status === StandReservationStatus.APPROVED) {
      return; // já processado — idempotente
    }

    const order = await this.mercadoPagoService.getOrder(mpOrderId);
    if (!order || !isMercadoPagoOrderPaid(order.status, order.statusDetail)) {
      this.logger.log(
        `Order ${mpOrderId} ainda não confirmada (status: ${order?.status ?? 'desconhecido'})`,
      );
      return;
    }

    await this.approveReservation(reservation.id, order.status);
  }

  private async approveReservation(reservationId: string, mpStatus?: string) {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: { items: { stand: { standConfiguration: true } } },
    });
    if (!reservation) return;

    reservation.status = StandReservationStatus.APPROVED;
    if (mpStatus) reservation.mpStatus = mpStatus;

    const account = await this.exhibitorAuthService.provisionAfterPayment({
      companyName: reservation.buyerCompanyName,
      cnpj: reservation.buyerCnpj,
      email: reservation.buyerEmail,
    });
    reservation.exhibitorAccountId = account.id;
    await this.reservationRepository.save(reservation);

    let client = reservation.buyerCnpj
      ? await this.clientsService.findByCnpj(reservation.buyerCnpj)
      : null;
    if (!client) client = await this.clientsService.findByEmail(reservation.buyerEmail);
    if (!client) {
      client = await this.clientsService.create({
        fairId: reservation.fairId,
        name: reservation.buyerCompanyName,
        cnpj: reservation.buyerCnpj,
        email: reservation.buyerEmail,
        phone: reservation.buyerPhone,
      });
    }
    await this.exhibitorsService.linkFinanceClient(account.exhibitorId, client.id);

    const paymentMethod =
      reservation.paymentMethodId === 'pix' ? PaymentMethod.PIX : PaymentMethod.CARTAO;

    for (const item of reservation.items) {
      const stand = item.stand;
      const entryModelId = stand.standConfiguration?.entryModelId;
      if (!entryModelId) {
        this.logger.error(
          `Stand ${stand.standNumber} sem entryModelId associado — não deu pra lançar a receita automaticamente. Reserva ${reservation.id}.`,
        );
        continue;
      }

      const revenue = await this.revenuesService.create({
        fairId: reservation.fairId,
        clientId: client.id,
        entryModelId,
        standNumber: stand.standNumber,
        baseValue: item.priceCents,
        discountCents: 0,
        contractValue: item.priceCents,
        paymentMethod,
        numberOfInstallments: 1,
        notes: `Reserva online via Mercado Pago — order ${reservation.mpOrderId}`,
        createdBy: 'checkout-mercado-pago',
      });

      const installment = revenue.installments?.[0];
      if (installment) {
        await this.revenuesService.confirmInstallmentPayment(
          installment.id,
          { paidAt: new Date() },
          reservation.fairId,
        );
      }

      await this.standRepository.update(stand.id, {
        heldUntil: null,
        heldByReservationId: null,
      });
    }
  }
}
