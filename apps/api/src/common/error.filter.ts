import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const parserStatus = typeof exception === 'object' && exception && 'status' in exception ? exception.status : null;
    const status = exception instanceof HttpException ? exception.getStatus() :
      (parserStatus === 400 || parserStatus === 413 ? parserStatus : 500);
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const structured = typeof body === 'object' && body ? body as Record<string, unknown> : {};
    const requestId = randomUUID();
    if (status >= 500) this.logger.error(`Falha interna; requestId=${requestId}; type=${exception instanceof Error ? exception.name : 'Unknown'}`);
    const defaultMessages: Record<number, string> = {
      400: 'Confira os dados informados.', 401: 'Entre na sua conta para continuar.',
      403: 'Você não tem permissão para esta ação.', 404: 'Recurso não encontrado.',
      409: 'Esta alteração conflita com o estado atual.', 413: 'O arquivo excede o limite permitido.',
      429: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    };
    response.setHeader('Cache-Control', 'no-store');
    response.status(status).json({ error: {
      code: structured.code || (status === 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`),
      message: structured.code && typeof structured.message === 'string' ? structured.message : defaultMessages[status] || 'Não foi possível concluir a ação.',
      requestId,
      ...(Array.isArray(structured.details) ? { details: structured.details } : {}),
    } });
  }
}
