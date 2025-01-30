import { SetMetadata } from '@nestjs/common';

export const IsPublicRoute = () => SetMetadata('isPublic', true);
