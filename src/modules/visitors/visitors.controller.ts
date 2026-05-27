import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Request,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { IsNotEmpty, IsUUID } from 'class-validator';

class EnrollInFairDto {
  @IsNotEmpty()
  @IsUUID()
  fairId: string;
}
import { Response } from 'express';
import { VisitorsService } from './visitors.service';
import { CreateVisitorInputDto } from './visitors.dto';
import { IsPublicRoute } from 'src/auth/public.route';
import { UpdateVisitorDto } from './update-visitor.dto';
import {
  PaginatedVisitorsDto,
  PaginatedResponse,
} from './dto/paginated-visitors.dto';
import { Visitor } from './entities/visitor.entity';
import { FrontendOriginGuard } from 'src/auth/frontend-origin.guard';

@Controller('visitors')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Get()
  // @UseGuards(FrontendOriginGuard)
  async getVisitors(
    @Req() req: Request,
    @Query() dto: PaginatedVisitorsDto,
  ): Promise<Visitor[] | PaginatedResponse<Visitor>> {
    // Se não tem fairId, retorna erro
    if (!dto.fairId) {
      throw new Error('fairId is required');
    }

    // Se tem qualquer parâmetro de busca/paginação enviado explicitamente, usa lógica paginada
    const hasSearchParams = dto.search && dto.search.trim().length > 0;
    const hasPaginationParams =
      dto.page !== undefined ||
      dto.limit !== undefined ||
      dto.sortBy !== undefined ||
      dto.sortOrder !== undefined;

    if (hasSearchParams || hasPaginationParams) {
      // Sempre retorna formato paginado completo quando parâmetros são enviados
      return await this.visitorsService.getVisitorsPaginated(req.user, dto);
    } else {
      // Sem parâmetros, usar lógica original (mais rápida) - retorna array simples
      return this.visitorsService.getVisitors(req.user, dto.fairId);
    }
  }

  @Get('stats')
  // @UseGuards(FrontendOriginGuard)
  async getVisitorsStats(
    @Req() req: Request,
    @Query('fairId') fairId?: string,
  ) {
    return await this.visitorsService.getVisitorsStats(req.user, fairId);
  }

  @Get('pdf/:fairId')
  async generateVisitorsPdf(
    @Param('fairId') fairId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    console.log(`[PDF] Iniciando geração de PDF para feira: ${fairId}`);

    try {
      const pdfBuffer = await this.visitorsService.generateVisitorsPdf(
        null,
        fairId,
      );

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="visitantes-feira-${fairId}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error('[PDF] Erro ao gerar PDF:', error);

      // Se for um erro de NotFoundException, retornar 404
      if (error instanceof NotFoundException) {
        res.status(404).json({
          message: error.message,
          error: 'Feira não encontrada',
        });
      } else {
        res.status(500).json({
          message: 'Erro ao gerar PDF',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }
  }

  @Post()
  @UseGuards(FrontendOriginGuard)
  @IsPublicRoute()
  createVisitor(@Body() visitor: CreateVisitorInputDto) {
    return this.visitorsService.createVisitor(visitor);
  }

  @Post('private')
  createVisitorPrivate(
    @Body() visitor: CreateVisitorInputDto,
    @Request() req: Request,
  ) {
    const userId = req.user.id || undefined;
    return this.visitorsService.createVisitor(visitor, userId?.toString());
  }

  /**
   * GET /visitors/lookup?q=TERMO
   *
   * Busca cross-feiras por nome, email ou CNPJ.
   * Rota pública — sem autenticação (usada no formulário de inscrição).
   * Retorna visitante + histórico de feiras + campos vazios.
   */
  @Get('lookup')
  @IsPublicRoute()
  async lookupVisitors(@Query('q') q: string) {
    return this.visitorsService.lookupVisitors(q ?? '');
  }

  /**
   * POST /visitors/:registrationCode/enroll
   * Body: { "fairId": "uuid-da-nova-feira" }
   *
   * Matricula visitante EXISTENTE em uma nova feira.
   * Não cria novo registro — apenas adiciona fair_visitor e envia email.
   * Rota pública — usada no formulário de inscrição quando o visitante já existe.
   */
  @Post(':registrationCode/enroll')
  @IsPublicRoute()
  @UseGuards(FrontendOriginGuard)
  async enrollInFair(
    @Param('registrationCode') registrationCode: string,
    @Body() dto: EnrollInFairDto,
  ) {
    return this.visitorsService.enrollInFair(registrationCode, dto.fairId);
  }

  @Get(':registrationCode')
  @UseGuards(FrontendOriginGuard)
  async getVisitorByRegistrationCode(
    @Param('registrationCode') registrationCode: string,
    @Query('fairId') fairId: string,
  ) {
    return await this.visitorsService.getVisitorByRegistrationCode(
      registrationCode,
      fairId,
    );
  }
  @Delete(':registrationCode')
  async deleteVisitor(@Param('registrationCode') registrationCode: string) {
    return await this.visitorsService.deleteVisitor(registrationCode);
  }

  @Patch(':registrationCode')
  async updateVisitor(
    @Param('registrationCode') registrationCode: string,
    @Body() updateVisitorDto: UpdateVisitorDto,
  ) {
    return await this.visitorsService.updateVisitor(
      registrationCode,
      updateVisitorDto,
    );
  }
}
