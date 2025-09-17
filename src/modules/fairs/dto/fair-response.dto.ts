import { ApiProperty } from '@nestjs/swagger';
import { Fair } from '../entity/fair.entity';
import { StandConfigurationResponseDto } from './stand-configuration-response.dto';

export class FairResponseDto {
  @ApiProperty({ description: 'ID único da feira' })
  id: string;

  @ApiProperty({ description: 'Nome da feira' })
  name: string;

  @ApiProperty({ description: 'Localização da feira' })
  location: string;

  @ApiProperty({ description: 'URL do Google Maps do local', required: false })
  googleMapsUrl?: string;

  @ApiProperty({ description: 'Endereço completo', required: false })
  address?: string;

  @ApiProperty({ description: 'Cidade', required: false })
  city?: string;

  @ApiProperty({ description: 'Estado', required: false })
  state?: string;

  @ApiProperty({ description: 'CEP', required: false })
  zipCode?: string;

  @ApiProperty({ description: 'País', required: false })
  country?: string;

  @ApiProperty({ description: 'Data de início da feira', required: false })
  startDate?: Date;

  @ApiProperty({ description: 'Data de fim da feira', required: false })
  endDate?: Date;

  @ApiProperty({ description: 'Horário de início (HH:mm)', required: false })
  startTime?: string;

  @ApiProperty({ description: 'Horário de fim (HH:mm)', required: false })
  endTime?: string;

  @ApiProperty({ description: 'Data e hora de início', required: false })
  startDateTime?: Date;

  @ApiProperty({ description: 'Data e hora de fim', required: false })
  endDateTime?: Date;

  @ApiProperty({ description: 'Total de stands' })
  totalStands: number;

  @ApiProperty({ description: 'Custo por metro quadrado' })
  costPerSquareMeter: number;

  @ApiProperty({ description: 'Custo de montagem por metro quadrado' })
  setupCostPerSquareMeter: number;

  @ApiProperty({ description: 'Receita esperada' })
  expectedRevenue: number;

  @ApiProperty({ description: 'Lucro esperado' })
  expectedProfit: number;

  @ApiProperty({ description: 'Margem de lucro esperada (%)' })
  expectedProfitMargin: number;

  @ApiProperty({ description: 'Insights de negócio', required: false })
  insights?: string;

  @ApiProperty({ description: 'Se a feira está ativa' })
  isActive: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Configurações de stands', 
    type: [StandConfigurationResponseDto],
    required: false 
  })
  standConfigurations?: StandConfigurationResponseDto[];

  // Dados financeiros
  @ApiProperty({ description: 'Total de receitas da feira', type: Number, required: false })
  totalRevenue?: number;

  @ApiProperty({ description: 'Total de despesas da feira', type: Number, required: false })
  totalExpenses?: number;

  @ApiProperty({ description: 'Saldo líquido da feira (receitas - despesas)', type: Number, required: false })
  netBalance?: number;

  @ApiProperty({ description: 'Margem de lucro da feira em porcentagem', type: Number, required: false })
  profitMargin?: number;

  @ApiProperty({ description: 'Número total de receitas cadastradas', type: Number, required: false })
  totalRevenues?: number;

  @ApiProperty({ description: 'Número total de despesas cadastradas', type: Number, required: false })
  totalExpensesCount?: number;

  constructor(fair: Fair) {
    this.id = fair.id;
    this.name = fair.name;
    this.location = fair.location;
    this.googleMapsUrl = fair.googleMapsUrl;
    this.address = fair.address;
    this.city = fair.city;
    this.state = fair.state;
    this.zipCode = fair.zipCode;
    this.country = fair.country;
    this.startDate = fair.startDate;
    this.endDate = fair.endDate;
    this.startTime = fair.startTime;
    this.endTime = fair.endTime;
    this.startDateTime = fair.startDateTime;
    this.endDateTime = fair.endDateTime;
    this.totalStands = fair.totalStands;
    this.costPerSquareMeter = fair.costPerSquareMeter;
    this.setupCostPerSquareMeter = fair.setupCostPerSquareMeter;
    this.expectedRevenue = fair.expectedRevenue;
    this.expectedProfit = fair.expectedProfit;
    this.expectedProfitMargin = fair.expectedProfitMargin;
    this.insights = fair.insights;
    this.isActive = fair.isActive;
    this.createdAt = fair.createdAt;

    // Dados financeiros (serão preenchidos pelo service)
    this.totalRevenue = (fair as any).totalRevenue || 0;
    this.totalExpenses = (fair as any).totalExpenses || 0;
    this.netBalance = (fair as any).netBalance || 0;
    this.profitMargin = (fair as any).profitMargin || 0;
    this.totalRevenues = (fair as any).totalRevenues || 0;
    this.totalExpensesCount = (fair as any).totalExpensesCount || 0;
    
    if (fair.standConfigurations) {
      this.standConfigurations = fair.standConfigurations.map(config => {
        const dto = new StandConfigurationResponseDto();
        dto.id = config.id;
        dto.fairId = config.fairId;
        dto.name = config.name;
        dto.width = config.width;
        dto.height = config.height;
        dto.quantity = config.quantity;
        dto.pricePerSquareMeter = config.pricePerSquareMeter;
        dto.setupCostPerSquareMeter = config.setupCostPerSquareMeter;
        dto.totalPrice = config.totalPrice;
        dto.totalSetupCost = config.totalSetupCost;
        dto.profitPerStand = config.profitPerStand;
        dto.profitMargin = config.profitMargin;
        dto.description = config.description;
        dto.isActive = config.isActive;
        dto.createdAt = config.createdAt;
        dto.updatedAt = config.updatedAt;
        return dto;
      });
    }
  }
}
