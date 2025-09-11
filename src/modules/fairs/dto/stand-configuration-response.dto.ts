export class StandConfigurationResponseDto {
  id: string;
  fairId: string;
  name: string;
  width: number;
  height: number;
  quantity: number;
  pricePerSquareMeter: number;
  setupCostPerSquareMeter: number;
  totalPrice: number;
  totalSetupCost: number;
  profitPerStand: number;
  profitMargin: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
