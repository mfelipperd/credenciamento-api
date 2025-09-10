// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig, swaggerOptions } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita CORS apenas para o frontend em dev
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://credenciamento-frontend.vercel.app',
      'https://www.expomultimix.com',
    ],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-frontend-auth', // ← ADICIONAR ESTE HEADER
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Configuração do Swagger
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, swaggerOptions);

  const port = process.env.PORT || 8000;
  console.log(`🚀 API rodando em: http://localhost:${port}`);
  console.log(`📚 Documentação Swagger: http://localhost:${port}/api`);
  await app.listen(port);
}
bootstrap().catch((error) => {
  console.error('Erro ao inicializar a aplicação:', error);
  process.exit(1);
});
