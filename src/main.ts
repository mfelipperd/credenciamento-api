// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { swaggerConfig, swaggerOptions } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Servir uploads de arquivos estáticos locais
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });


  // Habilita CORS apenas para o frontend em dev
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://credenciamento-frontend.vercel.app',
      'https://www.expomultimix.com',
      'https://www.expomultimix.com.br',
      'https://expo-mm-site.vercel.app',
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-frontend-auth'],
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
