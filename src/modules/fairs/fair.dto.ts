import { IsString, Length, IsISO8601 } from 'class-validator';

export class CreateInputFairDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 255)
  location: string;

  @IsISO8601()
  date: Date;
}
