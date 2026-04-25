import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ExceptionBodyShape {
  code?: string;
  message?: string;
  details?: unknown;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const body = this.normalizeBody(
      status,
      exceptionResponse,
      exception.message,
    );

    response.status(status).json({
      success: false,
      error: body,
    });
  }

  private normalizeBody(
    status: number,
    response: string | object,
    fallbackMessage: string,
  ) {
    if (typeof response === 'string') {
      return {
        code: this.getCodeByStatus(status),
        message: response,
      };
    }

    const typedResponse = response as ExceptionBodyShape & {
      message?: string | string[];
    };

    return {
      code: typedResponse.code ?? this.getCodeByStatus(status),
      message:
        Array.isArray(typedResponse.message) && typedResponse.message.length > 0
          ? typedResponse.message[0]
          : (typedResponse.message ?? fallbackMessage),
      ...(typedResponse.details !== undefined
        ? { details: typedResponse.details }
        : {}),
    };
  }

  private getCodeByStatus(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'HTTP_ERROR';
    }
  }
}
