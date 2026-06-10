import { ApiProperty } from '@nestjs/swagger';
import { FairStatus } from '../../fairs/entity/fair.entity';

export class PublicTransportLinksDto {
  @ApiProperty({ required: false }) googleMaps?: string | null;
  @ApiProperty({ required: false }) waze?: string | null;
  @ApiProperty({ required: false }) uber?: string | null;
  @ApiProperty({ required: false }) taxi99?: string | null;
}

export class PublicDayScheduleDto {
  @ApiProperty() date: string;
  @ApiProperty() startTime: string;
  @ApiProperty() endTime: string;
  @ApiProperty({ required: false }) note?: string | null;
}

export class PublicStandOptionDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Ex: Stand 2x3, Stand Duplo' }) name: string;
  @ApiProperty({ description: 'Largura em metros' }) width: number;
  @ApiProperty({ description: 'Altura em metros' }) height: number;
  @ApiProperty({ description: 'Área total em m² (width × height)' }) area: number;
  @ApiProperty({ description: 'Quantidade de stands disponíveis deste tipo' }) quantity: number;
  @ApiProperty({ description: 'Preço total do stand (R$)' }) totalPrice: number;
  @ApiProperty({ required: false }) description?: string | null;
}

export class PublicExhibitorBrandDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ description: 'URL da logo da marca' }) logoUrl: string;
}

export class PublicFairSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ required: false }) edition?: string | null;
  @ApiProperty({ required: false }) bannerUrl?: string | null;
  @ApiProperty({ enum: FairStatus }) status: FairStatus;
  @ApiProperty({ required: false }) city?: string | null;
  @ApiProperty({ required: false }) state?: string | null;
  @ApiProperty({ required: false }) startDate?: Date | null;
  @ApiProperty({ required: false }) endDate?: Date | null;
  @ApiProperty({ required: false, description: 'Duração em dias' }) durationDays?: number | null;
  @ApiProperty({ required: false }) expectedVisitors?: number | null;
  @ApiProperty({ required: false }) expectedExhibitors?: number | null;
}

export class PublicFairDetailDto {
  // Identidade
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ required: false }) edition?: string | null;
  @ApiProperty({ required: false }) description?: string | null;
  @ApiProperty({ required: false }) bannerUrl?: string | null;
  @ApiProperty({ enum: FairStatus }) status: FairStatus;

  // Local
  @ApiProperty({ required: false }) venueName?: string | null;
  @ApiProperty({ required: false }) address?: string | null;
  @ApiProperty({ required: false }) number?: string | null;
  @ApiProperty({ required: false }) complement?: string | null;
  @ApiProperty({ required: false }) neighborhood?: string | null;
  @ApiProperty({ required: false }) city?: string | null;
  @ApiProperty({ required: false }) state?: string | null;
  @ApiProperty({ required: false }) zipCode?: string | null;
  @ApiProperty({ required: false }) country?: string | null;
  @ApiProperty({ required: false }) latitude?: number | null;
  @ApiProperty({ required: false }) longitude?: number | null;
  @ApiProperty({ type: PublicTransportLinksDto }) transportLinks: PublicTransportLinksDto;

  // Datas e horários
  @ApiProperty({ required: false }) startDate?: Date | null;
  @ApiProperty({ required: false }) endDate?: Date | null;
  @ApiProperty({ required: false, description: 'Horário padrão de abertura (HH:mm)' }) startTime?: string | null;
  @ApiProperty({ required: false, description: 'Horário padrão de encerramento (HH:mm)' }) endTime?: string | null;
  @ApiProperty({ required: false, description: 'Duração em dias' }) durationDays?: number | null;
  @ApiProperty({ type: [PublicDayScheduleDto] }) daySchedules: PublicDayScheduleDto[];

  // Indicadores de audiência
  @ApiProperty({ required: false, description: 'Meta de visitantes da feira' }) expectedVisitors?: number | null;
  @ApiProperty({ required: false, description: 'Número de expositores/marcas participantes' }) expectedExhibitors?: number | null;

  // View de visitantes — marcas participantes
  @ApiProperty({ type: [PublicExhibitorBrandDto], description: 'Marcas expositoras com suas logos' })
  exhibitorBrands: PublicExhibitorBrandDto[];

  // View de expositores — opções de stand disponíveis
  @ApiProperty({ type: [PublicStandOptionDto], description: 'Tipos de stand disponíveis para compra' })
  standOptions: PublicStandOptionDto[];
}
