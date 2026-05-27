import { ApiProperty } from '@nestjs/swagger';
import { Fair, FairStatus } from '../entity/fair.entity';
import { StandConfigurationResponseDto } from './stand-configuration-response.dto';

export class FairDayScheduleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Data (YYYY-MM-DD)' }) date: string;
  @ApiProperty({ description: 'Horário de abertura (HH:mm)' }) startTime: string;
  @ApiProperty({ description: 'Horário de encerramento (HH:mm)' }) endTime: string;
  @ApiProperty({ required: false }) note?: string | null;
}

export class FairTransportLinksDto {
  @ApiProperty({ description: 'Link do Google Maps' }) googleMaps?: string | null;
  @ApiProperty({ description: 'Link do Waze' }) waze?: string | null;
  @ApiProperty({ description: 'Link do Uber (web)' }) uber?: string | null;
  @ApiProperty({ description: 'Link do 99 (web)' }) taxi99?: string | null;
}

function buildTransportLinks(fair: Fair): FairTransportLinksDto {
  const links: FairTransportLinksDto = {};

  if (fair.googleMapsUrl) {
    links.googleMaps = fair.googleMapsUrl;
  }

  const lat = fair.latitude ? Number(fair.latitude) : null;
  const lng = fair.longitude ? Number(fair.longitude) : null;
  const venueName = encodeURIComponent(fair.venueName ?? fair.name);
  const venueAddress = encodeURIComponent(
    [fair.address, fair.number, fair.neighborhood, fair.city, fair.state]
      .filter(Boolean)
      .join(', ') || fair.location,
  );

  if (lat && lng) {
    // Waze
    links.waze = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

    // Uber (web universal — abre app no mobile, site no desktop)
    links.uber =
      `https://m.uber.com/ul/?action=setPickup` +
      `&pickup=my_location` +
      `&dropoff[latitude]=${lat}` +
      `&dropoff[longitude]=${lng}` +
      `&dropoff[nickname]=${venueName}` +
      `&dropoff[formatted_address]=${venueAddress}`;

    // 99 (web deeplink)
    links.taxi99 =
      `https://99app.com/corrida` +
      `?dest_lat=${lat}` +
      `&dest_lng=${lng}` +
      `&dest_title=${venueName}`;
  }

  return links;
}

