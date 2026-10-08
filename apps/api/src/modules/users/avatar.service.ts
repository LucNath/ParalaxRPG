import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { del, get, put } from '@vercel/blob';
import { projectRoot } from '../../common/environment';
import { PrismaService } from '../../database/prisma.service';
import { grantIdentity } from './achievements';

@Injectable()
export class AvatarService {
  private readonly directory: string;
  private readonly blob: boolean;
  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.directory = resolve(projectRoot(), config.getOrThrow<string>('UPLOAD_DIR'), 'avatars');
    this.blob = config.getOrThrow<string>('AVATAR_STORAGE') === 'vercel-blob';
  }
  async upload(userId: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException({ code: 'INVALID_AVATAR', message: 'Selecione uma imagem PNG, JPEG ou WebP.' });
    let output: Buffer;
    try {
      const metadata = await sharp(file.buffer, { limitInputPixels: 20000000 }).metadata();
      if (!['png', 'jpeg', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) throw new Error('Invalid format');
      output = await sharp(file.buffer, { limitInputPixels: 20000000 }).rotate().resize(256, 256, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
    } catch { throw new BadRequestException({ code: 'INVALID_AVATAR', message: 'Use uma imagem PNG, JPEG ou WebP válida, sem animação.' }); }
    const key = `${randomUUID()}.webp`;
    if (this.blob) {
      await put(`avatars/${key}`, output, { access: 'private', addRandomSuffix: false, contentType: 'image/webp' });
    } else {
      await mkdir(this.directory, { recursive: true });
      await writeFile(resolve(this.directory, key), output, { flag: 'wx' });
    }
    try {
      // Old avatars are kept until a retention policy is chosen; concurrent saves cannot delete the winning image.
      await this.prisma.$transaction(async db => {
        await db.profile.update({ where: { userId }, data: { avatarKey: key } });
        await grantIdentity(db, userId);
      });
    } catch (error) {
      if (this.blob) await del(`avatars/${key}`).catch(() => undefined);
      else await unlink(resolve(this.directory, key)).catch(() => undefined);
      throw error;
    }
    return { avatarUrl: `/api/v1/avatars/${key}` };
  }
  async read(key: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/.test(key)) throw new NotFoundException();
    if (this.blob) {
      const file = await get(`avatars/${key}`, { access: 'private' });
      if (!file || file.statusCode !== 200) throw new NotFoundException();
      return Buffer.from(await new Response(file.stream).arrayBuffer());
    }
    try { return await readFile(resolve(this.directory, key)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new NotFoundException();
      throw error;
    }
  }
}
