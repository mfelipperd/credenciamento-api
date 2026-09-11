import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsPublicRoute } from '../../auth/public.route';
import { StandReservationsService } from './stand-reservations.service';
import { CreateStandReservationDto } from './stand-reservations.dto';
import { MercadoPagoService } from './mercado-pago.service';

class MercadoPagoWebhookDto {
  type: string;
  data: { id: string };
}

@ApiTags('stand-reservations')
@Controller()
export class StandReservationsController {
  constructor(
    private readonly reservationsService: StandReservationsService,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  @Post('public/stand-reservations')
  @IsPublicRoute()
  @ApiOperation({
    summary: 'Iniciar reserva de stand(s) com pagamento online',
    description:
      'Cria a reserva, segura os stands escolhidos por 15 minutos e cria a order no Mercado Pago (Pix devolve o QR Code pra mostrar na hora; cartão exige o token já tokenizado pelo SDK JS do Mercado Pago no front).',
  })
  @ApiBody({ type: CreateStandReservationDto })
  @ApiResponse({ status: 201, description: 'Order criada' })
  @ApiResponse({ status: 400, description: 'Stand indisponível ou sem tipo configurado' })
  async createCheckout(@Body() dto: CreateStandReservationDto) {
    return this.reservationsService.createCheckout(dto);
  }

  @Post('webhooks/mercado-pago')
  @IsPublicRoute()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook de confirmação de pagamento do Mercado Pago',
    description:
      'Valida a assinatura (x-signature) antes de processar, e ainda assim confirma o status direto na API (GET /v1/orders/:id) antes de liberar o stand.',
  })
  async handleWebhook(
    @Body() body: MercadoPagoWebhookDto,
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
  ) {
    const dataId = body?.data?.id;
    if (!xSignature || !xRequestId || !dataId) {
      throw new ForbiddenException('Webhook inválido');
    }

    const isValid = this.mercadoPagoService.validateWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
    });
    if (!isValid) {
      throw new ForbiddenException('Assinatura do webhook inválida');
    }

    await this.reservationsService.confirmPaymentFromWebhook(dataId);
    return { received: true };
  }
}
