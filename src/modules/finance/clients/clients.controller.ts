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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientsService } from './clients.service';
import { StorageService } from '../../storage/storage.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientResponseDto,
  CreateBrandDto,
  BrandResponseDto,
} from './clients.dto';

@ApiTags('Clientes')
@Controller('finance/clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo cliente' })
  @ApiResponse({
    status: 201,
    description: 'Cliente criado com sucesso',
    type: ClientResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(
    @Body() createClientDto: CreateClientDto,
  ): Promise<ClientResponseDto> {
    return await this.clientsService.create(createClientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os clientes' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nome' })
  @ApiQuery({ name: 'fairId', required: false, description: 'Filtrar por feira' })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes',
    type: [ClientResponseDto],
  })
  async findAll(
    @Query('search') search?: string,
    @Query('fairId') fairId?: string,
  ): Promise<ClientResponseDto[]> {
    if (search) {
      return await this.clientsService.searchByName(search, fairId);
    }
    return await this.clientsService.findAll(fairId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado',
    type: ClientResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async findOne(@Param('id') id: string): Promise<ClientResponseDto> {
    return await this.clientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente atualizado com sucesso',
    type: ClientResponseDto,
  })
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

  @Get('email/:email')
  @ApiOperation({ summary: 'Buscar cliente por email' })
  @ApiParam({ name: 'email', description: 'Email do cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado',
    type: ClientResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async findByEmail(
    @Param('email') email: string,
  ): Promise<ClientResponseDto | null> {
    return await this.clientsService.findByEmail(email);
  }

  @Get('cnpj/:cnpj')
  @ApiOperation({ summary: 'Buscar cliente por CNPJ' })
  @ApiParam({ name: 'cnpj', description: 'CNPJ do cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado',
    type: ClientResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async findByCnpj(
    @Param('cnpj') cnpj: string,
  ): Promise<ClientResponseDto | null> {
    return await this.clientsService.findByCnpj(cnpj);
  }

  @Post(':id/brands')
  @ApiOperation({ summary: 'Adicionar uma marca ao cliente' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiResponse({
    status: 201,
    description: 'Marca adicionada com sucesso',
    type: BrandResponseDto,
  })
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
}
