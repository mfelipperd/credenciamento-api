import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditReportService } from './audit-report.service';
import { TaxAnnex } from '../common/tax-calculator';

@ApiTags('Auditoria Financeira')
@ApiBearerAuth('JWT-auth')
@Controller('fairs/:fairId/audit-report')
export class AuditReportController {
  private readonly logger = new Logger(AuditReportController.name);

  constructor(private readonly auditReportService: AuditReportService) {}

  @Get('pdf')
  @ApiOperation({
    summary: 'Gerar PDF de auditoria financeira da feira',
    description:
      'Gera um PDF com receitas, despesas (diretas e rateadas), cálculo de impostos (Simples Nacional) e divisão de lucro entre sócios, item a item, para a feira selecionada.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiQuery({
    name: 'rbt12',
    required: false,
    type: Number,
    description: "RBT12 real da Oficina d'Ideias, em reais. Se omitido, usa a soma de receitas de todas as feiras do mesmo ano cadastradas.",
  })
  @ApiQuery({
    name: 'annex',
    required: false,
    enum: ['III', 'V'],
    description: 'Anexo do Simples validado contabilmente. Padrão: III.',
  })
  @ApiResponse({ status: 200, description: 'PDF gerado com sucesso', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Feira não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async generatePdf(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Query('rbt12') rbt12: string | undefined,
    @Query('annex') annex: string | undefined,
    @Res() res: Response,
  ) {
    const parsedRbt12 = rbt12 === undefined ? undefined : Number(rbt12);
    if (parsedRbt12 !== undefined && (!Number.isFinite(parsedRbt12) || parsedRbt12 <= 0)) {
      throw new BadRequestException('rbt12 deve ser um numero positivo em reais');
    }
    if (annex !== undefined && annex !== 'III' && annex !== 'V') {
      throw new BadRequestException('annex deve ser III ou V');
    }
    const validatedAnnex = (annex === 'III' || annex === 'V' ? annex : undefined) as TaxAnnex | undefined;

    try {
      const pdfBuffer = await this.auditReportService.generatePdf(fairId, {
        rbt12: parsedRbt12,
        annex: validatedAnnex,
      });
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="auditoria-financeira-${fairId}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message, error: 'Feira não encontrada' });
        return;
      }
      this.logger.error(`Erro ao gerar PDF de auditoria da feira ${fairId}: ${error.message}`, error.stack);
      res.status(500).json({
        message: 'Erro ao gerar PDF de auditoria',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
}
