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
  anchorPrice?: number | null;
  totalSetupCost: number;
  profitPerStand: number;
  profitMargin: number;
  description?: string;
  entryModelId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
