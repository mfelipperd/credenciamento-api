import { PartialType } from '@nestjs/swagger';
import { CreateInputFairDto } from '../fair.dto';

export class UpdateFairDto extends PartialType(CreateInputFairDto) {}
