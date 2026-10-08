import { Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { profileCosmetics, updateProfileSchema, type UpdateProfileInput } from '@paralax/contracts';
import type { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { SchemaPipe } from '../../common/schema.pipe';
import { AuthIdentity, Identity, Public } from '../auth/auth.decorators';
import { currentProfile, currentUserSelect, publicProfile, publicUserSelect } from './profile.mapper';
import { AvatarService } from './avatar.service';
import { achievements, cosmetics, ensureCosmeticAccess, grantIdentity } from './achievements';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService, private readonly avatars: AvatarService) {}
  @Get('me')
  async me(@Identity() identity: AuthIdentity, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    const user = await this.prisma.user.findUnique({ where: { id: identity.userId }, select: currentUserSelect });
    if (!user) throw new NotFoundException();
    return currentProfile(user);
  }
  @Patch('me')
  async update(@Identity() identity: AuthIdentity, @Body(new SchemaPipe(updateProfileSchema)) input: UpdateProfileInput,
    @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.prisma.$transaction(async db => {
      if (input.backgroundId != null || input.avatarFrameId != null) await ensureCosmeticAccess(db, identity.userId);
      for (const [field, category] of [['backgroundId', 'BACKGROUND'], ['avatarFrameId', 'AVATAR_FRAME']] as const) {
        const id = input[field];
        if (id != null && (!profileCosmetics.some(item => item.id === id && item.category === category)
          || !await db.userCosmetic.findUnique({ where: { userId_cosmeticId: { userId: identity.userId, cosmeticId: id } } })))
          throw new BadRequestException({ code: 'COSMETIC_UNAVAILABLE', message: 'Escolha um item desbloqueado da categoria correta.' });
      }
      await db.profile.update({ where: { userId: identity.userId }, data: input });
      await grantIdentity(db, identity.userId);
      return currentProfile(await db.user.findUniqueOrThrow({ where: { id: identity.userId }, select: currentUserSelect }));
    });
  }
  @Get('me/achievements')
  async achievements(@Identity() identity: AuthIdentity, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return achievements(this.prisma, identity.userId);
  }
  @Get('me/cosmetics')
  async cosmetics(@Identity() identity: AuthIdentity, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.prisma.$transaction(db => cosmetics(db, identity.userId));
  }
  @Post('me/avatar')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  async avatar(@Identity() identity: AuthIdentity, @UploadedFile() file: Express.Multer.File,
    @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.avatars.upload(identity.userId, file);
  }
  @Public()
  @Get(':username')
  async profile(@Param('username') username: string) {
    const user = await this.prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: publicUserSelect });
    if (!user) throw new NotFoundException();
    return publicProfile(user);
  }
}

@Public()
@Controller('avatars')
export class AvatarsController {
  constructor(private readonly avatars: AvatarService) {}
  @Get(':key')
  async image(@Param('key') key: string, @Res({ passthrough: true }) response: Response) {
    const image = await this.avatars.read(key);
    response.setHeader('Cache-Control', 'public, max-age=86400');
    return new StreamableFile(image, { type: 'image/webp' });
  }
}
