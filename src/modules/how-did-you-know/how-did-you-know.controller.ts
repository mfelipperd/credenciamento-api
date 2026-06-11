import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateHowDidYouKnowDto } from './howDidYouKnow.dto';
import { HowDidYouKnowService } from './how-did-you-know.service';

@ApiTags('Como Ficou Sabendo')
@ApiBearerAuth('JWT-auth')
@Controller('how-did-you-know')
export class HowDidYouKnowController {
  constructor(private readonly service: HowDidYouKnowService) {}

  @Post()
  @ApiOperation({ summary: 'Criar opção "Como ficou sabendo"', description: 'Cria uma nova opção de canal de aquisição para o formulário de inscrição.' })
  @ApiBody({ type: CreateHowDidYouKnowDto })
  @ApiResponse({ status: 201, description: 'Opção criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  create(@Body() data: CreateHowDidYouKnowDto) {
    return this.service.create(data);
  }

  @Get(':fairId')
  @ApiOperation({ summary: 'Listar opções por feira', description: 'Retorna todas as opções "Como ficou sabendo" de uma feira específica.' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de opções da feira' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getAllByFair(@Param('fairId') fairId: string) {
    return this.service.getAllByFair(fairId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar opção "Como ficou sabendo"' })
  @ApiParam({ name: 'id', description: 'ID da opção' })
  @ApiResponse({ status: 200, description: 'Opção atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Opção não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  updateHowDidYouKnow(
    @Param('id') id: string,
    @Body() data: Partial<CreateHowDidYouKnowDto>,
  ) {
    return this.service.updateHowDidYouKnow(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover opção "Como ficou sabendo"' })
  @ApiParam({ name: 'id', description: 'ID da opção' })
  @ApiResponse({ status: 200, description: 'Opção removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Opção não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  deleteHowDidYouKnow(@Param('id') id: string) {
    return this.service.deleteHowDidYouKnow(id);
  }
}
