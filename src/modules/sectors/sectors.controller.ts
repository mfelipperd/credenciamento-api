import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
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

  @Get(':id')
  getSectorById(@Param('id') id: string) {
    return this.sectorsService.getSectorById(id);
  }

  @Put(':id')
  updateSector(
    @Param('id') id: string,
    @Body() data: Partial<CreateSectorDto>,
  ) {
    return this.sectorsService.updateSector(id, data);
  }

  @Delete(':id')
  deleteSector(@Param('id') id: string) {
    return this.sectorsService.deleteSector(id);
  }
}
