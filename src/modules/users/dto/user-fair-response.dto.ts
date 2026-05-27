export class UserFairResponseDto {
  id: string;
  userId: number;
  fairId: string;
  isActive: boolean;
  role?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  fair?: {
    id: string;
    name: string;
    location: string;
    date: Date | null;
  };
}
