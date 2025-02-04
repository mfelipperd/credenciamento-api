import { User } from './modules/users/entitie/users.entity';

declare global {
  interface Request {
    user: User;
  }
}
