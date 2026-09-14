import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  /**
   * 配置全局管道
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 移除不在DTO中的属性
      transform: true, // 将请求体转换为DTO
      forbidNonWhitelisted: true, // 如果请求体中有不在DTO中的属性，则抛出异常
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
