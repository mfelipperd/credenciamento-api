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

  await ensureStandOnlineCheckoutSchema(dataSource);
}

/**
 * Schema para a reserva de stand com pagamento online (expositor auto-atendido
 * via Mercado Pago): vínculo stand↔tipo, hold temporário, conta de acesso do
 * expositor e o ciclo de vida do pagamento.
 */
async function ensureStandOnlineCheckoutSchema(
  dataSource: DataSource,
): Promise<void> {
  const standColumns: Array<[string, string]> = [
    ['stand_configuration_id', 'VARCHAR(36) NULL'],
    ['held_until', 'DATETIME NULL'],
    ['held_by_reservation_id', 'VARCHAR(36) NULL'],
  ];

  for (const [columnName, definition] of standColumns) {
    const [column] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'stands' AND column_name = ?`,
      [columnName],
    );
    if (!column) {
      logger.log(`Adicionando coluna stands.${columnName}...`);
      await dataSource.query(
        `ALTER TABLE stands ADD COLUMN ${columnName} ${definition}`,
      );
    }
  }

  const [floorPlanColumn] = await dataSource.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'fairs' AND column_name = 'floorPlanUrl'`,
  );
  if (!floorPlanColumn) {
    logger.log('Adicionando coluna fairs.floorPlanUrl...');
    await dataSource.query(
      `ALTER TABLE fairs ADD COLUMN floorPlanUrl VARCHAR(500) NULL`,
    );
  }

  const [standConfigFk] = await dataSource.query(
    `SELECT constraint_name FROM information_schema.table_constraints
     WHERE table_schema = DATABASE() AND table_name = 'stands'
       AND constraint_name = 'fk_stands_stand_configuration'`,
  );
  if (!standConfigFk) {
    logger.log('Adicionando FK stands.stand_configuration_id...');
    await dataSource.query(`
      ALTER TABLE stands ADD CONSTRAINT fk_stands_stand_configuration
        FOREIGN KEY (stand_configuration_id) REFERENCES stand_configurations(id) ON DELETE SET NULL
    `);
  }

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS exhibitor_accounts (
      id VARCHAR(36) PRIMARY KEY,
      exhibitorId VARCHAR(36) NOT NULL,
      email VARCHAR(255) NOT NULL,
      passwordHash VARCHAR(255) NULL,
      passwordSet BOOLEAN NOT NULL DEFAULT FALSE,
      isVerified BOOLEAN NOT NULL DEFAULT FALSE,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_exhibitor_accounts_exhibitor FOREIGN KEY (exhibitorId) REFERENCES exhibitors(id) ON DELETE CASCADE,
      UNIQUE INDEX idx_exhibitor_accounts_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  // Conta já existia antes do fluxo de primeiro-acesso pós-pagamento:
  // reconcilia passwordHash pra nullable e garante a coluna passwordSet.
  const [passwordHashColumn] = await dataSource.query(
    `SELECT is_nullable AS isNullable FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'exhibitor_accounts' AND column_name = 'passwordHash'`,
  );
  if (passwordHashColumn && passwordHashColumn.isNullable === 'NO') {
    logger.log('Tornando exhibitor_accounts.passwordHash opcional...');
    await dataSource.query(
      `ALTER TABLE exhibitor_accounts MODIFY COLUMN passwordHash VARCHAR(255) NULL`,
    );
  }

  const [passwordSetColumn] = await dataSource.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'exhibitor_accounts' AND column_name = 'passwordSet'`,
  );
  if (!passwordSetColumn) {
    logger.log('Adicionando coluna exhibitor_accounts.passwordSet...');
    await dataSource.query(
      `ALTER TABLE exhibitor_accounts ADD COLUMN passwordSet BOOLEAN NOT NULL DEFAULT FALSE`,
    );
    // Contas criadas antes dessa coluna existir já tinham senha própria (fluxo antigo de auto-cadastro)
    await dataSource.query(
      `UPDATE exhibitor_accounts SET passwordSet = TRUE WHERE passwordHash IS NOT NULL`,
    );
  }

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS exhibitor_password_reset_tokens (
      id VARCHAR(36) PRIMARY KEY,
      exhibitorAccountId VARCHAR(36) NOT NULL,
      codeHash CHAR(64) NOT NULL,
      type ENUM('first_access', 'password_reset') NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expiresAt DATETIME NOT NULL,
      usedAt DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_exhibitor_password_reset_tokens_account FOREIGN KEY (exhibitorAccountId) REFERENCES exhibitor_accounts(id) ON DELETE CASCADE,
      INDEX idx_exhibitor_password_reset_tokens_lookup (exhibitorAccountId, type, usedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS stand_reservation_payments (
      id VARCHAR(36) PRIMARY KEY,
      standId INT NOT NULL,
      exhibitorAccountId VARCHAR(36) NOT NULL,
      fairId VARCHAR(36) NOT NULL,
      paymentMethod ENUM('PIX', 'BOLETO', 'CARTAO', 'TED', 'DINHEIRO') NOT NULL,
      status ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
      installments INT NOT NULL DEFAULT 1,
      amountCents BIGINT NOT NULL,
      interestCents BIGINT NOT NULL DEFAULT 0,
      mpPaymentId VARCHAR(64) NULL,
      mpPreferenceId VARCHAR(64) NULL,
      pixQrCode TEXT NULL,
      pixQrCodeBase64 LONGTEXT NULL,
      pixCopyPaste TEXT NULL,
      boletoUrl VARCHAR(512) NULL,
      boletoBarcode VARCHAR(128) NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_stand_reservation_payments_stand FOREIGN KEY (standId) REFERENCES stands(id) ON DELETE CASCADE,
      CONSTRAINT fk_stand_reservation_payments_exhibitor_account FOREIGN KEY (exhibitorAccountId) REFERENCES exhibitor_accounts(id) ON DELETE CASCADE,
      CONSTRAINT fk_stand_reservation_payments_fair FOREIGN KEY (fairId) REFERENCES fairs(id) ON DELETE CASCADE,
      UNIQUE INDEX idx_stand_reservation_payments_mp_payment (mpPaymentId),
      INDEX idx_stand_reservation_payments_stand (standId, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
}
