import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('oauth_authorization_codes')
export class OAuthAuthorizationCode {
  @PrimaryColumn()
  code: string;

  @Column()
  clientId: string;

  @Column()
  userId: number;

  @Column()
  redirectUri: string;

  @Column()
  codeChallenge: string;

  @Column({ default: 'S256' })
  codeChallengeMethod: string;

  @Column({ nullable: true })
  resource: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
