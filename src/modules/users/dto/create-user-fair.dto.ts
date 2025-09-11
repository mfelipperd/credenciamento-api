import { IsNumber, IsUUID, IsString, IsOptional, IsBoolean, Length } from 'class-validator';

export class CreateUserFairDto {
  @IsNumber()
  userId: number;

  @IsUUID()
  fairId: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  role?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
