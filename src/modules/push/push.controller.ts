import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PushService } from './push.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { SendPushDto } from './dto/send-push.dto';
import { IsPublicRoute } from 'src/auth/public.route';

@ApiTags('Push')
@ApiBearerAuth('JWT-auth')
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @IsPublicRoute()
  @Post('subscribe')
  @ApiOperation({
    summary: 'Registrar subscription de push (público)',
    description:
      'Salva a Web Push subscription (endpoint + chaves) do navegador de um visitante anônimo do site público. Sem autenticação.',
  })
  @ApiBody({ type: SubscribePushDto })
  @ApiResponse({
    status: 201,
    description: 'Subscription registrada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Subscription ausente ou inválida' })
  async subscribe(@Body() dto: SubscribePushDto) {
    await this.pushService.subscribe(dto);
    return { success: true };
  }

  @Post('send')
  @ApiOperation({
    summary: 'Disparar notificação push',
    description:
      'Envia uma notificação push para todos os navegadores inscritos, via Web Push (VAPID) — sem dependência de nenhum provedor terceiro.',
  })
  @ApiBody({ type: SendPushDto })
  @ApiResponse({
    status: 201,
    description: 'Notificação enviada',
    schema: { example: { sent: 812, failed: 3 } },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async send(@Body() dto: SendPushDto) {
    return this.pushService.send(dto.title, dto.body, dto.url);
  }
}
