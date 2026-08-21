import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Client } from '../finance/clients/entities/client.entity';
import { Fair } from '../fairs/entity/fair.entity';
import { User } from '../users/entitie/users.entity';
import {
  CreateExhibitorDto,
  CreateExhibitorFairDto,
  CreateExhibitorInvitationDto,
  CreateExhibitorMemberDto,
} from './exhibitors.dto';
import {
  ExhibitorFair,
  ExhibitorFairStatus,
} from './entities/exhibitor-fair.entity';
import {
  ExhibitorCredentialStatus,
  ExhibitorFairMember,
} from './entities/exhibitor-fair-member.entity';
import { ExhibitorFinanceClient } from './entities/exhibitor-finance-client.entity';
import {
  ExhibitorInvitation,
  ExhibitorInvitationStatus,
} from './entities/exhibitor-invitation.entity';
import {
  ExhibitorMember,
  ExhibitorMemberRole,
} from './entities/exhibitor-member.entity';
import { Exhibitor, ExhibitorType } from './entities/exhibitor.entity';

@Injectable()
export class ExhibitorsService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Fair) private readonly fairs: Repository<Fair>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Exhibitor)
    private readonly exhibitors: Repository<Exhibitor>,
    @InjectRepository(ExhibitorFinanceClient)
    private readonly financeClientLinks: Repository<ExhibitorFinanceClient>,
    @InjectRepository(ExhibitorMember)
    private readonly members: Repository<ExhibitorMember>,
    @InjectRepository(ExhibitorFair)
    private readonly exhibitorFairs: Repository<ExhibitorFair>,
    @InjectRepository(ExhibitorFairMember)
    private readonly fairMembers: Repository<ExhibitorFairMember>,
    @InjectRepository(ExhibitorInvitation)
    private readonly invitations: Repository<ExhibitorInvitation>,
  ) {}

  static normalizeName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  async assertExhibitor(exhibitorId: string): Promise<Exhibitor> {
    const exhibitor = await this.exhibitors.findOne({
      where: { id: exhibitorId },
    });
    if (!exhibitor) throw new NotFoundException('Expositor não encontrado');
    return exhibitor;
  }

  async listExhibitors() {
    return this.exhibitors.find({
      relations: ['financeClients', 'financeClients.client'],
      order: { name: 'ASC' },
    });
  }

  async createExhibitor(dto: CreateExhibitorDto) {
    const normalizedName = ExhibitorsService.normalizeName(dto.name);
    const existing = await this.exhibitors.findOne({
      where: { normalizedName },
    });
    if (existing) return existing;
    return this.exhibitors.save(
      this.exhibitors.create({
        name: dto.name.trim(),
        normalizedName,
        type: dto.type ?? ExhibitorType.OTHER,
        cnpj: dto.cnpj?.replace(/\D/g, '') || null,
      }),
    );
  }

  async linkFinanceClient(exhibitorId: string, clientId: string) {
    await this.assertExhibitor(exhibitorId);
    const client = await this.clients.findOne({ where: { id: clientId } });
    if (!client)
      throw new NotFoundException('Cliente financeiro não encontrado');
    const linked = await this.financeClientLinks.findOne({
      where: { clientId },
    });
    if (linked && linked.exhibitorId !== exhibitorId)
      throw new ConflictException(
        'Cliente financeiro já pertence a outro expositor',
      );
    if (linked) return linked;
    return this.financeClientLinks.save(
      this.financeClientLinks.create({ exhibitorId, clientId }),
    );
  }

  listMyOrganizations(userId: number) {
    return this.members.find({
      where: { userId, isActive: true },
      relations: ['exhibitor'],
      order: { createdAt: 'ASC' },
    });
  }

  async listTeam(exhibitorId: string) {
    await this.assertExhibitor(exhibitorId);
    return this.members.find({
      where: { exhibitorId },
      order: { name: 'ASC' },
    });
  }

  async createMember(exhibitorId: string, dto: CreateExhibitorMemberDto) {
    await this.assertExhibitor(exhibitorId);
    const normalizedName = ExhibitorsService.normalizeName(dto.name);
    const existing = await this.members.findOne({
      where: { exhibitorId, normalizedName },
    });
    if (existing) return existing;
    return this.members.save(
      this.members.create({
        ...dto,
        exhibitorId,
        name: dto.name.trim(),
        normalizedName,
        email: dto.email?.trim().toLowerCase() || null,
        phone: dto.phone?.trim() || null,
        jobTitle: dto.jobTitle?.trim() || null,
        role: dto.role ?? ExhibitorMemberRole.STAFF,
      }),
    );
  }

  async listParticipations(exhibitorId: string) {
    await this.assertExhibitor(exhibitorId);
    return this.exhibitorFairs.find({
      where: { exhibitorId },
      relations: ['fair', 'members', 'members.member'],
      order: { createdAt: 'DESC' },
    });
  }

  async createParticipation(exhibitorId: string, dto: CreateExhibitorFairDto) {
    await this.assertExhibitor(exhibitorId);
    const fair = await this.fairs.findOne({ where: { id: dto.fairId } });
    if (!fair) throw new NotFoundException('Feira não encontrada');
    const existing = await this.exhibitorFairs.findOne({
      where: { exhibitorId, fairId: dto.fairId },
    });
    if (existing) return existing;
    return this.exhibitorFairs.save(
      this.exhibitorFairs.create({
        exhibitorId,
        fairId: dto.fairId,
        status: dto.status ?? ExhibitorFairStatus.CONFIRMED,
        source: dto.source?.trim() || null,
      }),
    );
  }

  async addMemberToFair(exhibitorFairId: string, memberId: string) {
    const [participation, member] = await Promise.all([
      this.exhibitorFairs.findOne({ where: { id: exhibitorFairId } }),
      this.members.findOne({ where: { id: memberId } }),
    ]);
    if (!participation)
      throw new NotFoundException('Participação não encontrada');
    if (!member) throw new NotFoundException('Integrante não encontrado');
    if (participation.exhibitorId !== member.exhibitorId)
      throw new BadRequestException('Integrante pertence a outro expositor');
    const existing = await this.fairMembers.findOne({
      where: { exhibitorFairId, memberId },
    });
    if (existing) return existing;
    return this.fairMembers.save(
      this.fairMembers.create({
        exhibitorFairId,
        memberId,
        credentialCode: randomUUID(),
        status: ExhibitorCredentialStatus.ACTIVE,
      }),
    );
  }

  async invite(
    exhibitorId: string,
    dto: CreateExhibitorInvitationDto,
    invitedBy: number,
  ) {
    await this.assertExhibitor(exhibitorId);
    const email = dto.email.trim().toLowerCase();
    const rawToken = randomBytes(32).toString('hex');
    const invitation = await this.invitations.save(
      this.invitations.create({
        exhibitorId,
        email,
        role: dto.role,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy,
      }),
    );
    return { ...invitation, tokenHash: undefined, token: rawToken };
  }

  async acceptInvitation(rawToken: string, userId: number) {
    const invitation = await this.invitations.findOne({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (!invitation) throw new NotFoundException('Convite não encontrado');
    if (invitation.status !== ExhibitorInvitationStatus.PENDING)
      throw new ConflictException('Convite já processado');
    if (invitation.expiresAt.getTime() <= Date.now()) {
      invitation.status = ExhibitorInvitationStatus.EXPIRED;
      await this.invitations.save(invitation);
      throw new BadRequestException('Convite expirado');
    }
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.email.toLowerCase() !== invitation.email)
      throw new BadRequestException('O convite pertence a outro e-mail');
    let member = await this.members.findOne({
      where: { exhibitorId: invitation.exhibitorId, email: invitation.email },
    });
    if (!member)
      member = await this.createMember(invitation.exhibitorId, {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: invitation.role,
      });
    member.userId = userId;
    member.role = invitation.role;
    await this.members.save(member);
    invitation.status = ExhibitorInvitationStatus.ACCEPTED;
    await this.invitations.save(invitation);
    return member;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
