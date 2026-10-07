import { Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { NotFoundException } from '@nestjs/common';
import { updateProfileSchema, type UpdateProfileInput } from '@paralax/contracts';
import type { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { SchemaPipe } from '../../common/schema.pipe';
import { AuthIdentity, Identity, Public } from '../auth/auth.decorators';
import { currentProfile, currentUserSelect, publicProfile, publicUserSelect } from './profile.mapper';
import { AvatarService } from './avatar.service';

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
    await this.prisma.profile.update({ where: { userId: identity.userId }, data: input });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: identity.userId }, select: currentUserSelect });
    return currentProfile(user);
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
