import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class SendPushDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsUrl()
  url?: string;
}
