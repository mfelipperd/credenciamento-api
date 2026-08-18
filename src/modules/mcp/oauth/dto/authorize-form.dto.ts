import { IsString } from 'class-validator';
import { AuthorizeQueryDto } from './authorize-query.dto';

export class AuthorizeFormDto extends AuthorizeQueryDto {
  @IsString()
  email: string;

  @IsString()
  password: string;
}
