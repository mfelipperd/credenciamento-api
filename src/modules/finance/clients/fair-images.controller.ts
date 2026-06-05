import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
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
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IsPublicRoute } from '../../../auth/public.route';
import { ClientsService } from './clients.service';
import { ClientImageResponseDto, UploadClientImagesDto } from './clients.dto';

@ApiTags('Imagens da Feira')
@Controller('fairs')
export class FairImagesController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post(':fairId/images')
  @ApiOperation({
    summary: 'Upload de imagens para uma feira',
    description:
      'Envia até 10 imagens vinculadas a uma feira. O clientId é opcional — use quando a imagem for de um expositor específico.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiQuery({ name: 'clientId', required: false, description: 'ID do cliente (expositor) — opcional' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadClientImagesDto })
  @ApiResponse({ status: 201, description: 'Imagens enviadas com sucesso', type: [ClientImageResponseDto] })
  @ApiResponse({ status: 400, description: 'Nenhum arquivo enviado' })
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadImages(
    @Param('fairId') fairId: string,
    @Query('clientId') clientId: string | undefined,
    @UploadedFiles() files: any[],
    @Body('caption') caption?: string,
  ): Promise<ClientImageResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo de imagem foi enviado.');
    }

    const images = await this.clientsService.uploadImages(fairId, files, clientId, caption);
    return images.map(mapImageResponse);
  }

  @Get(':fairId/images')
  @IsPublicRoute()
  @ApiOperation({
    summary: 'Listar imagens da feira (público)',
    description: 'Retorna todas as imagens vinculadas à feira. Rota pública — usada no site e e-mails marketing.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de imagens', type: [ClientImageResponseDto] })
  async findImages(
    @Param('fairId') fairId: string,
  ): Promise<ClientImageResponseDto[]> {
    const images = await this.clientsService.findImagesByFair(fairId);
    return images.map(mapImageResponse);
  }

  @Post(':fairId/images/:imageId/link')
  @ApiOperation({
    summary: 'Vincular imagem a outra feira',
    description: 'Permite que uma imagem já cadastrada seja exibida nesta feira também.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira de destino' })
  @ApiParam({ name: 'imageId', description: 'ID da imagem' })
  @ApiResponse({ status: 201, description: 'Imagem vinculada com sucesso', type: ClientImageResponseDto })
  async linkImage(
    @Param('fairId') fairId: string,
    @Param('imageId') imageId: string,
  ): Promise<ClientImageResponseDto> {
    const image = await this.clientsService.linkImageToFair(imageId, fairId);
    return mapImageResponse(image);
  }

  @Delete(':fairId/images/:imageId')
  @ApiOperation({ summary: 'Deletar imagem' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiParam({ name: 'imageId', description: 'ID da imagem' })
  @ApiResponse({ status: 200, description: 'Imagem deletada com sucesso' })
  async deleteImage(@Param('imageId') imageId: string): Promise<{ message: string }> {
    await this.clientsService.deleteImage(imageId);
    return { message: 'Imagem deletada com sucesso.' };
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
