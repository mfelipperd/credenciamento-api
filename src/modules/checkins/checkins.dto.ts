import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateCheckInDto {
  @IsUUID()
  @IsNotEmpty()
  visitorId: string;

  @IsNotEmpty()
  checkInDate: string;
}
