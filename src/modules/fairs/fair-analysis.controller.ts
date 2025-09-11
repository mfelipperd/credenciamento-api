import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FairAnalysisService } from './fair-analysis.service';
import { FairAnalysisDto } from './dto/fair-analysis.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EUserRole } from '../../enum/role';

@ApiTags('Fair Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fair-analysis')
export class FairAnalysisController {
  constructor(private readonly analysisService: FairAnalysisService) {}

  @Get('fair/:fairId')
  @ApiOperation({
    summary: 'Análise completa da feira',
    description: 'Retorna análise completa de margem de lucro e insights de negócio para uma feira',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Análise retornada com sucesso',
    type: FairAnalysisDto,
  })
  @ApiResponse({ status: 404, description: 'Feira não encontrada' })
  async analyzeFair(
    @Param('fairId', ParseUUIDPipe) fairId: string
  ): Promise<FairAnalysisDto> {
    return await this.analysisService.analyzeFair(fairId);
  }

  @Post('fair/:fairId/optimize-pricing')
  @ApiOperation({
    summary: 'Otimizar precificação',
    description: 'Calcula preços otimizados para atingir uma margem de lucro específica',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiQuery({ 
    name: 'targetMargin', 
    description: 'Margem de lucro desejada (%)', 
    required: false,
    example: 50
  })
  @ApiResponse({
    status: 200,
    description: 'Precificação otimizada calculada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Feira não encontrada' })
  async optimizePricing(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Query('targetMargin') targetMargin?: string
  ): Promise<any> {
    const margin = targetMargin ? parseFloat(targetMargin) : 50;
    return await this.analysisService.optimizePricing(fairId, margin);
  }

  @Get('fair/:fairId/insights')
  @ApiOperation({
    summary: 'Insights de negócio',
    description: 'Retorna apenas os insights de negócio para uma feira',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Insights retornados com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Feira não encontrada' })
  async getInsights(
    @Param('fairId', ParseUUIDPipe) fairId: string
  ): Promise<any> {
    const analysis = await this.analysisService.analyzeFair(fairId);
    return {
      fairId: analysis.fairId,
      insights: analysis.insights,
      recommendations: analysis.recommendations
    };
  }

  @Get('fair/:fairId/stand-efficiency')
  @ApiOperation({
    summary: 'Análise de eficiência dos stands',
    description: 'Retorna análise de eficiência e recomendação para cada tipo de stand',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Análise de eficiência retornada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Feira não encontrada' })
  async getStandEfficiency(
    @Param('fairId', ParseUUIDPipe) fairId: string
  ): Promise<any> {
    const analysis = await this.analysisService.analyzeFair(fairId);
    return {
      fairId: analysis.fairId,
      standConfigurations: analysis.standConfigurations,
      totalStands: analysis.totalStands,
      totalArea: analysis.totalArea,
      averageEfficiency: analysis.standConfigurations.reduce((sum, config) => sum + config.efficiency, 0) / analysis.standConfigurations.length
    };
  }

  @Get('fair/:fairId/profit-analysis')
  @ApiOperation({
    summary: 'Análise de lucratividade',
    description: 'Retorna análise detalhada de lucratividade da feira',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Análise de lucratividade retornada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Feira não encontrada' })
  async getProfitAnalysis(
    @Param('fairId', ParseUUIDPipe) fairId: string
  ): Promise<any> {
    const analysis = await this.analysisService.analyzeFair(fairId);
    return {
      fairId: analysis.fairId,
      totalRevenue: analysis.totalRevenue,
      totalCosts: analysis.totalCosts,
      totalProfit: analysis.totalProfit,
      profitMargin: analysis.profitMargin,
      averagePricePerSquareMeter: analysis.averagePricePerSquareMeter,
      averageSetupCostPerSquareMeter: analysis.averageSetupCostPerSquareMeter,
      profitPerSquareMeter: analysis.totalArea > 0 ? analysis.totalProfit / analysis.totalArea : 0
    };
  }
}
