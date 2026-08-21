import 'dotenv/config';
import { writeFileSync } from 'fs';
import mysql from 'mysql2/promise';

const apply = process.argv.includes('--apply');
const normalize = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim().toUpperCase();

const merges = [
  ['ALVINI PLASTICOS', 'ALVINI'],
  ['AMILPLAS', 'AMILPLAST'],
  ['DOCE BRINQUEDO', 'DOCE BRINQUEDOS'],
  ['EASY PLAST (LIDER MIX)', 'EASY PLAST'],
  ['FORPLAST', 'FOR-PLAST'],
  ['GAVATOYS', 'GAVA TOYS'],
  ['GRUPO PANDA (DU RIO)', 'GRUPO PANDA'],
  ['MANAUARA BUGUER', 'MANAUARAS BURGER'],
  ['MERCON PLAS', 'MERCONPLAS'],
  ['NEW GOODS (20 COMERCIAL)', 'NEW GOODS'],
  ['PLAST.CO', 'PLASTI.CO'],
  ['SALUS COMERCIAL', 'SALUS'],
  ['SIDNYL', 'SID-NYL'],
  ['SPIDER IMPORT', 'SPIDER'],
  ['TILIN BRINQUEDOS', 'TILIN'],
  ['UNI ART', 'UNITOYS (UNI-ART)'],
  ['UNITOYS', 'UNITOYS (UNI-ART)'],
];

const url = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;
if (!url) throw new Error('Conexão com o banco não configurada.');
const db = await mysql.createConnection(url);

const findByName = async (name) => {
  const [rows] = await db.query('SELECT * FROM exhibitors WHERE name = ?', [name]);
  if (rows.length !== 1) throw new Error(`Esperado um expositor para ${name}; encontrados: ${rows.length}`);
  return rows[0];
};

try {
  const plan = [];
  for (const [sourceName, targetName] of merges) {
    const source = await findByName(sourceName);
    const target = await findByName(targetName);
    const [[sourceStats], [targetStats]] = await Promise.all([
      db.query(
        `SELECT
           (SELECT COUNT(*) FROM exhibitor_finance_clients WHERE exhibitorId = ?) financeLinks,
           (SELECT COUNT(*) FROM exhibitor_fairs WHERE exhibitorId = ?) fairs,
           (SELECT COUNT(*) FROM exhibitor_members WHERE exhibitorId = ?) members`,
        [source.id, source.id, source.id],
      ),
      db.query(
        `SELECT
           (SELECT COUNT(*) FROM exhibitor_finance_clients WHERE exhibitorId = ?) financeLinks,
           (SELECT COUNT(*) FROM exhibitor_fairs WHERE exhibitorId = ?) fairs,
           (SELECT COUNT(*) FROM exhibitor_members WHERE exhibitorId = ?) members`,
        [target.id, target.id, target.id],
      ),
    ]);
    plan.push({ source, target, sourceStats: sourceStats[0], targetStats: targetStats[0] });
  }

  console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY_RUN', merges: plan.map((item) => ({
    from: item.source.name,
    to: item.target.name,
    sourceStats: item.sourceStats,
    targetStats: item.targetStats,
  })) }, null, 2));
  if (!apply) process.exit(0);

  const tables = [
    'exhibitors', 'exhibitor_finance_clients', 'exhibitor_members',
    'exhibitor_fairs', 'exhibitor_fair_members', 'exhibitor_invitations',
  ];
  const backup = {};
  for (const table of tables) {
    const [rows] = await db.query(`SELECT * FROM \`${table}\``);
    backup[table] = rows;
  }
  const backupPath = `scripts/exhibitor-merge-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`Backup criado: ${backupPath}`);

  await db.beginTransaction();
  try {
    for (const item of plan) {
      const { source, target } = item;

      await db.query(
        'UPDATE exhibitor_finance_clients SET exhibitorId = ? WHERE exhibitorId = ?',
        [target.id, source.id],
      );
      await db.query(
        'UPDATE exhibitor_invitations SET exhibitorId = ? WHERE exhibitorId = ?',
        [target.id, source.id],
      );

      const [sourceFairs] = await db.query(
        'SELECT * FROM exhibitor_fairs WHERE exhibitorId = ?', [source.id],
      );
      for (const sourceFair of sourceFairs) {
        const [targetFairs] = await db.query(
          'SELECT id FROM exhibitor_fairs WHERE exhibitorId = ? AND fairId = ?',
          [target.id, sourceFair.fairId],
        );
        if (!targetFairs.length) {
          await db.query('UPDATE exhibitor_fairs SET exhibitorId = ? WHERE id = ?', [target.id, sourceFair.id]);
          continue;
        }
        const targetFairId = targetFairs[0].id;
        await db.query(
          `DELETE duplicateMembership FROM exhibitor_fair_members duplicateMembership
            JOIN exhibitor_fair_members existingMembership
              ON existingMembership.exhibitorFairId = ?
             AND existingMembership.memberId = duplicateMembership.memberId
           WHERE duplicateMembership.exhibitorFairId = ?`,
          [targetFairId, sourceFair.id],
        );
        await db.query(
          'UPDATE exhibitor_fair_members SET exhibitorFairId = ? WHERE exhibitorFairId = ?',
          [targetFairId, sourceFair.id],
        );
        await db.query('DELETE FROM exhibitor_fairs WHERE id = ?', [sourceFair.id]);
      }

      const [sourceMembers] = await db.query(
        'SELECT * FROM exhibitor_members WHERE exhibitorId = ?', [source.id],
      );
      for (const sourceMember of sourceMembers) {
        const [targetMembers] = await db.query(
          'SELECT * FROM exhibitor_members WHERE exhibitorId = ? AND normalizedName = ?',
          [target.id, sourceMember.normalizedName],
        );
        if (!targetMembers.length) {
          await db.query('UPDATE exhibitor_members SET exhibitorId = ? WHERE id = ?', [target.id, sourceMember.id]);
          continue;
        }
        const targetMember = targetMembers[0];
        await db.query(
          `DELETE duplicateMembership FROM exhibitor_fair_members duplicateMembership
            JOIN exhibitor_fair_members existingMembership
              ON existingMembership.exhibitorFairId = duplicateMembership.exhibitorFairId
             AND existingMembership.memberId = ?
           WHERE duplicateMembership.memberId = ?`,
          [targetMember.id, sourceMember.id],
        );
        await db.query(
          'UPDATE exhibitor_fair_members SET memberId = ? WHERE memberId = ?',
          [targetMember.id, sourceMember.id],
        );
        await db.query(
          `UPDATE exhibitor_members
              SET userId = COALESCE(userId, ?), email = COALESCE(email, ?),
                  phone = COALESCE(phone, ?), jobTitle = COALESCE(jobTitle, ?)
            WHERE id = ?`,
          [sourceMember.userId, sourceMember.email, sourceMember.phone, sourceMember.jobTitle, targetMember.id],
        );
        await db.query('DELETE FROM exhibitor_members WHERE id = ?', [sourceMember.id]);
      }

      await db.query('DELETE FROM exhibitors WHERE id = ?', [source.id]);
      await db.query(
        'UPDATE finance_clients SET name = ? WHERE id IN (SELECT clientId FROM exhibitor_finance_clients WHERE exhibitorId = ?)',
        [target.name, target.id],
      );
    }
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  }
  console.log(`Consolidação concluída: ${plan.length} cadastros duplicados removidos.`);
} finally {
  await db.end();
}
