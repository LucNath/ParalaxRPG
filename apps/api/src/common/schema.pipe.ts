import { BadRequestException, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

export class SchemaPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}
  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Confira os campos informados.',
      details: result.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return result.data;
  }
}
