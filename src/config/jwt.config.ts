import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig: JwtModuleOptions = {
  global: true,
  secret: process.env.JWT_SECRET || 'your-secret-key',
  signOptions: { expiresIn: '1d' },
};
