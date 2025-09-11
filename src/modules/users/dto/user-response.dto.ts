import { ApiProperty } from '@nestjs/swagger';
import { EUserRole } from '../../../enum/role';
import { User } from '../entitie/users.entity';

export class UserResponseDto {
  @ApiProperty({ description: 'ID do usuário' })
  id: number;

  @ApiProperty({ description: 'Nome do usuário' })
  name: string;

  @ApiProperty({ description: 'Email do usuário' })
  email: string;

  @ApiProperty({ description: 'Role do usuário', enum: EUserRole })
  role: EUserRole;

  @ApiProperty({ description: 'Se está ativo' })
  isActive: boolean;

  @ApiProperty({ description: 'CPF do usuário', required: false })
  cpf?: string;

  @ApiProperty({ description: 'Telefone do usuário', required: false })
  phone?: string;

  @ApiProperty({ description: 'Observações', required: false })
  notes?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.role = user.role;
    this.isActive = user.isActive;
    this.cpf = user.cpf;
    this.phone = user.phone;
    this.notes = user.notes;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
