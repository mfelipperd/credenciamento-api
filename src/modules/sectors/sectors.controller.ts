import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { SectorsService } from './sectors.service';
import { CreateSectorDto } from './sector.dto';

@Controller('sectors')
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  @Post()
  createSector(@Body() data: CreateSectorDto) {
    return this.sectorsService.createSector(data);
  }

  @Get(':fairId')
  getSectorsByFair(@Param('fairId') fairId: string) {
    return this.sectorsService.getSectorsByFair(fairId);
  }
}
