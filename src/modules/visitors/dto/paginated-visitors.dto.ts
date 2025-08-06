import { IsOptional, IsString, IsIn, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginatedVisitorsDto {
  @IsString()
  fairId: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return 1;
    return Number.parseInt(value as string) || 1;
  })
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return 50;
    return Math.min(100, Math.max(1, Number.parseInt(value as string) || 50));
  })
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  search?: string = '';

  @IsOptional()
  @IsString()
  @IsIn(['all', 'name', 'email', 'company', 'phone', 'registrationCode'])
  searchField?: string = 'all';

  @IsOptional()
  @IsString()
  @IsIn(['name', 'email', 'company', 'registrationDate', 'registrationCode'])
  sortBy?: string = 'name';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
