import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
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
import { ProspectingService } from './services/prospecting.service';
import {
  CreateProspectDto,
  ImportCnpjsDto,
  ProspectFiltersDto,
  UpdateProspectDto,
  UpdateStatusDto,
} from './dto/prospect.dto';
import { ProspectStatus, ProspectType } from './entities/prospect.entity';

@ApiTags('Prospecção de Leads')
@ApiBearerAuth('JWT-auth')
@Controller()
export class ProspectingController {
  private readonly logger = new Logger(ProspectingController.name);

  constructor(private readonly service: ProspectingService) {}

  // ─── CNPJ lookup avulso ────────────────────────────────────────────────────

  @Get('cnpj/:cnpj')
  @ApiOperation({
    summary: 'Consultar CNPJ na Receita Federal',
    description: 'Busca dados completos de um CNPJ via BrasilAPI (gratuito). Retorna razão social, CNAE, endereço, e-mail, setor B2B e se é prioridade para ExpoMultimix.',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ (apenas dígitos ou formatado)', example: '19131243000197' })
  @ApiResponse({
    status: 200,
    description: 'Dados do CNPJ enriquecidos com classificação de setor',
    schema: {
      example: {
        cnpj: '19131243000197',
        razao_social: 'EMPRESA EXEMPLO LTDA',
        nome_fantasia: 'Exemplo',
        situacao_cadastral: 'ATIVA',
        email: 'contato@exemplo.com.br',
        municipio: 'Manaus',
        uf: 'AM',
        cnae_fiscal: 6204000,
        cnae_fiscal_descricao: 'Consultoria em tecnologia da informação',
        cnpjFormatado: '19.131.243/0001-97',
        cnaeSector: 'TI e Software',
        isB2bPriority: true,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'CNPJ não encontrado na Receita Federal' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async lookupCnpj(@Param('cnpj') cnpj: string) {
    return this.service.lookupCnpj(cnpj);
  }

  // ─── Prospects por feira ───────────────────────────────────────────────────

  @Post('fairs/:fairId/prospects')
  @ApiOperation({
    summary: 'Cadastrar prospect manualmente',
    description: 'Cria um lead de prospecção vinculado a uma feira. Se CNPJ for informado, use o endpoint /enrich depois para enriquecer via Receita Federal.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiBody({ type: CreateProspectDto })
  @ApiResponse({ status: 201, description: 'Prospect criado com sucesso' })
  @ApiResponse({ status: 409, description: 'CNPJ já cadastrado para esta feira' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async create(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Body() dto: CreateProspectDto,
  ) {
    return this.service.create(fairId, dto);
  }

  @Post('fairs/:fairId/prospects/import-cnpjs')
  @ApiOperation({
    summary: 'Importar lista de CNPJs e enriquecer automaticamente',
    description: `Importa em lote uma lista de CNPJs, consulta cada um na Receita Federal via BrasilAPI e já classifica o setor CNAE.
**Atenção:** respeita o rate limit de 1 req/s da BrasilAPI — para 50 CNPJs leva ~50s.
CNPJs já cadastrados para a feira são ignorados.`,
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiBody({ type: ImportCnpjsDto })
  @ApiResponse({
    status: 201,
    description: 'Importação concluída',
    schema: { example: { imported: 45, skipped: 3, errors: ['12345678000199: não encontrado'] } },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async importCnpjs(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Body() dto: ImportCnpjsDto,
  ) {
    return this.service.importCnpjs(fairId, dto);
  }

  @Get('fairs/:fairId/prospects')
  @ApiOperation({
    summary: 'Listar prospects da feira',
    description: 'Retorna todos os prospects de uma feira com filtros opcionais por tipo, status, estado, setor CNAE e busca textual.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiQuery({ name: 'type', required: false, enum: ProspectType, description: 'EXPOSITOR = comprador de stand | VISITANTE = lojista' })
  @ApiQuery({ name: 'status', required: false, enum: ProspectStatus })
  @ApiQuery({ name: 'state', required: false, example: 'AM', description: 'UF (sigla)' })
  @ApiQuery({ name: 'sector', required: false, example: 'TI e Software', description: 'Setor CNAE' })
  @ApiQuery({ name: 'search', required: false, description: 'Busca por razão social, nome fantasia, e-mail ou CNPJ' })
  @ApiResponse({ status: 200, description: 'Lista de prospects' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async findAll(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Query() filters: ProspectFiltersDto,
  ) {
    return this.service.findAll(fairId, filters);
  }

  @Get('fairs/:fairId/prospects/analytics/geo')
  @ApiOperation({
    summary: 'Analytics geográfico — mapa de calor de onde vêm os lojistas',
    description: `Retorna distribuição geográfica dos prospects em múltiplos níveis:
- **byState**: contagem por UF com percentual — dados para choropleth do mapa do Brasil
- **byCity**: top 50 cidades com contagem — dados para treemap / mapa de marcadores
- **byNeighborhood**: top 100 bairros (endereço registrado da empresa no CNPJ) — ranking de densidade
- **bySectorPerState**: top 5 setores CNAE por estado — cruzamento para entender perfil por região
- **charts**: dados prontos para ApexCharts (bar de estados, treemap de cidades, bar horizontal de bairros)

> Os dados de bairro são preenchidos após o enriquecimento via BrasilAPI (\`POST /prospects/enrich-all\`).`,
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Dados geográficos para mapa',
    schema: {
      example: {
        summary: { totalProspects: 4120, withState: 4000, withCity: 3800, withNeighborhood: 2900, uniqueStates: 12, uniqueCities: 180, uniqueNeighborhoods: 420 },
        byState: [{ state: 'AM', count: 1800, percentage: 45.0 }, { state: 'SP', count: 600, percentage: 14.6 }],
        byCity: [{ city: 'Manaus', state: 'AM', count: 1200 }, { city: 'São Paulo', state: 'SP', count: 400 }],
        byNeighborhood: [{ neighborhood: 'Adrianópolis', city: 'Manaus', state: 'AM', count: 89 }],
        bySectorPerState: [{ state: 'AM', sectors: [{ sector: 'Comércio Varejista', count: 480 }] }],
        charts: {
          stateBar: { categories: ['AM', 'SP'], series: [{ name: 'Prospects', data: [1800, 600] }] },
          cityTreemap: [{ x: 'Manaus/AM', y: 1200 }],
          neighborhoodBar: { categories: ['Adrianópolis, Manaus'], series: [{ name: 'Lojas', data: [89] }] },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getGeoAnalytics(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.service.getGeoAnalytics(fairId);
  }

  @Get('fairs/:fairId/prospects/analytics')
  @ApiOperation({
    summary: 'Analytics completo de prospects da feira',
    description: `Retorna dados consolidados para os dashboards de audiência:
- **overview**: totais, taxa de conversão, contatos com e-mail/telefone
- **funnel**: distribuição por status (NOVO → CONVERTIDO)
- **sectorDistribution**: prospects agrupados por setor CNAE
- **geographicDistribution**: prospects por estado (UF)
- **topCnaes**: os 10 CNAEs mais frequentes
- **charts**: dados prontos para ApexCharts (donut, bar, horizontal bar)`,
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiResponse({ status: 200, description: 'Analytics completo com dados para gráficos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getAnalytics(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.service.getAnalytics(fairId);
  }

  @Get('fairs/:fairId/prospects/:id')
  @ApiOperation({ summary: 'Buscar prospect por ID' })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiParam({ name: 'id', description: 'ID do prospect (UUID)' })
  @ApiResponse({ status: 200, description: 'Prospect encontrado' })
  @ApiResponse({ status: 404, description: 'Prospect não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async findOne(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(id);
  }

  @Patch('fairs/:fairId/prospects/:id')
  @ApiOperation({ summary: 'Atualizar dados do prospect' })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiParam({ name: 'id', description: 'ID do prospect (UUID)' })
  @ApiBody({ type: UpdateProspectDto })
  @ApiResponse({ status: 200, description: 'Prospect atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Prospect não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async update(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProspectDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch('fairs/:fairId/prospects/:id/status')
  @ApiOperation({
    summary: 'Atualizar status do prospect no funil',
    description: 'Move o lead no funil. Ao mover para CONTATADO, registra lastContactAt. Ao mover para CONVERTIDO, registra convertedAt.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiParam({ name: 'id', description: 'ID do prospect (UUID)' })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Prospect não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async updateStatus(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.service.updateStatus(id, dto);
  }

  @Post('fairs/:fairId/prospects/:id/enrich')
  @ApiOperation({
    summary: 'Enriquecer prospect via CNPJ (BrasilAPI)',
    description: 'Consulta a Receita Federal e preenche automaticamente: razão social, nome fantasia, e-mail, telefone, cidade, UF, CNAE e setor B2B.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiParam({ name: 'id', description: 'ID do prospect (UUID)' })
  @ApiResponse({ status: 201, description: 'Prospect enriquecido com sucesso' })
  @ApiResponse({ status: 400, description: 'Prospect não possui CNPJ cadastrado' })
  @ApiResponse({ status: 404, description: 'Prospect não encontrado ou CNPJ não localizado na Receita Federal' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async enrich(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.enrichFromCnpj(id);
  }

  @Post('fairs/:fairId/prospects/enrich-all')
  @ApiOperation({
    summary: 'Enriquecer CNAE de todos os prospects pendentes da feira (background)',
    description: `Inicia em **background** o enriquecimento de todos os prospects da feira que têm CNPJ mas não têm CNAE.
Retorna **202 imediatamente** — não aguarda a conclusão.
Acompanhe o progresso via \`GET /fairs/:fairId/prospects/analytics\` (campo \`overview.enriched\`).
Para todas as feiras de uma vez use \`POST /prospects/enrich-all\`.`,
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiResponse({
    status: 202,
    description: 'Enriquecimento iniciado em background',
    schema: { example: { message: 'Enriquecimento iniciado em background...' } },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  enrichAll(@Param('fairId', ParseUUIDPipe) fairId: string) {
    const tag = `[enrich-fair-bg-${fairId.slice(0, 8)}]`;
    this.logger.log(`${tag} Starting per-fair CNAE enrichment in background`);

    this.service.enrichAllPending(fairId)
      .then((r) => this.logger.log(`${tag} Finished: ${JSON.stringify(r)}`))
      .catch((err) => this.logger.error(`${tag} Failed: ${err.message}`));

    return {
      message:
        'Enriquecimento da feira iniciado em background. ' +
        'Acompanhe via GET /fairs/' + fairId + '/prospects/analytics (campo overview.enriched).',
    };
  }

  @Post('prospects/geocode-all')
  @ApiOperation({
    summary: 'Geocodificar todos os prospects com CEP mas sem coordenadas (background)',
    description: `Para cada prospect que tem CEP mas não tem lat/lng, consulta a BrasilAPI (CEP v2) e salva as coordenadas.
Retorna **202 imediatamente** — roda em background.
Use após o bootstrap para habilitar o mapa de bairros com coordenadas reais.`,
  })
  @ApiResponse({
    status: 202,
    description: 'Geocodificação iniciada em background',
    schema: { example: { message: 'Geocodificação iniciada em background. Acompanhe nos logs do servidor.' } },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  geocodeAll() {
    this.logger.log('[geocode-all] Starting background geocoding of pending prospects');

    this.service.geocodeAllPending()
      .then((r) => this.logger.log(`[geocode-all] Done: ${JSON.stringify(r)}`))
      .catch((err) => this.logger.error(`[geocode-all] Failed: ${err.message}`));

    return {
      message: 'Geocodificação iniciada em background. Acompanhe nos logs do servidor.',
    };
  }

  @Post('prospects/enrich-all')
  @ApiOperation({
    summary: 'Enriquecer CNAE de TODOS os prospects (todas as feiras) — background',
    description: `Inicia em **background** o enriquecimento global de todos os prospects com CNPJ mas sem CNAE classificado.
**Deduplicação automática de CNPJs**: se o mesmo CNPJ aparece em 10 feiras diferentes, a BrasilAPI é consultada só 1 vez.
Ideal para rodar uma única vez após o backfill de visitantes com \`POST /visitors/sync-prospects/all\`.
Retorna **202 imediatamente** — não aguarda conclusão (pode levar horas para base grande).`,
  })
  @ApiResponse({
    status: 202,
    description: 'Enriquecimento global iniciado',
    schema: {
      example: {
        message: 'Enriquecimento global iniciado em background. Acompanhe os logs do servidor para o progresso.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  enrichAllGlobal() {
    return this.service.startGlobalEnrichBackground();
  }

  @Delete('fairs/:fairId/prospects/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover prospect' })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiParam({ name: 'id', description: 'ID do prospect (UUID)' })
  @ApiResponse({ status: 200, description: 'Prospect removido', schema: { example: { message: 'Prospect removido com sucesso' } } })
  @ApiResponse({ status: 404, description: 'Prospect não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async remove(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.remove(id);
    return { message: 'Prospect removido com sucesso' };
  }
}
