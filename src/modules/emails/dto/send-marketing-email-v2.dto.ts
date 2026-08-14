import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsIn,
  MaxLength,
  IsOptional,
  IsArray,
} from 'class-validator';

export class SendMarketingEmailV2Dto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsUUID()
  @IsNotEmpty()
  targetFairId: string;

  @IsUUID()
  @IsNotEmpty()
  templateFairId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  additionalFairIds?: string[];

  @IsIn(['all', 'absent'])
  sendTo: 'all' | 'absent';

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subject: string;

  @IsString()
  @IsNotEmpty()
  htmlContent: string;
}
