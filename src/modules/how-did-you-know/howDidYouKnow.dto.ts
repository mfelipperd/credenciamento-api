import { IsString, IsUUID } from 'class-validator';

export class CreateHowDidYouKnowDto {
  @IsString()
  name: string;

  @IsUUID()
  fairId: string;
}
