import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class SendMarketingEmailDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  htmlContent: string;

  @IsUUID()
  @IsNotEmpty()
  fairId: string;
}
