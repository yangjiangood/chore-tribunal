import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../src/common/http/http-exception.filter';

export function configureTestApp(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: '请求参数不合法',
          details: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints ?? {},
          })),
        }),
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  return app;
}
