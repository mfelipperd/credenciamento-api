import { Body, Controller, Get, Post } from '@nestjs/common';
import { FairsService } from './fairs.service';
import { CreateInputFairDto } from './fair.dto';

@Controller('fairs')
export class FairsController {
  constructor(private readonly fairService: FairsService) {}

  @Get()
  getFairs() {
    return this.fairService.getFairs();
  }

  @Post()
  createFair(@Body() fair: CreateInputFairDto) {
    return this.fairService.createFair(fair);
  }
}
