import { PartialType } from '@nestjs/mapped-types';
import { CreateUserFairDto } from './create-user-fair.dto';

export class UpdateUserFairDto extends PartialType(CreateUserFairDto) {}
