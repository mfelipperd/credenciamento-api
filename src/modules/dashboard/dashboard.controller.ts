import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview() {
    return await this.dashboardService.getOverview();
  }

  @Get('absent-visitors')
  async getAbsentVisitors() {
    return await this.dashboardService.getAbsentVisitors();
  }

  @Get('top-frequent-visitors')
  async getTopFrequentVisitors() {
    return this.dashboardService.getTopFrequentVisitors();
  }
}
