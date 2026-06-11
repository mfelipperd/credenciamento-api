import {
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendWhatsappCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsUUID()
  @IsNotEmpty()
  targetFairId: string;

  @IsIn(['all', 'absent'])
  sendTo: 'all' | 'absent';

  /** Template da mensagem. Suporta {{nome}} e {{empresa}}. */
  @IsString()
  @IsNotEmpty()
  message: string;
}
