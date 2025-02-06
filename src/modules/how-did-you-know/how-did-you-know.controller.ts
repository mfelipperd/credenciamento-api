import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CreateHowDidYouKnowDto } from './howDidYouKnow.dto';
import { HowDidYouKnowService } from './how-did-you-know.service';

@Controller('how-did-you-know')
export class HowDidYouKnowController {
  constructor(private readonly service: HowDidYouKnowService) {}

  @Post()
  create(@Body() data: CreateHowDidYouKnowDto) {
    return this.service.create(data);
  }

  @Get(':fairId')
  getAllByFair(@Param('fairId') fairId: string) {
    return this.service.getAllByFair(fairId);
  }
}
