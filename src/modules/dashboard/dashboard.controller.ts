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

  @Get('checkins/today')
  async getCheckInsToday() {
    return await this.dashboardService.getCheckInsToday();
  }
  @Get('visitors/count')
  async getTotalVisitors() {
    return await this.dashboardService.getTotalVisitors();
  }
  @Get('visitors/checked-in')
  async getCheckedInVisitors() {
    return await this.dashboardService.getCheckedInVisitors();
  }

  @Get('visitors/category')
  async getVisitorsByCategory() {
    return await this.dashboardService.getVisitorsByCategory();
  }

  @Get('visitors/origin')
  async getVisitorsByOrigin() {
    return await this.dashboardService.getVisitorsByOrigin();
  }

  @Get('visitors/sectors')
  async getVisitorsBySector() {
    return await this.dashboardService.getVisitorsBySector();
  }
}