export class FairResponseDto {
  // ── Identidade ────────────────────────────────────────────────────────────
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ required: false }) edition?: string | null;
  @ApiProperty({ required: false }) description?: string | null;
  @ApiProperty({ required: false }) bannerUrl?: string | null;
  @ApiProperty({ enum: FairStatus }) status: FairStatus;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;

  // ── Local ─────────────────────────────────────────────────────────────────
  @ApiProperty({ description: 'Campo legado de localização' }) location: string;
  @ApiProperty({ required: false }) venueName?: string | null;
  @ApiProperty({ required: false }) address?: string | null;
  @ApiProperty({ required: false }) number?: string | null;
  @ApiProperty({ required: false }) complement?: string | null;
  @ApiProperty({ required: false }) neighborhood?: string | null;
  @ApiProperty({ required: false }) city?: string | null;
  @ApiProperty({ required: false, description: 'UF em 2 letras: AM, PA' }) state?: string | null;
  @ApiProperty({ required: false }) zipCode?: string | null;
  @ApiProperty({ required: false }) country?: string | null;
  @ApiProperty({ required: false }) googleMapsUrl?: string | null;
  @ApiProperty({ required: false }) latitude?: number | null;
  @ApiProperty({ required: false }) longitude?: number | null;

  /** Links de transporte gerados automaticamente a partir de lat/lng */
  @ApiProperty({ type: FairTransportLinksDto, required: false })
  transportLinks: FairTransportLinksDto;

  // ── Datas e horários ──────────────────────────────────────────────────────
  @ApiProperty({ required: false }) startDate?: Date | null;
  @ApiProperty({ required: false }) endDate?: Date | null;
  @ApiProperty({ required: false, description: 'Horário padrão de abertura (HH:mm)' }) startTime?: string | null;
  @ApiProperty({ required: false, description: 'Horário padrão de encerramento (HH:mm)' }) endTime?: string | null;
  @ApiProperty({ required: false }) startDateTime?: Date | null;
  @ApiProperty({ required: false }) endDateTime?: Date | null;

  /** Número de dias de duração da feira (calculado de startDate a endDate) */
  @ApiProperty({ required: false }) durationDays?: number | null;

  @ApiProperty({ type: [FairDayScheduleResponseDto], required: false })
  daySchedules: FairDayScheduleResponseDto[];

  // ── Planejamento ──────────────────────────────────────────────────────────
  @ApiProperty({ required: false }) expectedVisitors?: number | null;
  @ApiProperty({ required: false }) expectedExhibitors?: number | null;

  // ── Stands ────────────────────────────────────────────────────────────────
  @ApiProperty() totalStands: number;
  @ApiProperty() costPerSquareMeter: number;
  @ApiProperty() setupCostPerSquareMeter: number;
  @ApiProperty() expectedRevenue: number;
  @ApiProperty() expectedProfit: number;
  @ApiProperty() expectedProfitMargin: number;
  @ApiProperty({ required: false }) insights?: string | null;

  @ApiProperty({ type: [StandConfigurationResponseDto], required: false })
  standConfigurations?: StandConfigurationResponseDto[];

  // ── Financeiro (injetado pelo service) ────────────────────────────────────
  @ApiProperty({ required: false }) totalRevenue?: number;
  @ApiProperty({ required: false }) totalExpenses?: number;
  @ApiProperty({ required: false }) netBalance?: number;
  @ApiProperty({ required: false }) profitMargin?: number;
  @ApiProperty({ required: false }) totalRevenues?: number;
  @ApiProperty({ required: false }) totalExpensesCount?: number;

  constructor(fair: Fair) {
    // Identidade
    this.id = fair.id;
    this.name = fair.name;
    this.edition = fair.edition ?? null;
    this.description = fair.description ?? null;
    this.bannerUrl = fair.bannerUrl ?? null;
    this.status = fair.status ?? FairStatus.UPCOMING;
    this.isActive = fair.isActive;
    this.createdAt = fair.createdAt;

    // Local
    this.location = fair.location;
    this.venueName = fair.venueName ?? null;
    this.address = fair.address ?? null;
    this.number = fair.number ?? null;
    this.complement = fair.complement ?? null;
    this.neighborhood = fair.neighborhood ?? null;
    this.city = fair.city ?? null;
    this.state = fair.state ?? null;
    this.zipCode = fair.zipCode ?? null;
    this.country = fair.country ?? null;
    this.googleMapsUrl = fair.googleMapsUrl ?? null;
    this.latitude = fair.latitude ? Number(fair.latitude) : null;
    this.longitude = fair.longitude ? Number(fair.longitude) : null;
    this.transportLinks = buildTransportLinks(fair);

    // Datas e horários
    this.startDate = fair.startDate ?? null;
    this.endDate = fair.endDate ?? null;
    this.startTime = fair.startTime ?? null;
    this.endTime = fair.endTime ?? null;
    this.startDateTime = fair.startDateTime ?? null;
    this.endDateTime = fair.endDateTime ?? null;

    // Duração em dias
    if (fair.startDate && fair.endDate) {
      const start = new Date(fair.startDate);
      const end = new Date(fair.endDate);
      this.durationDays =
        Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    } else {
      this.durationDays = null;
    }

    // Programação por dia
    this.daySchedules = (fair.daySchedules ?? []).map((s) => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      note: s.note ?? null,
    }));

    // Planejamento
    this.expectedVisitors = fair.expectedVisitors ?? null;
    this.expectedExhibitors = fair.expectedExhibitors ?? null;

    // Stands / financeiro
    this.totalStands = fair.totalStands;
    this.costPerSquareMeter = fair.costPerSquareMeter;
    this.setupCostPerSquareMeter = fair.setupCostPerSquareMeter;
    this.expectedRevenue = fair.expectedRevenue;
    this.expectedProfit = fair.expectedProfit;
    this.expectedProfitMargin = fair.expectedProfitMargin;
    this.insights = fair.insights ?? null;

    this.totalRevenue = (fair as any).totalRevenue || 0;
    this.totalExpenses = (fair as any).totalExpenses || 0;
    this.netBalance = (fair as any).netBalance || 0;
    this.profitMargin = (fair as any).profitMargin || 0;
    this.totalRevenues = (fair as any).totalRevenues || 0;
    this.totalExpensesCount = (fair as any).totalExpensesCount || 0;

    if (fair.standConfigurations) {
      this.standConfigurations = fair.standConfigurations.map((config) => {
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
