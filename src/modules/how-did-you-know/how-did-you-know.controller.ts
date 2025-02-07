import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
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
  @Get(':id')
  getHowDidYouKnowById(@Param('id') id: string) {
    return this.service.getHowDidYouKnowById(id);
  }

  @Put(':id')
  updateHowDidYouKnow(
    @Param('id') id: string,
    @Body() data: Partial<CreateHowDidYouKnowDto>,
  ) {
    return this.service.updateHowDidYouKnow(id, data);
  }

  @Delete(':id')
  deleteHowDidYouKnow(@Param('id') id: string) {
    return this.service.deleteHowDidYouKnow(id);
  }
}
