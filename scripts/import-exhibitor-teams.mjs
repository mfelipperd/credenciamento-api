import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const csvPath = process.argv.find((arg) => arg.toLowerCase().endsWith('.csv'));
const apply = process.argv.includes('--apply');
if (!csvPath) throw new Error('Informe o caminho do CSV.');

const normalize = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ').trim().toUpperCase();

const aliases = new Map([
  ['MILK INDUSTRIA', ['MILK']],
  ['USUAL BRINQUEDOS E UTILIDADES', ['USUAL BRINQUEDOS']],
  ['FENIX BRINQUEDOS', ['FENIX', 'FENIX BRINQ']],
  ['POLYPERFIL', ['INDUSTRIA PARAENSE (POLYPERFIL)']],
]);

const lines = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
const rows = lines.slice(2)
  .map((line, index) => ({ line: index + 3, values: line.split(',').map((item) => item.trim()) }))
  .filter(({ values }) => values.some(Boolean))
  .map(({ line, values }) => ({ line, name: values[0], company: values[1], jobTitle: values[2] || null }));

const invalid = rows.filter((row) => !row.name || !row.company);
const valid = rows.filter((row) => row.name && row.company);
const companies = [...new Set(valid.map((row) => normalize(row.company)))];
const url = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;
if (!url) throw new Error('Conexão com o banco não configurada.');
const db = await mysql.createConnection(url);

try {
  const [clients] = await db.query('SELECT id, name, fairId FROM finance_clients ORDER BY name');
  let existingExhibitors = [];
  let existingMembers = [];
  try {
    [existingExhibitors] = await db.query('SELECT id, name, normalizedName FROM exhibitors');
    [existingMembers] = await db.query('SELECT exhibitorId, normalizedName FROM exhibitor_members');
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
  }

  const report = companies.map((normalizedCompany) => {
    const names = new Set([normalizedCompany, ...(aliases.get(normalizedCompany) ?? [])]);
    const matchedClients = clients.filter((client) => names.has(normalize(client.name)));
    const existing = existingExhibitors.find((item) => item.normalizedName === normalizedCompany);
    const people = valid.filter((row) => normalize(row.company) === normalizedCompany);
    return {
      company: people[0].company.trim(),
      people: people.length,
      exhibitorAction: existing ? 'REUSE' : 'CREATE',
      exhibitorId: existing?.id ?? null,
      financeClients: matchedClients.map(({ id, name, fairId }) => ({ id, name, fairId })),
      membersToCreate: people.filter((person) =>
        !existing || !existingMembers.some((member) =>
          member.exhibitorId === existing.id && member.normalizedName === normalize(person.name),
        ),
      ).length,
    };
  });

  console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY_RUN', sourceTitle: lines[0], validRows: valid.length, invalid, companies: report }, null, 2));
  if (!apply) process.exit(0);

  await db.beginTransaction();
  try {
    for (const item of report) {
      let exhibitorId = item.exhibitorId;
      if (!exhibitorId) {
        exhibitorId = randomUUID();
        await db.query(
          `INSERT INTO exhibitors (id, name, normalizedName, type, cnpj, isActive, createdAt, updatedAt)
           VALUES (?, ?, ?, 'OTHER', NULL, 1, NOW(6), NOW(6))`,
          [exhibitorId, item.company, normalize(item.company)],
        );
      }
      for (const client of item.financeClients) {
        await db.query(
          `INSERT IGNORE INTO exhibitor_finance_clients (id, exhibitorId, clientId, createdAt)
           VALUES (?, ?, ?, NOW(6))`,
          [randomUUID(), exhibitorId, client.id],
        );
      }
      for (const person of valid.filter((row) => normalize(row.company) === normalize(item.company))) {
        await db.query(
          `INSERT IGNORE INTO exhibitor_members
             (id, exhibitorId, userId, name, normalizedName, email, phone, jobTitle, role, isActive, createdAt, updatedAt)
           VALUES (?, ?, NULL, ?, ?, NULL, NULL, ?, 'STAFF', 1, NOW(6), NOW(6))`,
          [randomUUID(), exhibitorId, person.name.trim(), normalize(person.name), person.jobTitle],
        );
      }
    }
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  }
  console.log('Importação concluída com sucesso.');
} finally {
  await db.end();
}
