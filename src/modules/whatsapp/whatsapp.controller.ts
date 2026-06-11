import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { SendWhatsappCampaignDto } from './dto/send-whatsapp-campaign.dto';
import type { ZapiWebhookEvent } from './dto/zapi-webhook.dto';
import { IsPublicRoute } from 'src/auth/public.route';

@ApiTags('WhatsApp')
@ApiBearerAuth('JWT-auth')
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  @Get('instance/status')
  @ApiOperation({ summary: 'Status da instância WhatsApp', description: 'Retorna o status de conexão da instância Z-API (conectada, desconectada, aguardando QR Code).' })
  @ApiResponse({ status: 200, description: 'Status da instância Z-API' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getInstanceStatus() {
    return this.whatsappService.getInstanceStatus();
  }

  @Post('campaigns/send')
  @ApiOperation({
    summary: 'Enviar campanha de WhatsApp',
    description: 'Envia mensagens WhatsApp em massa para uma lista de visitantes da feira. Respeita delays entre envios para evitar bloqueio.',
  })
  @ApiBody({ type: SendWhatsappCampaignDto })
  @ApiResponse({ status: 201, description: 'Campanha iniciada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  sendCampaign(@Body() dto: SendWhatsappCampaignDto) {
    return this.whatsappService.sendCampaign(dto);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Listar campanhas de WhatsApp', description: 'Retorna o histórico de campanhas de WhatsApp enviadas.' })
  @ApiResponse({ status: 200, description: 'Lista de campanhas WhatsApp' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getCampaigns() {
    return this.whatsappService.getCampaigns();
  }

  @IsPublicRoute()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook Z-API (público)',
    description: 'Recebe eventos do Z-API (mensagens, status de entrega, conexão). Autenticado via header client-token com o WEBHOOK_SECRET configurado.',
  })
  @ApiHeader({ name: 'client-token', description: 'Token secreto de validação do webhook (WEBHOOK_SECRET)', required: true })
  @ApiBody({ schema: { type: 'object', description: 'Payload do evento Z-API' } })
  @ApiResponse({ status: 200, description: 'Evento processado com sucesso', schema: { example: { ok: true } } })
  @ApiResponse({ status: 401, description: 'Token inválido' })
  async receiveWebhook(
    @Headers('client-token') clientToken: string,
    @Body() event: ZapiWebhookEvent,
  ) {
    const expected = this.config.get<string>('WEBHOOK_SECRET');
    if (expected && clientToken !== expected) {
      throw new UnauthorizedException('Token inválido');
    }
    await this.whatsappService.handleWebhook(event);
    return { ok: true };
  }
}
