import { IsString, IsUUID } from 'class-validator';

export class CreateSectorDto {
  @IsString()
  name: string;

  @IsUUID()
  fairId: string;
}
