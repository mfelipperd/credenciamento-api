import { Body, Controller, Get, Post } from '@nestjs/common';
import { VisitorsService } from './visitors.service';
import { CreateVisitorInputDto } from './visitors.dto';

@Controller('visitors')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Get()
  getVisitors() {
    return this.visitorsService.getVisitors();
  }

  @Post()
  createVisitor(@Body() visitor: CreateVisitorInputDto) {
    return this.visitorsService.createVisitor(visitor);
  }
}
