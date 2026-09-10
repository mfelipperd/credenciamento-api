import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('EnsureSchema');

/**
 * Aplica alterações de schema aditivas que ainda não têm infra de migration
 * formal no projeto. Idempotente — seguro rodar em todo boot, contra
 * qualquer DATABASE_URL que a instância em execução realmente tiver.
 */
export async function ensureSchema(dataSource: DataSource): Promise<void> {
  const [column] = await dataSource.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'passwordSet'`,
  );

  if (!column) {
    logger.log('Adicionando coluna users.passwordSet...');
    await dataSource.query(
      `ALTER TABLE users ADD COLUMN passwordSet BOOLEAN NOT NULL DEFAULT TRUE`,
    );
  }

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id CHAR(36) PRIMARY KEY,
      userId INT NOT NULL,
      codeHash CHAR(64) NOT NULL,
      type ENUM('first_access', 'password_reset') NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expiresAt DATETIME NOT NULL,
      usedAt DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_password_reset_tokens_lookup (userId, type, usedAt)
    )
  `);
}
