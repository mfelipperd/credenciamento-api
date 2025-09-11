import { PartialType } from '@nestjs/swagger';
import { CreateFairPartnerDto } from './create-fair-partner.dto';

export class UpdateFairPartnerDto extends PartialType(CreateFairPartnerDto) {}
