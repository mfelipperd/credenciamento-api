import 'dotenv/config';
import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';

const url = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;
if (!url) throw new Error('Conexão com o banco não configurada.');

const db = await mysql.createConnection({ uri: url, multipleStatements: true });
try {
  const sql = readFileSync('database-migrations/create-exhibitor-portal-tables.sql', 'utf8');
  await db.query(sql);
  const [tables] = await db.query(
    `SELECT table_name tableName
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name LIKE 'exhibitor%'
     ORDER BY table_name`,
  );
  console.table(tables);
} finally {
  await db.end();
}
