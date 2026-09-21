import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FairsService } from 'src/modules/fairs/fairs.service';
import { StandConfigurationService } from 'src/modules/fairs/stand-configuration.service';
import { StandsService } from 'src/modules/finance/stands/stands.service';
import { EntryModelsService } from 'src/modules/finance/entry-models/entry-models.service';
import { EntryModel } from 'src/modules/finance/entry-models/entities/entry-model.entity';
import { FairStatus } from 'src/modules/fairs/entity/fair.entity';
import { UpdateFairDto } from 'src/modules/fairs/dto/update-fair.dto';
import { McpRequestUser } from '../oauth/mcp-auth.guard';
import {
  textResult,
  registerToolWithInput,
  assertAdmin,
  assertFairAccess,
} from './common';
import {
  MAX_NUMBERED_STANDS,
  STAND_NUMBERS_SPEC,
  formatStandNumbers,
  parseStandNumbers,
} from './stand-numbers';

function toEntryModelSummary(model: EntryModel) {
  return {
    id: model.id,
    name: model.name,
    type: model.type,
    baseValueCents: model.baseValue,
    costCents: model.costCents,
  };
}

function isValidIsoDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

// new Date('YYYY-MM-DD') é meia-noite UTC, e o TypeORM formata colunas `date`
// com os getters locais: em fuso negativo (ex: Manaus) o dia recuaria um.
function toLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'use o formato YYYY-MM-DD')
  .refine(isValidIsoDate, 'data inexistente no calendário');

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'use o formato HH:mm');

const daySchedulesSchema = z
  .array(
    z.object({
      date: isoDateSchema.describe('dia da programação (YYYY-MM-DD)'),
      startTime: timeSchema.describe('abertura nesse dia (HH:mm)'),
      endTime: timeSchema.describe('encerramento nesse dia (HH:mm)'),
      note: z.string().min(1).max(255).optional().describe('observação do dia'),
    }),
  )
  .describe(
    'horários por dia — só informe quando diferirem de startTime/endTime',
  );

const standTypeSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .describe('nome do tipo, único dentro da feira. Ex: "Stand 3x3"'),
  width: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe('largura em metros (inteiro)'),
  height: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe('profundidade em metros (inteiro)'),
  quantity: z
    .number()
    .int()
    .min(0)
    .describe('quantos stands desse tipo existem na feira'),
  pricePerSquareMeter: z
    .number()
    .min(0)
    .describe(
      'preço de venda por m² em reais — o total do stand é largura × altura × esse valor',
    ),
  setupCostPerSquareMeter: z
    .number()
    .min(0)
    .describe('custo de montagem por m² em reais'),
  anchorPrice: z
    .number()
    .min(0)
    .optional()
    .describe(
      'valor de mercado (âncora) do stand inteiro, exibido riscado no site',
    ),
  description: z
    .string()
    .min(1)
    .optional()
    .describe('descrição do tipo de stand'),
});

const fairFields = {
  edition: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .describe('edição. Ex: "ExpoMultimix 2027"'),
  description: z
    .string()
    .min(1)
    .optional()
    .describe('descrição curta exibida no site e nos e-mails'),
  bannerUrl: z
    .string()
    .url()
    .max(500)
    .optional()
    .describe('URL da imagem de capa'),
  floorPlanUrl: z
    .string()
    .min(1)
    .max(500)
    .optional()
    .describe(
      'caminho ou URL da planta SVG do pavilhão. Ex: /floor-plans/manaus-2027.svg. Essa tool não envia o arquivo: ' +
        'o SVG já precisa estar publicado no site (expo-mm-site/public/floor-plans/), com cada stand num grupo id="stand_N"',
    ),
  status: z
    .nativeEnum(FairStatus)
    .optional()
    .describe('upcoming (padrão), ongoing, ended ou cancelled'),
  venueName: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('nome do local. Ex: "Centro de Convenções Vasco Vasques"'),
  address: z.string().min(1).max(255).optional().describe('logradouro'),
  number: z.string().min(1).max(20).optional().describe('número do endereço'),
  complement: z.string().min(1).max(100).optional(),
  neighborhood: z.string().min(1).max(100).optional().describe('bairro'),
  city: z.string().min(1).max(100).optional(),
  state: z
    .string()
    .regex(/^[A-Z]{2}$/, 'UF em 2 letras maiúsculas, ex: AM')
    .optional()
    .describe('UF em 2 letras maiúsculas'),
  zipCode: z.string().min(8).max(10).optional().describe('CEP'),
  country: z.string().min(1).max(50).optional(),
  googleMapsUrl: z
    .string()
    .min(1)
    .max(500)
    .optional()
    .describe('link do Google Maps pro local'),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe('latitude do local (habilita links Uber/99/Waze)'),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe('longitude do local'),
  startDate: isoDateSchema
    .optional()
    .describe('primeiro dia da feira (YYYY-MM-DD)'),
  endDate: isoDateSchema
    .optional()
    .describe('último dia da feira (YYYY-MM-DD)'),
  startTime: timeSchema
    .optional()
    .describe('horário padrão de abertura (HH:mm)'),
  endTime: timeSchema
    .optional()
    .describe('horário padrão de encerramento (HH:mm)'),
  daySchedules: daySchedulesSchema.optional(),
  expectedVisitors: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('meta de visitantes'),
  expectedExhibitors: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('meta de expositores/marcas'),
};

