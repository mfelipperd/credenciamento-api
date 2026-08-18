import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('oauth_clients')
export class OAuthClient {
  @PrimaryColumn()
  clientId: string;

  @Column({ nullable: true })
  clientName: string;

  @Column('simple-json')
  redirectUris: string[];

  @CreateDateColumn()
  createdAt: Date;
}
