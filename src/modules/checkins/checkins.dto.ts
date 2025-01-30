/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateCheckInDto {
  @IsUUID()
  @IsNotEmpty()
  visitorId: string;

  @IsNotEmpty()
  checkInDate: string;
}
