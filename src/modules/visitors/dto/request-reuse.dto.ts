import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestReuseDto {
  @ApiProperty({ description: 'Email ou telefone usado na consulta em GET /visitors/public/check-existing' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ description: 'Id da feira à qual o visitante quer se inscrever' })
  @IsUUID()
  @IsNotEmpty()
  fairId: string;

  @ApiProperty({ description: 'Telefone atual do visitante (igual ao cadastrado, ou novo se mudou)' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
