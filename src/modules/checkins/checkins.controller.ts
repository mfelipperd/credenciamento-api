import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { CheckInsService } from './checkins.service';

@Controller('checkins')
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post()
  async registerCheckIn(
    @Body() body: { visitorId?: number; registrationCode?: string },
  ) {
    if (!body.visitorId && !body.registrationCode) {
      throw new BadRequestException(
        'Either visitorId or registrationCode is required',
      );
    }

    return await this.checkInsService.registerCheckIn(
      body.visitorId,
      body.registrationCode,
    );
  }
}
