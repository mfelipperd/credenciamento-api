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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { Response } from 'express';
import { VisitorsService } from './visitors.service';
import { CreateVisitorInputDto } from './visitors.dto';
import { IsPublicRoute } from 'src/auth/public.route';
import { UpdateVisitorDto } from './update-visitor.dto';
import { PaginatedVisitorsDto, PaginatedResponse } from './dto/paginated-visitors.dto';
import { Visitor } from './entities/visitor.entity';
import { FrontendOriginGuard } from 'src/auth/frontend-origin.guard';

class EnrollInFairDto {
  @IsNotEmpty()
  @IsUUID()
  fairId: string;
}

@ApiTags('Visitantes')
@ApiBearerAuth('JWT-auth')
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar visitantes da feira',
    description:
      'Sem parâmetros de busca/paginação retorna array simples. Com page/limit/search/sortBy retorna resposta paginada com meta.',
  })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (max: 100, default: 50)' })
  @ApiQuery({ name: 'search', required: false, description: 'Busca por nome, email, empresa, telefone ou código' })
  @ApiQuery({ name: 'searchField', required: false, enum: ['all', 'name', 'email', 'company', 'phone', 'registrationCode'], description: 'Campo específico de busca (default: all)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'email', 'company', 'registrationDate', 'registrationCode'], description: 'Ordenar por (default: name)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Direção da ordenação (default: asc)' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filtro de data inicial (YYYY-MM-DD) — filtra por registrationDate' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filtro de data final (YYYY-MM-DD) — inclui o dia inteiro' })
  @ApiResponse({ status: 200, description: 'Lista simples (sem paginação) ou resposta paginada com meta' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getVisitors(
    @Req() req: Request,
    @Query() dto: PaginatedVisitorsDto,
  ): Promise<Visitor[] | PaginatedResponse<Visitor>> {
    if (!dto.fairId) throw new Error('fairId is required');

    const hasSearchParams = dto.search && dto.search.trim().length > 0;
    const hasPaginationParams =
      dto.page !== undefined ||
      dto.limit !== undefined ||
      dto.sortBy !== undefined ||
      dto.sortOrder !== undefined;

    if (hasSearchParams || hasPaginationParams) {
      return await this.visitorsService.getVisitorsPaginated(req.user, dto);
    }
    return this.visitorsService.getVisitors(req.user, dto.fairId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas de visitantes', description: 'Total, visitantes recentes (7 dias) e empresas únicas.' })
  @ApiQuery({ name: 'fairId', required: false, description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de visitantes',
    schema: {
      example: { total: 320, recent: 45, companies: 87, recentPercentage: 14 },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getVisitorsStats(@Req() req: Request, @Query('fairId') fairId?: string) {
    return await this.visitorsService.getVisitorsStats(req.user, fairId);
  }

  @Get('lookup')
  @IsPublicRoute()
  @ApiOperation({
    summary: 'Busca cross-feiras de visitante (público)',
    description:
      'Busca visitante por nome, telefone, CNPJ ou email em TODAS as feiras. Requer ao menos 2 parâmetros. Retorna dados + histórico de feiras + campos faltantes para pré-preenchimento do formulário.',
  })
  @ApiQuery({ name: 'name', required: false, description: 'Nome parcial' })
  @ApiQuery({ name: 'phone', required: false, description: 'Telefone (aceita formatado ou só dígitos)' })
  @ApiQuery({ name: 'cnpj', required: false, description: 'CNPJ (aceita formatado ou só dígitos)' })
  @ApiQuery({ name: 'email', required: false, description: 'Email parcial' })
  @ApiResponse({
    status: 200,
    description: 'Array de visitantes encontrados com histórico e campos faltantes',
    schema: {
      example: [{
        registrationCode: 'abc-123',
        name: 'Maria Souza',
        company: 'Empresa XYZ',
        email: 'maria@xyz.com',
        cnpj: '12.345.678/0001-90',
        phone: '(92) 99999-0000',
        zipCode: '69000000',
        missingFields: ['street', 'city'],
        fairHistory: [{ fairId: 'uuid', fairName: 'ExpoMultimix 2025', state: 'AM', startDate: '2025-09-01' }],
      }],
    },
  })
  async lookupVisitors(
    @Query('name') name?: string,
    @Query('phone') phone?: string,
    @Query('cnpj') cnpj?: string,
    @Query('email') email?: string,
  ) {
    return this.visitorsService.lookupVisitors({ name, phone, cnpj, email });
  }

  @Get('pdf/:fairId')
  @ApiOperation({ summary: 'Gerar PDF da lista de visitantes', description: 'Retorna um arquivo PDF com todos os visitantes da feira.' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'PDF gerado com sucesso', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Feira não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async generateVisitorsPdf(
    @Param('fairId') fairId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const pdfBuffer = await this.visitorsService.generateVisitorsPdf(null, fairId);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="visitantes-feira-${fairId}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message, error: 'Feira não encontrada' });
      } else {
        res.status(500).json({ message: 'Erro ao gerar PDF', error: error instanceof Error ? error.message : 'Erro desconhecido' });
      }
    }
  }

  @Get(':registrationCode')
  @UseGuards(FrontendOriginGuard)
  @ApiOperation({ summary: 'Buscar visitante por código de registro', description: 'Retorna os dados do visitante para a feira informada.' })
  @ApiParam({ name: 'registrationCode', description: 'Código de registro do visitante' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Visitante encontrado' })
  @ApiResponse({ status: 404, description: 'Visitante não encontrado para esta feira' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getVisitorByRegistrationCode(
    @Param('registrationCode') registrationCode: string,
    @Query('fairId') fairId: string,
  ) {
    return await this.visitorsService.getVisitorByRegistrationCode(registrationCode, fairId);
  }

  @Post()
  @UseGuards(FrontendOriginGuard)
  @IsPublicRoute()
  @ApiOperation({ summary: 'Inscrever visitante (público)', description: 'Cria um novo visitante e envia e-mail de confirmação com QR code.' })
  @ApiBody({ type: CreateVisitorInputDto })
  @ApiResponse({ status: 201, description: 'Visitante inscrito com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  createVisitor(@Body() visitor: CreateVisitorInputDto) {
    return this.visitorsService.createVisitor(visitor);
  }

  @Post('private')
  @ApiOperation({ summary: 'Inscrever visitante (autenticado)', description: 'Cria visitante vinculando ao usuário operador logado.' })
  @ApiBody({ type: CreateVisitorInputDto })
  @ApiResponse({ status: 201, description: 'Visitante inscrito com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  createVisitorPrivate(@Body() visitor: CreateVisitorInputDto, @Request() req: Request) {
    const userId = req.user.id || undefined;
    return this.visitorsService.createVisitor(visitor, userId?.toString());
  }

  @Post(':registrationCode/enroll')
  @IsPublicRoute()
  @UseGuards(FrontendOriginGuard)
  @ApiOperation({
    summary: 'Matricular visitante existente em nova feira (público)',
    description: 'Vincula um visitante já cadastrado a uma nova feira sem criar novo registro. Dispara e-mail de confirmação.',
  })
  @ApiParam({ name: 'registrationCode', description: 'Código de registro do visitante' })
  @ApiBody({ schema: { example: { fairId: 'uuid-da-feira' } } })
  @ApiResponse({ status: 201, description: 'Visitante matriculado com sucesso' })
  @ApiResponse({ status: 404, description: 'Visitante ou feira não encontrado' })
  async enrollInFair(
    @Param('registrationCode') registrationCode: string,
    @Body() dto: EnrollInFairDto,
  ) {
    return this.visitorsService.enrollInFair(registrationCode, dto.fairId);
  }

  @Patch(':registrationCode')
  @ApiOperation({ summary: 'Atualizar visitante' })
  @ApiParam({ name: 'registrationCode', description: 'Código de registro do visitante' })
  @ApiBody({ type: UpdateVisitorDto })
  @ApiResponse({ status: 200, description: 'Visitante atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Visitante não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async updateVisitor(
    @Param('registrationCode') registrationCode: string,
    @Body() updateVisitorDto: UpdateVisitorDto,
  ) {
    return await this.visitorsService.updateVisitor(registrationCode, updateVisitorDto);
  }

  @Delete(':registrationCode')
  @ApiOperation({ summary: 'Remover visitante' })
  @ApiParam({ name: 'registrationCode', description: 'Código de registro do visitante' })
  @ApiResponse({ status: 200, description: 'Visitante removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Visitante não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async deleteVisitor(@Param('registrationCode') registrationCode: string) {
    return await this.visitorsService.deleteVisitor(registrationCode);
  }
}
