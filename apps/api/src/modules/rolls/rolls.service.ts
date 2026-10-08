import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { characterValuesForDefinitionSchema, systemDefinitionSchema, type CreateDiceRollInput, type DiceRoll, type DiceRollCharacter, type DiceRollOptions, type ListDiceRollsQuery } from '@paralax/contracts';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, type DiceRoll as Row } from '../../generated/prisma/client';
import { campaignAccess, lockCampaign, publicUser, publicUserSelect } from '../campaigns/campaign-access';

function detail(row: Row): DiceRoll {
  return { id: row.id, sessionId: row.sessionId, sequence: row.sequence, requestId: row.requestId, createdAt: row.createdAt.toISOString(),
    actor: row.actor as unknown as DiceRoll['actor'], character: row.character as unknown as DiceRollCharacter | null,
    count: row.count, sides: row.sides, manualModifier: row.manualModifier, modifier: row.modifier, results: row.results, total: row.total };
}
function eligibleCharacters(userId: string, ownerId: string, campaignId: string): Prisma.CharacterWhereInput {
  return { campaignId, ...(ownerId === userId ? { OR: [{ ownerId: userId }, { owner: { campaignMemberships: { some: { campaignId, status: 'ACTIVE' } } } }] } : { ownerId: userId }) };
}

@Injectable()
export class RollsService {
  constructor(private readonly prisma: PrismaService) {}
  private async session(db: Prisma.TransactionClient, userId: string, id: string) {
    const session = await db.gameSession.findFirst({ where: { id, campaign: campaignAccess(userId) }, include: { campaign: { include: { systemVersion: true } } } });
    if (!session) throw new NotFoundException(); return session;
  }
  async options(userId: string, id: string): Promise<DiceRollOptions> {
    return this.prisma.$transaction(async db => {
      const session = await this.session(db, userId, id), campaign = session.campaign;
      // A removed player's character remains in history, but is not a current participant's roll source.
      const where = eligibleCharacters(userId, campaign.ownerId, campaign.id);
      const characters = await db.character.findMany({ where, select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
      return { dice: systemDefinitionSchema.parse(campaign.systemVersion.definition).dice, characters };
    });
  }
  async list(userId: string, id: string, query: ListDiceRollsQuery) {
    return this.prisma.$transaction(async db => {
      await this.session(db, userId, id);
      const rows = await db.diceRoll.findMany({ where: { sessionId: id, ...(query.before ? { sequence: { lt: query.before } } : {}) }, orderBy: { sequence: 'desc' }, take: 21 });
      const items = rows.slice(0, 20); return { items: items.map(detail), nextCursor: rows.length > 20 ? items[items.length - 1].sequence : null };
    });
  }
  async create(userId: string, id: string, input: CreateDiceRollInput): Promise<DiceRoll> {
    return this.prisma.$transaction(async db => {
      const target = await db.gameSession.findUnique({ where: { id }, select: { campaignId: true } }); if (!target) throw new NotFoundException();
      await lockCampaign(db, target.campaignId);
      const session = await this.session(db, userId, id), campaign = session.campaign;
      const existing = await db.diceRoll.findUnique({ where: { sessionId_actorId_requestId: { sessionId: id, actorId: userId, requestId: input.requestId } } });
      if (existing) {
        const original = existing.request as unknown as CreateDiceRollInput;
        if (Object.keys(input).some(key => input[key as keyof CreateDiceRollInput] !== original[key as keyof CreateDiceRollInput])) throw new ConflictException({ code: 'ROLL_REQUEST_CONFLICT', message: 'Esta tentativa já foi usada para outra rolagem. Atualize o histórico antes de iniciar uma nova.' });
        return detail(existing);
      }
      if (session.status !== 'LIVE') throw new ConflictException({ code: 'ROLL_SESSION_NOT_LIVE', message: 'Inicie a sessão para rolar dados. Sessões encerradas conservam apenas o histórico.' });
      const definition = systemDefinitionSchema.parse(campaign.systemVersion.definition);
      if (!definition.dice.includes(input.sides)) throw new BadRequestException({ code: 'ROLL_DIE_NOT_ALLOWED', message: 'Escolha um dado da versão de regras desta campanha.' });
      let character: DiceRollCharacter | null = null;
      if (input.characterId) {
        const row = await db.character.findFirst({ where: { id: input.characterId, ...eligibleCharacters(userId, campaign.ownerId, campaign.id) } });
        if (!row) throw new NotFoundException();
        character = { id: row.id, name: row.name, revision: row.revision, field: null };
        if (input.fieldId) {
          const category = definition.attributes.some(field => field.id === input.fieldId) ? 'attributes' : 'skills';
          const field = definition[category].find(field => field.id === input.fieldId);
          if (!field) throw new BadRequestException({ code: 'ROLL_FIELD_NOT_ALLOWED', message: 'Escolha um atributo ou perícia da ficha desta campanha.' });
          const values = characterValuesForDefinitionSchema(definition).parse(row.values);
          character.field = { id: field.id, name: field.name, category, value: values[category].find(value => value.fieldId === field.id)!.value };
        }
      }
      const actor = publicUser(await db.user.findUniqueOrThrow({ where: { id: userId }, select: publicUserSelect }));
      const latest = await db.diceRoll.findFirst({ where: { sessionId: id }, orderBy: { sequence: 'desc' }, select: { sequence: true } });
      if (latest?.sequence === 2147483647) throw new ConflictException({ code: 'ROLL_LIMIT', message: 'O histórico desta sessão atingiu o limite. Inicie outro encontro.' });
      const results = Array.from({ length: input.count }, () => randomInt(1, input.sides + 1));
      const fieldModifier = character?.field?.value ?? 0, modifier = input.modifier + fieldModifier;
      const saved = await db.diceRoll.create({ data: { sessionId: id, sequence: (latest?.sequence ?? 0) + 1, actorId: userId, requestId: input.requestId,
        request: input, actor, character: character ? { ...character } as unknown as Prisma.InputJsonObject : Prisma.DbNull,
        count: input.count, sides: input.sides, manualModifier: input.modifier, fieldModifier, modifier, results, total: results.reduce((sum, value) => sum + value, modifier) } });
      return detail(saved);
    });
  }
}
