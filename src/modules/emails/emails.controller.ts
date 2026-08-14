import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EmailsService } from './emails.service';
import { SendMarketingEmailDto } from './dto/send-marketing-email.dto';
import { SendMarketingEmailV2Dto } from './dto/send-marketing-email-v2.dto';

@ApiTags('E-mails')
@ApiBearerAuth('JWT-auth')
@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Post('confirmation')
  @ApiOperation({ summary: 'Reenviar e-mail de confirmação', description: 'Envia o e-mail de confirmação de inscrição com QR code para o visitante.' })
  @ApiBody({
    schema: {
      required: ['visitorEmail', 'visitorName', 'registrationCode', 'fairId'],
      properties: {
        visitorEmail: { type: 'string', format: 'email' },
        visitorName: { type: 'string' },
        registrationCode: { type: 'string' },
        fairId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'E-mail enviado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async sendConfirmationEmail(
    @Body() body: { visitorEmail: string; visitorName: string; registrationCode: string; fairId: string },
  ) {
    const { visitorEmail, visitorName, registrationCode, fairId } = body;
    return this.emailsService.sendConfirmationEmail(visitorEmail, visitorName, registrationCode, fairId);
  }

  @Post('campaign')
  @ApiOperation({ summary: 'Enviar campanha de e-mail para lista de destinatários', description: 'Envia o mesmo template HTML para uma lista de e-mails.' })
  @ApiBody({
    schema: {
      required: ['subject', 'htmlTemplate', 'recipients'],
      properties: {
        subject: { type: 'string', example: 'Novidades da ExpoMultimix 2026' },
        htmlTemplate: { type: 'string', example: '<h1>Olá {{name}}</h1>' },
        recipients: {
          type: 'array',
          items: {
            type: 'object',
            properties: { email: { type: 'string' }, name: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'E-mails enviados', schema: { example: { success: true, sent: 45 } } })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async sendEmailCampaign(
    @Body() body: { subject: string; htmlTemplate: string; recipients: Array<{ email: string; name?: string }> },
  ) {
    const { subject, htmlTemplate, recipients } = body;
    await Promise.all(
      recipients.map((r) =>
        this.emailsService.sendTransactionalEmail(r.email, r.name ?? r.email, subject, htmlTemplate),
      ),
    );
    return { success: true, sent: recipients.length };
  }

  @Post('marketing/absent-visitors')
  @ApiOperation({
    summary: 'Enviar e-mail marketing para ausentes',
    description: 'Envia campanha de marketing apenas para visitantes inscritos que NÃO fizeram check-in na feira.',
  })
  @ApiBody({ type: SendMarketingEmailDto })
  @ApiResponse({ status: 201, description: 'Campanha enviada para visitantes ausentes' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async sendMarketingToAbsentVisitors(@Body() sendMarketingEmailDto: SendMarketingEmailDto) {
    const { subject, htmlContent, fairId } = sendMarketingEmailDto;
    return this.emailsService.sendMarketingEmailToAbsentVisitors(subject, htmlContent, fairId);
  }

  @Post('marketing/send')
  @ApiOperation({
    summary: 'Enviar campanha de marketing (v2)',
    description: 'Versão completa de envio de marketing com suporte a lista customizada de destinatários (all, checkedin, absent).',
  })
  @ApiBody({ type: SendMarketingEmailV2Dto })
  @ApiResponse({ status: 201, description: 'Campanha enviada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async sendMarketing(@Body() dto: SendMarketingEmailV2Dto) {
    return this.emailsService.sendMarketingEmail(
      dto.targetFairId, dto.templateFairId, dto.sendTo, dto.subject, dto.htmlContent, dto.title,
      dto.additionalFairIds ?? [],
    );
  }

  @Get('account-stats')
  @ApiOperation({ summary: 'Estatísticas da conta de e-mail (Brevo)', description: 'Retorna créditos, e-mails enviados e limites da conta Brevo.' })
  @ApiResponse({ status: 200, description: 'Estatísticas da conta' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getAccountStats() {
    return this.emailsService.getAccountStats();
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Listar campanhas de e-mail', description: 'Retorna o histórico de campanhas enviadas via Brevo.' })
  @ApiResponse({ status: 200, description: 'Lista de campanhas' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getCampaigns() {
    return this.emailsService.getCampaigns();
  }

  @Get('campaigns/:id/stats')
  @ApiOperation({ summary: 'Estatísticas de uma campanha', description: 'Retorna aberturas, cliques e bounces de uma campanha específica.' })
  @ApiParam({ name: 'id', description: 'ID da campanha no Brevo' })
  @ApiResponse({ status: 200, description: 'Estatísticas da campanha' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getCampaignStats(@Param('id') id: string) {
    return this.emailsService.getCampaignStats(id);
  }
}
