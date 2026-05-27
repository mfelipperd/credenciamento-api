import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OverheadExpensesService } from './overhead-expenses.service';
import {
  CreateOverheadExpenseDto,
  UpdateOverheadExpenseDto,
} from './dto/overhead-expense.dto';

@Controller('overhead-expenses')
export class OverheadExpensesController {
  private readonly logger = new Logger(OverheadExpensesController.name);

  constructor(
    private readonly overheadExpensesService: OverheadExpensesService,
  ) {}

  /**
   * GET /overhead-expenses/categories
   * Lista categorias globais (finance_categories com global: true).
   * Use esses IDs no campo categoryId ao criar despesas overhead.
   */
  @Get('categories')
  async findGlobalCategories() {
    return this.overheadExpensesService.findGlobalCategories();
  }

  /**
   * POST /overhead-expenses
   * Lança uma nova despesa overhead e define quais feiras a compartilham.
   */
  @Post()
  async create(@Body() dto: CreateOverheadExpenseDto) {
    return this.overheadExpensesService.create(dto);
  }

  /**
   * GET /overhead-expenses
   * Lista todas as despesas overhead com suas alocações por feira.
   */
  @Get()
  async findAll() {
    return this.overheadExpensesService.findAll();
  }

  /**
   * GET /overhead-expenses/:id
   * Retorna uma despesa overhead pelo ID.
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.overheadExpensesService.findOne(id);
  }

  /**
   * PATCH /overhead-expenses/:id
   * Atualiza despesa overhead. Se "fairs" for enviado, substitui as alocações.
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOverheadExpenseDto,
  ) {
    return this.overheadExpensesService.update(id, dto);
  }

  /**
   * DELETE /overhead-expenses/:id
   * Remove despesa overhead e todas as suas alocações (CASCADE).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.overheadExpensesService.remove(id);
  }
}
