import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ClientsService } from './clients.service';
import { StorageService } from '../../storage/storage.service';
import { IsPublicRoute } from '../../../auth/public.route';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientResponseDto,
  CreateBrandDto,
  BrandResponseDto,
  ClientImageResponseDto,
  UploadClientImagesDto,
} from './clients.dto';

@ApiTags('Clientes')
@ApiBearerAuth('JWT-auth')
@Controller('finance/clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly storageService: StorageService,
  ) {}

  // ----------------------------------------------------------------
  // Rotas estáticas de imagem — declaradas ANTES das rotas com :id
  // para que o Express não capture "images" como parâmetro.
  // ----------------------------------------------------------------

  @Get('images')
  @IsPublicRoute()
  @ApiOperation({
    summary: 'Listar todas as imagens de clientes (público)',
    description:
      'Retorna todas as imagens cadastradas. Filtre por feira com ?fairId=. Usado no site e e-mails marketing.',
  })
  @ApiQuery({ name: 'fairId', required: false, description: 'Filtrar por feira (opcional)' })
  @ApiResponse({ status: 200, description: 'Lista de imagens', type: [ClientImageResponseDto] })
  async findAllImages(
    @Query('fairId') fairId?: string,
  ): Promise<ClientImageResponseDto[]> {
    const images = await this.clientsService.findImages(fairId);
    return images.map(mapImageResponse);
  }

  @Post('images/:imageId/link-fair/:fairId')
  @ApiOperation({
    summary: 'Vincular imagem a outra feira',
    description: 'Permite que uma imagem já cadastrada seja exibida em outra feira.',
  })
  @ApiParam({ name: 'imageId', description: 'ID da imagem' })
  @ApiParam({ name: 'fairId', description: 'ID da feira a vincular' })
  @ApiResponse({ status: 201, description: 'Imagem vinculada com sucesso', type: ClientImageResponseDto })
  @ApiResponse({ status: 400, description: 'Imagem já vinculada a essa feira' })
  async linkImageToFair(
    @Param('imageId') imageId: string,
    @Param('fairId') fairId: string,
  ): Promise<ClientImageResponseDto> {
    const image = await this.clientsService.linkImageToFair(imageId, fairId);
    return mapImageResponse(image);
  }

  @Delete('images/:imageId')
  @ApiOperation({ summary: 'Deletar imagem do cliente' })
  @ApiParam({ name: 'imageId', description: 'ID da imagem' })
  @ApiResponse({ status: 200, description: 'Imagem deletada com sucesso' })
  @ApiResponse({ status: 404, description: 'Imagem não encontrada' })
  async deleteImage(@Param('imageId') imageId: string): Promise<{ message: string }> {
    await this.clientsService.deleteImage(imageId);
    return { message: 'Imagem deletada com sucesso.' };
  }

  // ----------------------------------------------------------------
  // Rotas de clientes
  // ----------------------------------------------------------------

  @Post()
  @ApiOperation({ summary: 'Criar um novo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso', type: ClientResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(@Body() createClientDto: CreateClientDto): Promise<ClientResponseDto> {
    return await this.clientsService.create(createClientDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os expositores',
    description:
      'Retorna todos os expositores independente da feira. Quando fairId é informado, adiciona o campo isParticipatingInFair indicando quais estão participando daquela feira específica.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nome' })
  @ApiQuery({
    name: 'fairId',
    required: false,
    description: 'Quando informado, adiciona isParticipatingInFair em cada expositor',
  })
  @ApiResponse({ status: 200, description: 'Lista de todos os expositores', type: [ClientResponseDto] })
  async findAll(
    @Query('search') search?: string,
    @Query('fairId') fairId?: string,
  ): Promise<ClientResponseDto[]> {
    if (search) {
      return await this.clientsService.searchByName(search, fairId);
    }
    return await this.clientsService.findAll(fairId);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Buscar cliente por email' })
  @ApiParam({ name: 'email', description: 'Email do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado', type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async findByEmail(@Param('email') email: string): Promise<ClientResponseDto | null> {
    return await this.clientsService.findByEmail(email);
  }

  @Get('cnpj/:cnpj')
  @ApiOperation({ summary: 'Buscar cliente por CNPJ' })
  @ApiParam({ name: 'cnpj', description: 'CNPJ do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado', type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async findByCnpj(@Param('cnpj') cnpj: string): Promise<ClientResponseDto | null> {
    return await this.clientsService.findByCnpj(cnpj);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado', type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async findOne(@Param('id') id: string): Promise<ClientResponseDto> {
    return await this.clientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente atualizado com sucesso', type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    return await this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover cliente' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({ status: 204, description: 'Cliente removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.clientsService.remove(id);
  }

  @Post(':id/brands')
  @ApiOperation({ summary: 'Adicionar uma marca ao cliente' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiResponse({ status: 201, description: 'Marca adicionada com sucesso', type: BrandResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou arquivo ausente' })
  async addBrand(
    @Param('id') id: string,
    @Body() body: CreateBrandDto,
    @UploadedFile() file: any,
  ): Promise<BrandResponseDto> {
    if (!file) {
      throw new BadRequestException('O arquivo de logotipo (logo) é obrigatório.');
    }
    if (!body.name) {
      throw new BadRequestException('O nome da marca é obrigatório.');
    }

    const logoUrl = await this.storageService.uploadFile(file, 'brands');
    return await this.clientsService.addBrand(id, body.name, logoUrl);
  }

  @Post(':id/images')
  @ApiOperation({
    summary: 'Upload de imagens do cliente (a partir de uma feira)',
    description: 'Envia até 10 imagens de um cliente vinculadas a uma feira.',
  })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira de origem do upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadClientImagesDto })
  @ApiResponse({ status: 201, description: 'Imagens enviadas com sucesso', type: [ClientImageResponseDto] })
  @ApiResponse({ status: 400, description: 'Nenhum arquivo enviado ou fairId ausente' })
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadImages(
    @Param('id') clientId: string,
    @Query('fairId') fairId: string,
    @UploadedFiles() files: any[],
    @Body('caption') caption?: string,
  ): Promise<ClientImageResponseDto[]> {
    if (!fairId) {
      throw new BadRequestException('O parâmetro fairId é obrigatório.');
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo de imagem foi enviado.');
    }

    const images = await this.clientsService.uploadImages(fairId, files, clientId, caption);
    return images.map(mapImageResponse);
  }

  @Get(':id/images')
  @ApiOperation({
    summary: 'Listar imagens do cliente',
    description: 'Retorna todas as imagens do cliente. Filtre por feira com fairId.',
  })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiQuery({ name: 'fairId', required: false, description: 'Filtrar por feira' })
  @ApiResponse({ status: 200, description: 'Lista de imagens', type: [ClientImageResponseDto] })
  async findClientImages(
    @Param('id') clientId: string,
    @Query('fairId') fairId?: string,
  ): Promise<ClientImageResponseDto[]> {
    const images = await this.clientsService.findImagesByClient(clientId, fairId);
    return images.map(mapImageResponse);
  }
}

function mapImageResponse(image: any): ClientImageResponseDto {
  return {
    id: image.id,
    clientId: image.clientId,
    registeredFairId: image.registeredFairId,
    url: image.url,
    caption: image.caption,
    fairs: (image.imageFairs ?? []).map((f: any) => ({
      id: f.id,
      fairId: f.fairId,
      createdAt: f.createdAt,
    })),
    createdAt: image.createdAt,
  };
}
