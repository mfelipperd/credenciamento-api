/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Visitor } from './entities/visitor.entity';
import { Repository } from 'typeorm';
import { CreateVisitorInputDto } from './visitors.dto';
import { EmailsService } from '../emails/emails.service';
import { User } from '../users/entitie/users.entity';
import { UpdateVisitorDto } from './update-visitor.dto';
import { Fair } from '../fairs/entity/fair.entity';
import { EUserRole } from 'src/enum/role';

@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(Visitor) private visitorRepository: Repository<Visitor>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Fair) private fairRepository: Repository<Fair>,
    private readonly emailsService: EmailsService,
  ) {}

  async getVisitors(user: User, fairId?: string): Promise<Visitor[]> {
    const query = this.visitorRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      );

    if (user.role === EUserRole.CONSULTANT) {
      const allowed = user.fairIds ?? [];

      if (fairId) {
        if (!allowed.includes(fairId)) {
          return [];
        }
        query.where('fv.fairsId = :fairId', { fairId });
      } else {
        // Sem fairId, retorna tudo que está em user.fairIds
        if (allowed.length === 0) {
          return [];
        }
        query.where('fv.fairsId IN (:...fairIds)', { fairIds: allowed });
      }
    } else {
      // Outros papéis: mantém o filtro por fairId se enviado, senão traz tudo
      if (fairId) {
        query.where('fv.fairsId = :fairId', { fairId });
      }
    }

    return await query.getMany();
  }

  async createVisitor(
    dto: CreateVisitorInputDto,
    userId?: string,
  ): Promise<Visitor> {
    // Cria nova entidade sem registrationCode (gerado pelo DB)
    const newVisitor = this.visitorRepository.create({
      ...dto,
      createdBy: userId ? { id: +userId } : undefined,
      fair_visitor: [{ id: dto.fair_visitor }],
    });

    let savedVisitor: Visitor;
    try {
      // Ao salvar, o PrimaryGeneratedColumn gera o registrationCode
      savedVisitor = await this.visitorRepository.save(newVisitor);
    } catch (err) {
      throw new InternalServerErrorException('Erro ao salvar visitante');
    }

    // Agora o savedVisitor.registrationCode contém o UUID gerado
    try {
      // Envia e-mail de confirmação com QR code e link do Calendar
      await this.emailsService.sendConfirmationEmail(
        savedVisitor.email,
        savedVisitor.name,
        savedVisitor.registrationCode,
        dto.fair_visitor,
      );
    } catch (err) {
      console.error('Erro enviando email:', err);
    }

    return savedVisitor;
  }

  getVisitor(id: number) {
    return this.visitorRepository.findOne({
      where: { registrationCode: id.toString() },
    });
  }

  async getVisitorByRegistrationCode(registrationCode: string, fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const visitor = await this.visitorRepository
      .createQueryBuilder('visitor')
      // carrega só a feira específica (filtrando por fairId)
      .innerJoinAndSelect(
        'visitor.fair_visitor', // propriedade da entidade
        'fair',
        'fair.id = :fairId',
        { fairId },
      )
      .where('visitor.registrationCode = :registrationCode', {
        registrationCode,
      })
      .getOne();

    if (!visitor) {
      throw new NotFoundException('Visitor not found for the specified fair');
    }

    return visitor;
  }

  async deleteVisitor(id: string) {
    const visitor = await this.visitorRepository.findOne({
      where: { registrationCode: id.toString() },
    });

    if (!visitor) {
      throw new NotFoundException('Visitor not found');
    }

    try {
      await this.visitorRepository.remove(visitor);
      return { message: 'Visitor deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Error deleting visitor');
    }
  }

  async updateVisitor(
    registrationCode: string,
    updateDto: UpdateVisitorDto,
  ): Promise<Visitor> {
    const visitor = await this.visitorRepository.findOne({
      where: { registrationCode },
      relations: ['fair_visitor'],
    });
    if (!visitor) {
      throw new NotFoundException('Visitor not found');
    }

    Object.assign(visitor, {
      name: updateDto.name,
      company: updateDto.company,
      email: updateDto.email,
      cnpj: updateDto.cnpj,
      phone: updateDto.phone,
      zipCode: updateDto.zipCode,
      sectors: updateDto.sectors,
      howDidYouKnow: updateDto.howDidYouKnow,
      category: updateDto.category,
      registrationDate: updateDto.registrationDate
        ? new Date(updateDto.registrationDate)
        : visitor.registrationDate,
    });

    if (updateDto.fairIds) {
      const fairs = await this.fairRepository.findByIds(updateDto.fairIds);
      if (fairs.length !== updateDto.fairIds.length) {
        throw new NotFoundException('One or more fairs not found');
      }
      visitor.fair_visitor = fairs;
    }

    return this.visitorRepository.save(visitor);
  }
}
