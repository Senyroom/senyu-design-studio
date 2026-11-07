import 'reflect-metadata';
import { config } from 'dotenv';
import path from 'node:path';
config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  Module,
  ValidationPipe,
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { PublicCache } from './cache';
import {
  ApiController,
  AuthController,
  AdminController,
  FileController,
  DbService,
  AuthService,
  AuthGuard,
  ContentService,
} from './site';
@Catch()
class Errors implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    if (error instanceof ZodError)
      return response.status(400).json({ message: error.issues.map((i) => i.message).join('；') });
    if (error instanceof HttpException)
      return response.status(error.getStatus()).json({ message: error.message });
    if (error?.code === 'P2002')
      return response.status(409).json({ message: '账号或 slug 已存在' });
    if (error?.code === 'P2003')
      return response.status(409).json({ message: '该分类仍被文章使用，无法删除' });
    if (error?.code === 'P2025')
      return response.status(404).json({ message: '内容不存在或已被移除' });
    if (error?.code === 'P2034')
      return response.status(409).json({ message: '内容正在被更新，请刷新后重试' });
    console.error(error);
    return response.status(500).json({ message: '操作未完成，请检查服务日志后重试' });
  }
}
@Module({
  controllers: [ApiController, AuthController, AdminController, FileController],
  providers: [DbService, AuthService, AuthGuard, ContentService, PublicCache],
})
class AppModule {}
async function main() {
  if (!process.env.DATABASE_URL || !process.env.REVALIDATE_SECRET) throw new Error('先配置 .env');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '1mb' });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.useGlobalFilters(new Errors());
  app.enableCors({
    origin: [process.env.WEB_ORIGIN!, process.env.ADMIN_ORIGIN!],
    credentials: true,
  });
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('个人网站 API')
        .setVersion('1.0')
        .addCookieAuth('site_session')
        .build(),
    ),
  );
  await app.listen(Number(process.env.PORT || 4000), process.env.HOST || '127.0.0.1');
  console.log('API ready: http://127.0.0.1:4000/api/docs');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
