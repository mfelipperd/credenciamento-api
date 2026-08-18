import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class RegisterClientDto {
  // Not validated as strict URLs: MCP clients (e.g. Claude Desktop) may register
  // custom URI schemes (e.g. `claude-desktop://...`) as redirect_uri, which IsUrl
  // would reject. The real security boundary is the exact-match check against this
  // list performed in OAuthService at /authorize time, not format validation here.
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  redirect_uris: string[];

  @IsOptional()
  @IsString()
  client_name?: string;
}
