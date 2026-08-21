import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EUserRole } from '../../enum/role';
import {
  AcceptExhibitorInvitationDto,
  CreateExhibitorDto,
  CreateExhibitorFairDto,
  CreateExhibitorInvitationDto,
  CreateExhibitorMemberDto,
  LinkFinanceClientDto,
} from './exhibitors.dto';
import { ExhibitorsService } from './exhibitors.service';

@ApiTags('exhibitors')
@ApiBearerAuth('JWT-auth')
@Controller('exhibitors')
export class ExhibitorsController {
  constructor(private readonly service: ExhibitorsService) {}

  @Get()
  list(@Request() req) {
    this.assertAdmin(req);
    return this.service.listExhibitors();
  }

  @Post()
  create(@Body() dto: CreateExhibitorDto, @Request() req) {
    this.assertAdmin(req);
    return this.service.createExhibitor(dto);
  }

  @Get('me/organizations')
  @ApiOperation({
    summary: 'Listar empresas às quais o usuário autenticado pertence',
  })
  listMine(@Request() req) {
    return this.service.listMyOrganizations(req.user.id);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Aceitar convite de acesso a um expositor' })
  accept(@Body() dto: AcceptExhibitorInvitationDto, @Request() req) {
    return this.service.acceptInvitation(dto.token, req.user.id);
  }

  @Post(':exhibitorId/finance-clients')
  linkFinanceClient(
    @Param('exhibitorId', ParseUUIDPipe) exhibitorId: string,
    @Body() dto: LinkFinanceClientDto,
    @Request() req,
  ) {
    this.assertAdmin(req);
    return this.service.linkFinanceClient(exhibitorId, dto.clientId);
  }

  @Get(':exhibitorId/team')
  listTeam(
    @Param('exhibitorId', ParseUUIDPipe) exhibitorId: string,
    @Request() req,
  ) {
    this.assertAdmin(req);
    return this.service.listTeam(exhibitorId);
  }

  @Post(':exhibitorId/team')
  createMember(
    @Param('exhibitorId', ParseUUIDPipe) exhibitorId: string,
    @Body() dto: CreateExhibitorMemberDto,
    @Request() req,
  ) {
    this.assertAdmin(req);
    return this.service.createMember(exhibitorId, dto);
  }

  @Get(':exhibitorId/fairs')
  listFairs(
    @Param('exhibitorId', ParseUUIDPipe) exhibitorId: string,
    @Request() req,
  ) {
    this.assertAdmin(req);
    return this.service.listParticipations(exhibitorId);
  }

  @Post(':exhibitorId/fairs')
  createFair(
    @Param('exhibitorId', ParseUUIDPipe) exhibitorId: string,
    @Body() dto: CreateExhibitorFairDto,
    @Request() req,
  ) {
    this.assertAdmin(req);
    return this.service.createParticipation(exhibitorId, dto);
  }

  @Post('fairs/:participationId/members/:memberId')
  addMemberToFair(
    @Param('participationId', ParseUUIDPipe) participationId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Request() req,
  ) {
    this.assertAdmin(req);
    return this.service.addMemberToFair(participationId, memberId);
  }

  @Post(':exhibitorId/invitations')
  invite(
    @Param('exhibitorId', ParseUUIDPipe) exhibitorId: string,
    @Body() dto: CreateExhibitorInvitationDto,
    @Request() req,
  ) {
    this.assertAdmin(req);
    return this.service.invite(exhibitorId, dto, req.user.id);
  }

  private assertAdmin(req: any): void {
    if (req.user.role !== EUserRole.ADMIN) {
      throw new ForbiddenException(
        'Apenas administradores podem executar esta ação',
      );
    }
  }
}
