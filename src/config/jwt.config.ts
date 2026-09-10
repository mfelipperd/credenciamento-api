import { JwtModuleOptions } from '@nestjs/jwt';

if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET não configurado — defina essa variável de ambiente antes de subir a aplicação.',
  );
}

export const jwtConfig: JwtModuleOptions = {
  global: true,
  secret: process.env.JWT_SECRET,
  signOptions: { expiresIn: '1d' },
};
