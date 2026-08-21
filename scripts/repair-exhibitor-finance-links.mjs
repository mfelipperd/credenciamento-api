import 'dotenv/config';
import { writeFileSync } from 'fs';
import mysql from 'mysql2/promise';

const url = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;
if (!url) throw new Error('Conexão com o banco não configurada.');
const db = await mysql.createConnection(url);

try {
  const [allRows] = await db.query('SELECT * FROM exhibitor_finance_clients ORDER BY createdAt, id');
  const invalidRows = allRows.filter((row) => !row.exhibitorId || !row.clientId);
  const validRows = allRows.filter((row) => row.exhibitorId && row.clientId);
  if (invalidRows.length !== 178) throw new Error(`Esperados 178 vínculos vazios; encontrados ${invalidRows.length}.`);
  if (validRows.length !== 178) throw new Error(`Esperados 178 vínculos válidos; encontrados ${validRows.length}.`);
  if (new Set(validRows.map((row) => row.clientId)).size !== validRows.length) {
    throw new Error('Existem clientes válidos vinculados mais de uma vez.');
  }

  const backupPath = `scripts/exhibitor-finance-links-repair-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(backupPath, JSON.stringify(allRows, null, 2));
  console.log(`Backup criado: ${backupPath}`);

  await db.beginTransaction();
  try {
    const [result] = await db.query(
      "DELETE FROM exhibitor_finance_clients WHERE exhibitorId = '' AND clientId = ''",
    );
    if (result.affectedRows !== 178) throw new Error(`Remoção inesperada: ${result.affectedRows} linhas.`);
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  }

  await db.query(`
    ALTER TABLE exhibitor_finance_clients
      MODIFY exhibitorId varchar(36) NOT NULL,
      MODIFY clientId varchar(36) NOT NULL,
      ADD UNIQUE KEY UQ_exhibitor_finance_client (exhibitorId, clientId),
      ADD UNIQUE KEY UQ_exhibitor_client_owner (clientId),
      ADD CONSTRAINT FK_exhibitor_finance_client_exhibitor
        FOREIGN KEY (exhibitorId) REFERENCES exhibitors(id) ON DELETE CASCADE,
      ADD CONSTRAINT FK_exhibitor_finance_client_client
        FOREIGN KEY (clientId) REFERENCES finance_clients(id) ON DELETE CASCADE
  `);

  const [[counts]] = await db.query(`
    SELECT COUNT(*) total,
           COUNT(DISTINCT clientId) distinctClients,
           SUM(exhibitorId = '' OR clientId = '') invalid
      FROM exhibitor_finance_clients`);
  console.log(JSON.stringify({ repaired: true, ...counts }, null, 2));
} finally {
  await db.end();
}
