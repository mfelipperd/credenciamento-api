import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ExhibitorFairStatus } from './entities/exhibitor-fair.entity';
import { ExhibitorMemberRole } from './entities/exhibitor-member.entity';
import { ExhibitorType } from './entities/exhibitor.entity';

export class CreateExhibitorDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ enum: ExhibitorType })
  @IsOptional()
  @IsEnum(ExhibitorType)
  type?: ExhibitorType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnpj?: string;
}

export class LinkFinanceClientDto {
  @ApiProperty()
  @IsUUID()
  clientId: string;
}

export class CreateExhibitorMemberDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  jobTitle?: string;

  @ApiPropertyOptional({
    enum: ExhibitorMemberRole,
    default: ExhibitorMemberRole.STAFF,
  })
  @IsOptional()
  @IsEnum(ExhibitorMemberRole)
  role?: ExhibitorMemberRole;
}

export class CreateExhibitorFairDto {
  @ApiProperty()
  @IsUUID()
  fairId: string;

  @ApiPropertyOptional({ enum: ExhibitorFairStatus })
  @IsOptional()
  @IsEnum(ExhibitorFairStatus)
  status?: ExhibitorFairStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}

export class CreateExhibitorInvitationDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ExhibitorMemberRole })
  @IsEnum(ExhibitorMemberRole)
  role: ExhibitorMemberRole;
}

export class AcceptExhibitorInvitationDto {
  @ApiProperty()
  @IsString()
  token: string;
}
