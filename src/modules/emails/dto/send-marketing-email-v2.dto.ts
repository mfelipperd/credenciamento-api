import { IsString, IsNotEmpty, IsUUID, IsIn } from 'class-validator';

export class SendMarketingEmailV2Dto {
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
  subject: string;

  @IsString()
  @IsNotEmpty()
  htmlContent: string;
}
