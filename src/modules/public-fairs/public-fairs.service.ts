import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fair } from '../fairs/entity/fair.entity';
import { Brand } from '../finance/clients/entities/brand.entity';
import { ClientsService } from '../finance/clients/clients.service';
import { StandsService } from '../finance/stands/stands.service';
import {
  PublicFairDetailDto,
  PublicFairSummaryDto,
  PublicTransportLinksDto,
} from './dto/public-fair.dto';

@Injectable()
export class PublicFairsService {
  private readonly logger = new Logger(PublicFairsService.name);

  constructor(
    @InjectRepository(Fair) private readonly fairRepository: Repository<Fair>,
    private readonly clientsService: ClientsService,
    private readonly standsService: StandsService,
  ) {}

  async findAll(): Promise<PublicFairSummaryDto[]> {
    this.logger.log('Buscando lista pública de feiras');

    const fairs = await this.fairRepository.find({
      order: { startDate: 'ASC' },
    });

    const fairIds = fairs.map((f) => f.id);
    const availableCounts = await this.standsService.countAvailableByFairIds(fairIds);

    return fairs.map((f) => this.toSummary(f, availableCounts[f.id] ?? 0));
  }

  async findOne(id: string): Promise<PublicFairDetailDto> {
    this.logger.log(`Buscando detalhes públicos da feira: ${id}`);

    const fair = await this.fairRepository.findOne({
      where: { id },
      relations: ['standConfigurations', 'daySchedules'],
    });

    if (!fair) throw new NotFoundException('Feira não encontrada');

    const [brands, standStats] = await Promise.all([
      this.clientsService.findBrandsByFair(id),
      this.standsService.getStandStats(id),
    ]);

    return this.toDetail(fair, brands, standStats.available);
  }

  async getStandMap(fairId: string) {
    const fair = await this.fairRepository.findOne({ where: { id: fairId } });
    if (!fair) throw new NotFoundException('Feira não encontrada');

    return this.standsService.getPublicStandMap(fairId);
  }

  private toSummary(fair: Fair, standsAvailable: number): PublicFairSummaryDto {
    return {
      id: fair.id,
      name: fair.name,
      edition: fair.edition ?? null,
      bannerUrl: fair.bannerUrl ?? null,
      status: fair.status,
      city: fair.city ?? null,
      state: fair.state ?? null,
      startDate: fair.startDate ?? null,
      endDate: fair.endDate ?? null,
      durationDays: this.calcDuration(fair),
      expectedVisitors: fair.expectedVisitors ?? null,
      expectedExhibitors: fair.expectedExhibitors ?? null,
      standsAvailable,
    };
  }

  private toDetail(fair: Fair, brands: Brand[], standsAvailable: number): PublicFairDetailDto {
    return {
      id: fair.id,
      name: fair.name,
      edition: fair.edition ?? null,
      description: fair.description ?? null,
      bannerUrl: fair.bannerUrl ?? null,
      floorPlanUrl: fair.floorPlanUrl ?? null,
      status: fair.status,

      venueName: fair.venueName ?? null,
      address: fair.address ?? null,
      number: fair.number ?? null,
      complement: fair.complement ?? null,
      neighborhood: fair.neighborhood ?? null,
      city: fair.city ?? null,
      state: fair.state ?? null,
      zipCode: fair.zipCode ?? null,
      country: fair.country ?? null,
      latitude: fair.latitude ? Number(fair.latitude) : null,
      longitude: fair.longitude ? Number(fair.longitude) : null,
      transportLinks: this.buildTransportLinks(fair),

      startDate: fair.startDate ?? null,
      endDate: fair.endDate ?? null,
      startTime: fair.startTime ?? null,
      endTime: fair.endTime ?? null,
      durationDays: this.calcDuration(fair),
      daySchedules: (fair.daySchedules ?? [])
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => ({
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          note: s.note ?? null,
        })),

      expectedVisitors: fair.expectedVisitors ?? null,
      expectedExhibitors: fair.expectedExhibitors ?? null,
      standsAvailable,

      exhibitorBrands: brands.map((b) => ({
        id: b.id,
        name: b.name,
        logoUrl: b.logoUrl,
      })),

      standOptions: (fair.standConfigurations ?? [])
        .filter((sc) => sc.isActive)
        .map((sc) => ({
          id: sc.id,
          name: sc.name,
          width: sc.width,
          height: sc.height,
          area: sc.width * sc.height,
          quantity: sc.quantity,
          totalPrice: Number(sc.totalPrice),
          anchorPrice: sc.anchorPrice != null ? Number(sc.anchorPrice) : null,
          description: sc.description ?? null,
        })),
    };
  }

  private calcDuration(fair: Fair): number | null {
    if (!fair.startDate || !fair.endDate) return null;
    const start = new Date(fair.startDate);
    const end = new Date(fair.endDate);
    return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  }

  private buildTransportLinks(fair: Fair): PublicTransportLinksDto {
    const links: PublicTransportLinksDto = {};

    if (fair.googleMapsUrl) links.googleMaps = fair.googleMapsUrl;

    const lat = fair.latitude ? Number(fair.latitude) : null;
    const lng = fair.longitude ? Number(fair.longitude) : null;

    if (lat && lng) {
      const venueName = encodeURIComponent(fair.venueName ?? fair.name);
      const venueAddress = encodeURIComponent(
        [fair.address, fair.number, fair.neighborhood, fair.city, fair.state]
          .filter(Boolean)
          .join(', ') || fair.location,
      );

      links.waze = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
      links.uber =
        `https://m.uber.com/ul/?action=setPickup&pickup=my_location` +
        `&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}` +
        `&dropoff[nickname]=${venueName}&dropoff[formatted_address]=${venueAddress}`;
      links.taxi99 =
        `https://99app.com/corrida?dest_lat=${lat}&dest_lng=${lng}&dest_title=${venueName}`;
    }

    return links;
  }
}
