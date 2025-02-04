import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview(@Query('fairId') fairId: string) {
    return this.dashboardService.getOverview(fairId);
  }

  @Get('absent-visitors')
  async getAbsentVisitors(@Query('fairId') fairId: string) {
    return await this.dashboardService.getAbsentVisitors(fairId);
  }

  @Get('top-frequent-visitors')
  async getTopFrequentVisitors(@Query('fairId') fairId: string) {
    return this.dashboardService.getTopFrequentVisitors(fairId);
  }

  @Get('checkins/today')
  async getCheckinsToday(@Query('fairId') fairId: string) {
    return await this.dashboardService.getCheckinsToday(fairId);
  }
  @Get('visitors/count')
  async getTotalVisitors(@Query('fairId') fairId: string) {
    return await this.dashboardService.getTotalVisitors(fairId);
  }

  @Get('visitors/checked-in')
  async getCheckedInVisitors(@Query('fairId') fairId: string) {
    return this.dashboardService.getCheckedInVisitors(fairId);
  }

  @Get('visitors/category')
  async getVisitorsByCategory(@Query('fairId') fairId: string) {
    return this.dashboardService.getVisitorsByCategory(fairId);
  }

  @Get('visitors/origin')
  async getVisitorsByOrigin(@Query('fairId') fairId: string) {
    return this.dashboardService.getVisitorsByOrigin(fairId);
  }

  @Get('visitors/sectors')
  async getVisitorsBySectors(@Query('fairId') fairId: string) {
    return await this.dashboardService.getVisitorsBySectors(fairId);
  }
}
