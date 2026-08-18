import { IsIn, IsOptional, IsString } from 'class-validator';

export class TokenRequestDto {
  @IsIn(['authorization_code', 'refresh_token'])
  grant_type: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  code_verifier?: string;

  @IsOptional()
  @IsString()
  redirect_uri?: string;

  @IsOptional()
  @IsString()
  client_id?: string;

  @IsOptional()
  @IsString()
  refresh_token?: string;

  @IsOptional()
  @IsString()
  resource?: string;
}
