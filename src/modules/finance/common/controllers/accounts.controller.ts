import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccountsService } from '../services/accounts.service';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';

@ApiTags('Contas Bancárias')
@ApiBearerAuth('JWT-auth')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar conta bancária', description: 'Cadastra uma conta bancária para lançamento de despesas e receitas.' })
  @ApiBody({ type: CreateAccountDto })
  @ApiResponse({ status: 201, description: 'Conta criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.accountsService.create(createAccountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contas bancárias', description: 'Retorna todas as contas bancárias cadastradas.' })
  @ApiResponse({ status: 200, description: 'Lista de contas bancárias' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  findAll() {
    return this.accountsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar conta bancária por ID' })
  @ApiParam({ name: 'id', description: 'ID da conta bancária (UUID)' })
  @ApiResponse({ status: 200, description: 'Conta bancária encontrada' })
  @ApiResponse({ status: 404, description: 'Conta bancária não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar conta bancária' })
  @ApiParam({ name: 'id', description: 'ID da conta bancária (UUID)' })
  @ApiBody({ type: UpdateAccountDto })
  @ApiResponse({ status: 200, description: 'Conta bancária atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Conta bancária não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.accountsService.update(id, updateAccountDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover conta bancária' })
  @ApiParam({ name: 'id', description: 'ID da conta bancária (UUID)' })
  @ApiResponse({ status: 200, description: 'Conta bancária removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Conta bancária não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountsService.remove(id);
  }
}
