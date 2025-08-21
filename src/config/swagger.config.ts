import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('API de Credenciamento')
  .setDescription(
    'API completa para gerenciamento de feiras, credenciamento e finanças',
  )
  .setVersion('1.0.0')
  .addTag('auth', '🔐 Autenticação e autorização')
  .addTag('users', '👤 Gerenciamento de usuários')
  .addTag('fairs', '🏢 Gerenciamento de feiras')
  .addTag('visitors', '👥 Gerenciamento de visitantes')
  .addTag('checkins', '✅ Sistema de check-in')
  .addTag('categories', '🏷️ Categorias de feiras')
  .addTag('sectors', '🏗️ Setores de feiras')
  .addTag('how-did-you-know', '❓ Como conheceu a feira')
  .addTag('dashboard', '📊 Dashboard e relatórios')
  .addTag('emails', '📧 Sistema de emails')
  .addTag('finance', '💰 Módulo financeiro principal')
  .addTag('finance-expenses', '💸 Gerenciamento de despesas')
  .addTag('finance-revenues', '💵 Gerenciamento de receitas')
  .addTag('finance-stands', '🏪 Gerenciamento de stands')
  .addTag('finance-clients', '👥 Gerenciamento de clientes')
  .addTag('finance-cash-flow', '📈 Fluxo de caixa e lucratividade')
  .addTag('finance-categories', '🏷️ Categorias financeiras')
  .addTag('finance-accounts', '🏦 Contas bancárias')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Insira seu token JWT para autenticação',
      in: 'header',
    },
    'JWT-auth',
  )
  .build();

export const swaggerOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
  },
  customSiteTitle: 'API de Credenciamento - Documentação',
};
