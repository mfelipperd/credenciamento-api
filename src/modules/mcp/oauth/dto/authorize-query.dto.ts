import { IsIn, IsOptional, IsString } from 'class-validator';

export class AuthorizeQueryDto {
  @IsString()
  client_id: string;

  @IsString()
  redirect_uri: string;

  @IsIn(['code'])
  response_type: string;

  @IsString()
  code_challenge: string;

  @IsIn(['S256'])
  code_challenge_method: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsString()
  scope?: string;
}
