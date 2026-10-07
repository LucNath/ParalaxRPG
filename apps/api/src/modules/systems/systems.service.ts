import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { systemDefinitionSchema, type CreateSystemInput, type UpdateSystemInput, type ListSystemsQuery, type SystemDetail, type SystemSummary } from '@paralax/contracts';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';

const ownerSelect = { id: true, username: true, profile: { select: { displayName: true } } } as const;
type SystemRow = Prisma.RpgSystemGetPayload<{ include: { owner: { select: typeof ownerSelect } } }>;
function summary(row: SystemRow): SystemSummary {
  return { id: row.id, name: row.name, description: row.description, visibility: row.visibility, revision: row.revision,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    owner: { id: row.owner.id, username: row.owner.username, displayName: row.owner.profile?.displayName || row.owner.username } };
}

@Injectable()
export class SystemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListSystemsQuery, ownerId?: string) {
    const where: Prisma.RpgSystemWhereInput = {
      ...(ownerId ? { ownerId } : { visibility: 'PUBLIC' }),
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }] } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.rpgSystem.findMany({ where, include: { owner: { select: ownerSelect } }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * 20, take: 20 }),
      this.prisma.rpgSystem.count({ where }),
    ]);
    return { items: rows.map(summary), page: query.page, pageSize: 20, total };
  }

  private async read(db: Prisma.TransactionClient, id: string, ownerId?: string): Promise<SystemDetail> {
    const row = await db.rpgSystem.findFirst({ where: { id, ...(ownerId ? { ownerId } : { visibility: { in: ['PUBLIC', 'UNLISTED'] } }) }, include: { owner: { select: ownerSelect } } });
    if (!row) throw new NotFoundException();
    // Read the immutable version identified by the authorized row, never a newer draft.
    const version = await db.systemVersion.findUniqueOrThrow({ where: { systemId_number: { systemId: row.id, number: row.revision } } });
    return { ...summary(row), versionId: version.id, definition: systemDefinitionSchema.parse(version.definition) };
  }

  detail(id: string, ownerId?: string) { return this.read(this.prisma, id, ownerId); }

  async create(ownerId: string, input: CreateSystemInput) {
    return this.prisma.$transaction(async db => {
      const row = await db.rpgSystem.create({ data: { ownerId, name: input.name, description: input.description, visibility: input.visibility,
        versions: { create: { number: 1, name: input.name, description: input.description, definition: input.definition } } } });
      return this.read(db, row.id, ownerId);
    });
  }

  async update(ownerId: string, id: string, input: UpdateSystemInput) {
    return this.prisma.$transaction(async db => {
      if (!await db.rpgSystem.findFirst({ where: { id, ownerId }, select: { id: true } })) throw new NotFoundException();
      const updated = await db.rpgSystem.updateMany({ where: { id, ownerId, revision: input.expectedRevision },
        data: { name: input.name, description: input.description, visibility: input.visibility, revision: { increment: 1 } } });
      if (!updated.count) throw new ConflictException({ code: 'SYSTEM_REVISION_CONFLICT', message: 'Este sistema foi alterado em outra aba. Recarregue a versão atual antes de salvar.' });
      await db.systemVersion.create({ data: { systemId: id, number: input.expectedRevision + 1, name: input.name, description: input.description, definition: input.definition } });
      return this.read(db, id, ownerId);
    });
  }
}
