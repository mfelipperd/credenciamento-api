import { IsString, IsNotEmpty, IsUUID, IsIn, MaxLength } from 'class-validator';

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