export function registerFairSetupTools(
  server: McpServer,
  fairsService: FairsService,
  standConfigurationService: StandConfigurationService,
  standsService: StandsService,
  entryModelsService: EntryModelsService,
  user: McpRequestUser,
) {
  registerToolWithInput(
    server,
    'create_fair',
    'Cadastra uma feira completa de uma vez: dados gerais, local, datas e horários, planta e os tipos de stand com preço ' +
      'e quantidade. Só administrador. Antes de chamar: use list_fairs pra conferir que a feira ainda não existe e peça ao ' +
      'usuário qualquer dado obrigatório que faltar (location e, em cada tipo de stand, medidas, quantidade, preço por m² e ' +
      'custo de montagem por m²) — não invente valores. Datas: startDate/endDate (YYYY-MM-DD) e o horário padrão em ' +
      'startTime/endTime (HH:mm); use daySchedules só quando o horário mudar de um dia pro outro. standTypes: cada item ' +
      'vira um tipo de stand (ex: "Stand 3x3"). O preço é POR m²: o total do stand é largura × altura × pricePerSquareMeter ' +
      '(ex: 3x3 a R$ 6.984,00 → pricePerSquareMeter 776) — confira o totalPrice devolvido contra o que o usuário pediu. A ' +
      'soma das quantidades vira o totalStands da feira e cria os stands numerados de 1 a N (usados no mapa de reserva). ' +
      'floorPlanUrl aponta pra planta SVG, mas essa tool não envia o arquivo. Depois de criar, use assign_stands_to_type ' +
      '(quais números da planta são de cada tipo) e link_stand_type_entry_model (uma vez por tipo) — sem os dois a ' +
      'reserva online pela planta não funciona. Se der erro depois da feira criada, a mensagem traz o id: não chame ' +
      'create_fair de novo.',
    {
      name: z
        .string()
        .min(1)
        .max(255)
        .describe('nome da feira. Ex: "Expo MultiMix 2027 Manaus"'),
      location: z
        .string()
        .min(1)
        .max(255)
        .describe(
          'localização em texto livre (campo legado obrigatório). Ex: "Centro de Convenções Vasco Vasques - Manaus/AM"',
        ),
      ...fairFields,
      standTypes: z
        .array(standTypeSchema)
        .optional()
        .describe('tipos de stand da feira, com preço e quantidade'),
    },
    async ({ standTypes, startDate, endDate, ...fairData }) => {
      assertAdmin(user);

      const types = standTypes ?? [];
      const names = types.map((type) => type.name);
      if (new Set(names).size !== names.length) {
        throw new Error(
          'standTypes tem nomes repetidos — cada tipo precisa de um nome único dentro da feira.',
        );
      }

      const totalStands = types.reduce((sum, type) => sum + type.quantity, 0);
      if (totalStands > MAX_NUMBERED_STANDS) {
        throw new Error(
          `A soma das quantidades (${totalStands}) passa do limite de ${MAX_NUMBERED_STANDS} stands por feira.`,
        );
      }

      const created = await fairsService.createFair({
        ...fairData,
        ...(startDate ? { startDate: toLocalDate(startDate) } : {}),
        ...(endDate ? { endDate: toLocalDate(endDate) } : {}),
        ...(types.length > 0 ? { totalStands } : {}),
      });

      try {
        for (const type of types) {
          await standConfigurationService.create(type, created.id);
        }
        if (totalStands > 0) {
          await standsService.configureFairStands({
            fairId: created.id,
            totalStands,
          });
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
          `A feira foi criada (id ${created.id}), mas o cadastro dos stands falhou: ${reason}. ` +
            'Não chame create_fair de novo — a feira já existe; finalize os stands pela tela de feiras do sistema.',
        );
      }

      return textResult({
        fair: await fairsService.findOne(created.id),
        numberedStands: totalStands,
      });
    },
    {
      title: 'Cadastrar feira',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
  );

  registerToolWithInput(
    server,
    'update_fair',
    'Atualiza dados de uma feira existente. Só administrador. Envie apenas os campos que mudam — por exemplo floorPlanUrl ' +
      'quando a planta chegar depois do cadastro, ou ajustes de datas, horários e local. Se enviar daySchedules, a ' +
      'programação por dia atual é substituída por completo. Não altera tipos de stand nem os stands numerados.',
    {
      fairId: z.string().describe('id da feira, obtido via list_fairs'),
      name: z.string().min(1).max(255).optional().describe('nome da feira'),
      location: z
        .string()
        .min(1)
        .max(255)
        .optional()
        .describe('localização em texto livre (campo legado)'),
      ...fairFields,
    },
    async ({ fairId, startDate, endDate, ...fairData }) => {
      assertAdmin(user);

      const dto: UpdateFairDto = {
        ...fairData,
        ...(startDate ? { startDate: toLocalDate(startDate) } : {}),
        ...(endDate ? { endDate: toLocalDate(endDate) } : {}),
      };

      return textResult(await fairsService.update(fairId, dto));
    },
    {
      title: 'Atualizar feira',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
    },
  );

  registerToolWithInput(
    server,
    'list_stand_types',
    'Lista os tipos de stand de uma feira com preço, quantidade, vínculo financeiro (entryModelId; null = ainda sem ' +
      'vínculo) e quais stands numerados da planta já pertencem a cada tipo. Os ids daqui alimentam assign_stands_to_type ' +
      'e link_stand_type_entry_model. unassignedStandNumbers são os stands numerados que ainda não têm tipo.',
    { fairId: z.string().describe('id da feira, obtido via list_fairs') },
    async ({ fairId }) => {
      assertFairAccess(user, fairId);

      const [standTypes, stands] = await Promise.all([
        standConfigurationService.findAllByFair(fairId),
        standsService.getPublicStandMap(fairId),
      ]);

      const numbersByType = new Map<string, number[]>();
      const unassigned: number[] = [];
      for (const stand of stands) {
        if (!stand.standConfigurationId) {
          unassigned.push(stand.standNumber);
          continue;
        }
        const numbers = numbersByType.get(stand.standConfigurationId) ?? [];
        numbers.push(stand.standNumber);
        numbersByType.set(stand.standConfigurationId, numbers);
      }

      const sortAscending = (numbers: number[]) =>
        [...numbers].sort((a, b) => a - b);

      return textResult({
        totalNumberedStands: stands.length,
        unassignedStandNumbers: formatStandNumbers(sortAscending(unassigned)),
        standTypes: standTypes.map((type) => {
          const numbers = numbersByType.get(type.id) ?? [];
          return {
            id: type.id,
            name: type.name,
            width: type.width,
            height: type.height,
            quantity: type.quantity,
            pricePerSquareMeter: type.pricePerSquareMeter,
            totalPrice: type.totalPrice,
            anchorPrice: type.anchorPrice,
            isActive: type.isActive,
            entryModelId: type.entryModelId,
            assignedStands: numbers.length,
            standNumbers: formatStandNumbers(sortAscending(numbers)),
          };
        }),
      });
    },
    { title: 'Listar tipos de stand', readOnlyHint: true },
  );

  registerToolWithInput(
    server,
    'assign_stands_to_type',
    'Define o tipo (e portanto o preço) dos stands numerados da planta. Só administrador. Informe os números como lista ' +
      'e/ou faixas: "1-40" ou "1-10, 15, 20-25". Sem esse vínculo a reserva online recusa o stand ("sem tipo/preço ' +
      'configurado"). Números inexistentes dão erro — os stands numerados vão de 1 até a soma das quantidades criada em ' +
      'create_fair. Stands já vendidos ou em reserva não trocam de tipo; os demais podem ser reatribuídos. Depois, ' +
      'confira em list_stand_types se assignedStands de cada tipo bate com a quantity e se unassignedStandNumbers ficou vazio.',
    {
      standTypeId: z
        .string()
        .describe('id do tipo de stand, obtido via list_stand_types'),
      standNumbers: z
        .string()
        .regex(
          STAND_NUMBERS_SPEC,
          'use lista e/ou faixas, ex: "1-40" ou "1-10, 15, 20-25"',
        )
        .describe(
          'números dos stands na planta. Ex: "1-40" ou "1-10, 15, 20-25"',
        ),
    },
    async ({ standTypeId, standNumbers }) => {
      assertAdmin(user);

      const numbers = parseStandNumbers(standNumbers);
      const standType = await standConfigurationService.findOne(standTypeId);
      const { assigned } = await standsService.assignStandConfiguration(
        standTypeId,
        numbers,
      );

      return textResult({
        standType: standType.name,
        quantity: standType.quantity,
        assigned,
        standNumbers: formatStandNumbers(numbers),
      });
    },
    {
      title: 'Atribuir stands a um tipo',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
    },
  );

  registerToolWithInput(
    server,
    'list_entry_models',
    'Lista os modelos de lançamento financeiro ativos de uma feira (valores em centavos). Só os do tipo STAND podem ser ' +
      'vinculados a um tipo de stand com link_stand_type_entry_model.',
    { fairId: z.string().describe('id da feira, obtido via list_fairs') },
    async ({ fairId }) => {
      assertFairAccess(user, fairId);
      const models = await entryModelsService.findAll(fairId);
      return textResult(models.map(toEntryModelSummary));
    },
    { title: 'Listar modelos de lançamento', readOnlyHint: true },
  );

  registerToolWithInput(
    server,
    'link_stand_type_entry_model',
    'Vincula um tipo de stand ao modelo de lançamento financeiro — é o que permite à reserva online lançar a receita ' +
      'quando o pagamento é aprovado. Só administrador. Com entryModelId: usa esse modelo (precisa ser STAND, ativo e da ' +
      'mesma feira; veja list_entry_models). Sem entryModelId: reaproveita o modelo STAND ativo da feira com o mesmo nome ' +
      'do tipo ou, se não existir, cria um com o nome, o preço total e o custo de montagem do tipo. Sem entryModelId num ' +
      'tipo já vinculado nada muda (outcome already_linked). Ao reaproveitar um modelo existente, confira o baseValueCents ' +
      'devolvido contra o totalPrice do tipo.',
    {
      standTypeId: z
        .string()
        .describe('id do tipo de stand, obtido via list_stand_types'),
      entryModelId: z
        .string()
        .optional()
        .describe(
          'id do modelo de lançamento (list_entry_models). Omita pra reaproveitar por nome ou criar um novo',
        ),
    },
    async ({ standTypeId, entryModelId }) => {
      assertAdmin(user);

      if (entryModelId) {
        const standType = await standConfigurationService.linkEntryModel(
          standTypeId,
          entryModelId,
        );
        const entryModel = await entryModelsService.findOne(entryModelId);
        return textResult({
          outcome: 'linked_existing',
          standType: {
            id: standType.id,
            name: standType.name,
            totalPrice: standType.totalPrice,
          },
          entryModel: toEntryModelSummary(entryModel),
        });
      }

      const { standConfiguration, entryModel, outcome } =
        await standConfigurationService.linkMatchingEntryModel(standTypeId);
      return textResult({
        outcome,
        standType: {
          id: standConfiguration.id,
          name: standConfiguration.name,
          totalPrice: standConfiguration.totalPrice,
        },
        entryModel: toEntryModelSummary(entryModel),
      });
    },
    {
      title: 'Vincular tipo de stand ao modelo financeiro',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
    },
  );
}
