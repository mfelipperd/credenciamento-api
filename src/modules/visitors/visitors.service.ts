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

@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(Visitor) private visitorRepository: Repository<Visitor>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly emailsService: EmailsService,
  ) {}

  async getVisitors(fairId?: string) {
    const query = this.visitorRepository.createQueryBuilder('visitor');

    if (fairId) {
      query
        .innerJoin(
          'fair_visitor',
          'fv',
          'fv.visitorsRegistrationCode = visitor.registrationCode',
        )
        .where('fv.fairsId = :fairId', { fairId });
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

  updateVisitor(id: number, visitor: Visitor) {
    return this.visitorRepository.update(id, visitor);
  }

  async getVisitorByRegistrationCode(registrationCode: string, fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const visitor = await this.visitorRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('visitor.registrationCode = :registrationCode', {
        registrationCode,
      })
      .andWhere('fv.fairsId = :fairId', { fairId }) // ✅ Filtrando pela feira
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
}
