import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { AccountType } from '../../common/entities/account.entity';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  nomeConta: string;

  @IsString()
  @IsOptional()
  banco?: string;

  @IsEnum(AccountType)
  @IsOptional()
  tipo?: AccountType;
}
