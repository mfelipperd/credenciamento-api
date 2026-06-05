import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
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
import { IsPublicRoute } from 'src/auth/public.route';
import { BrandResponseDto, UpdateBrandDto } from './clients.dto';

@ApiTags('Marcas da Feira')
@Controller('finance/brands')
export class BrandsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @IsPublicRoute()
  @ApiOperation({ summary: 'Obter todas as marcas de uma feira (Público - para o site)' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira para listar as marcas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas as marcas da feira',
    type: [BrandResponseDto],
  })
  @ApiResponse({ status: 400, description: 'ID da feira é obrigatório' })
  async findBrandsByFair(
    @Query('fairId') fairId: string,
  ): Promise<BrandResponseDto[]> {
    if (!fairId) {
      throw new BadRequestException('O parâmetro fairId é obrigatório.');
    }
    return await this.clientsService.findBrandsByFair(fairId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar uma marca existente' })
  @ApiParam({ name: 'id', description: 'ID da marca' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiResponse({
    status: 200,
    description: 'Marca atualizada com sucesso',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Marca não encontrada' })
  async updateBrand(
    @Param('id') id: string,
    @Body() body: UpdateBrandDto,
    @UploadedFile() file?: any,
  ): Promise<BrandResponseDto> {
    let logoUrl: string | undefined;

    if (file) {
      logoUrl = await this.storageService.uploadFile(file, 'brands');
    }

    return await this.clientsService.updateBrand(id, body.name, logoUrl);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma marca existente' })
  @ApiParam({ name: 'id', description: 'ID da marca' })
  @ApiResponse({ status: 204, description: 'Marca removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Marca não encontrada' })
  async removeBrand(@Param('id') id: string): Promise<void> {
    await this.clientsService.deleteBrand(id);
  }
}
