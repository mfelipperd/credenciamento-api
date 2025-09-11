import { PartialType } from '@nestjs/mapped-types';
import { CreateStandConfigurationDto } from './create-stand-configuration.dto';

export class UpdateStandConfigurationDto extends PartialType(CreateStandConfigurationDto) {}
