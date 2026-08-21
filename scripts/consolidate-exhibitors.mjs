import 'dotenv/config';
import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import mysql from 'mysql2/promise';

const apply = process.argv.includes('--apply');
const normalize = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim().toUpperCase();

const forcedAliases = new Map([
  ['PLAST CO MIX SAO PAULO', 'PLASTI CO'],
  ['MILK', 'MILK INDUSTRIA'],
  ['USUAL BRINQUEDOS', 'USUAL BRINQUEDOS E UTILIDADES'],
  ['FENIX', 'FENIX BRINQUEDOS'],
  ['FENIX BRINQ', 'FENIX BRINQUEDOS'],
  ['INDUSTRIA PARAENSE POLYPERFIL', 'POLYPERFIL'],
]);

const url = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;
if (!url) throw new Error('Conexão com o banco não configurada.');
const db = await mysql.createConnection(url);

try {
  const [clients] = await db.query(
    `SELECT id, name, cnpj, fairId, email, phone, responsavel
     FROM finance_clients ORDER BY createdAt, id`,
  );
  const [exhibitors] = await db.query(
    `SELECT id, name, normalizedName, cnpj FROM exhibitors ORDER BY createdAt, id`,
  );
  const [links] = await db.query(
    `SELECT id, exhibitorId, clientId FROM exhibitor_finance_clients`,
  );
  const [participations] = await db.query(
    `SELECT id, exhibitorId, fairId FROM exhibitor_fairs`,
  );

  const exhibitorById = new Map(exhibitors.map((item) => [item.id, item]));
  const exhibitorByNormalized = new Map(exhibitors.map((item) => [normalize(item.normalizedName), item]));
  const linkByClient = new Map(links.map((item) => [item.clientId, item]));
  const plannedExhibitors = [];
  const plannedLinks = [];
  const plannedParticipations = [];
  const plannedRenames = [];

  for (const client of clients) {
    let exhibitor = linkByClient.has(client.id)
      ? exhibitorById.get(linkByClient.get(client.id).exhibitorId)
      : null;
    const sourceNormalized = normalize(client.name);
    const canonicalNormalized = forcedAliases.get(sourceNormalized) ?? sourceNormalized;

    if (!exhibitor) exhibitor = exhibitorByNormalized.get(canonicalNormalized);
    if (!exhibitor) {
      exhibitor = {
        id: randomUUID(),
        name: client.name.trim().replace(/\s+/g, ' '),
        normalizedName: canonicalNormalized,
        cnpj: null,
      };
      exhibitors.push(exhibitor);
      exhibitorById.set(exhibitor.id, exhibitor);
      exhibitorByNormalized.set(canonicalNormalized, exhibitor);
      plannedExhibitors.push(exhibitor);
    }

    if (!linkByClient.has(client.id)) {
      const link = { id: randomUUID(), exhibitorId: exhibitor.id, clientId: client.id };
      linkByClient.set(client.id, link);
      plannedLinks.push(link);
    }

    if (client.fairId && !participations.some(
      (item) => item.exhibitorId === exhibitor.id && item.fairId === client.fairId,
    ) && !plannedParticipations.some(
      (item) => item.exhibitorId === exhibitor.id && item.fairId === client.fairId,
    )) {
      plannedParticipations.push({
        id: randomUUID(), exhibitorId: exhibitor.id, fairId: client.fairId,
      });
    }

    if (client.name !== exhibitor.name) {
      plannedRenames.push({ clientId: client.id, from: client.name, to: exhibitor.name });
    }
  }

  const summary = {
    mode: apply ? 'APPLY' : 'DRY_RUN',
    financeClients: clients.length,
    existingGlobalExhibitors: exhibitors.length - plannedExhibitors.length,
    exhibitorsToCreate: plannedExhibitors.length,
    financeLinksToCreate: plannedLinks.length,
    fairParticipationsToCreate: plannedParticipations.length,
    legacyNamesToStandardize: plannedRenames.length,
    aliasesApplied: [...forcedAliases.entries()],
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) process.exit(0);

  const backupPath = `scripts/exhibitors-consolidation-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(backupPath, JSON.stringify({ clients, exhibitors, links, participations }, null, 2));
  console.log(`Backup criado: ${backupPath}`);

  await db.beginTransaction();
  try {
    if (plannedExhibitors.length) {
      const placeholders = plannedExhibitors.map(() => "(?, ?, ?, 'OTHER', NULL, 1, NOW(6), NOW(6))").join(',');
      await db.query(
        `INSERT INTO exhibitors
           (id, name, normalizedName, type, cnpj, isActive, createdAt, updatedAt)
         VALUES ${placeholders}`,
        plannedExhibitors.flatMap((item) => [item.id, item.name, item.normalizedName]),
      );
    }
    if (plannedLinks.length) {
      const placeholders = plannedLinks.map(() => '(?, ?, ?, NOW(6))').join(',');
      await db.query(
        `INSERT INTO exhibitor_finance_clients (id, exhibitorId, clientId, createdAt)
         VALUES ${placeholders}`,
        plannedLinks.flatMap((item) => [item.id, item.exhibitorId, item.clientId]),
      );
    }
    if (plannedParticipations.length) {
      const placeholders = plannedParticipations
        .map(() => "(?, ?, ?, 'CONFIRMED', 'finance_clients', NOW(6), NOW(6))")
        .join(',');
      await db.query(
        `INSERT INTO exhibitor_fairs
           (id, exhibitorId, fairId, status, source, createdAt, updatedAt)
         VALUES ${placeholders}`,
        plannedParticipations.flatMap((item) => [item.id, item.exhibitorId, item.fairId]),
      );
    }
    if (plannedRenames.length) {
      const cases = plannedRenames.map(() => 'WHEN ? THEN ?').join(' ');
      const ids = plannedRenames.map((item) => item.clientId);
      await db.query(
        `UPDATE finance_clients SET name = CASE id ${cases} ELSE name END WHERE id IN (?)`,
        [...plannedRenames.flatMap((item) => [item.clientId, item.to]), ids],
      );
    }
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  }
  console.log('Consolidação concluída.');
} finally {
  await db.end();
}
