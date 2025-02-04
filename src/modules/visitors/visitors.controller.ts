import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { VisitorsService } from './visitors.service';
import { CreateVisitorInputDto } from './visitors.dto';
import { IsPublicRoute } from 'src/auth/public.route';

@Controller('visitors')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Get()
  getVisitors() {
    return this.visitorsService.getVisitors();
  }

  @Post()
  @IsPublicRoute()
  createVisitor(@Body() visitor: CreateVisitorInputDto) {
    return this.visitorsService.createVisitor(visitor);
  }

  @Post('private')
  createVisitorPrivate(
    @Body() visitor: CreateVisitorInputDto,
    @Request() req: Request,
  ) {
    const userId = req.user.id || undefined;
    return this.visitorsService.createVisitor(visitor, userId?.toString());
  }
}
