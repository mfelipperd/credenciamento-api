import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { CheckInsService } from './checkins.service';

@Controller('checkins')
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post()
  async registerCheckIn(
    @Body() body: { registrationCode?: string; fairId: string },
  ) {
    if (!body.registrationCode) {
      throw new BadRequestException('RegistrationCode is required');
    }
    if (!body.fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    return await this.checkInsService.registerCheckIn(
      body.registrationCode,
      body.fairId,
    );
  }
  @Get()
  async getCheckIns(@Query('fairId') fairId: string) {
    return await this.checkInsService.getCheckIns(fairId);
  }
}
