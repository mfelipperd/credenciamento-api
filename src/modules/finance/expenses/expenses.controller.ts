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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Controller('fairs')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post(':fairId/expenses')
  create(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    // Garantir que o fairId do DTO seja o mesmo da URL
    createExpenseDto.fairId = fairId;
    return this.expensesService.create(createExpenseDto);
  }

  @Get(':fairId/expenses')
  findAllByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.expensesService.findAllByFair(fairId);
  }

  @Get('expenses/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findOne(id);
  }

  @Patch('expenses/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Delete('expenses/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.remove(id);
  }

  // Endpoints de relatórios
  @Get(':fairId/expenses/total')
  getTotalByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.expensesService.getTotalByFair(fairId);
  }

  @Get(':fairId/expenses/total-by-category')
  getTotalByCategory(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.expensesService.getTotalByCategory(fairId);
  }

  @Get(':fairId/expenses/total-by-account')
  getTotalByAccount(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.expensesService.getTotalByAccount(fairId);
  }
}
