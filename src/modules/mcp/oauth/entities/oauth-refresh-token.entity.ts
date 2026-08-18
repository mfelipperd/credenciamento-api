import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('oauth_refresh_tokens')
export class OAuthRefreshToken {
  @PrimaryColumn()
  tokenHash: string;

  @Column()
  clientId: string;

  @Column()
  userId: number;

  @Column()
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
