import { PartialType } from '@nestjs/mapped-types';
import { CreateFinanceCategoryDto } from './create-finance-category.dto';

export class UpdateFinanceCategoryDto extends PartialType(
  CreateFinanceCategoryDto,
) {}
