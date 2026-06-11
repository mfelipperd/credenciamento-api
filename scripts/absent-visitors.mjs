import mysql from 'mysql2/promise';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const connection = await mysql.createConnection(
  'mysql://root:VxbyvUXcJrNeyhfRYeVAuoDDWCDMMywG@tramway.proxy.rlwy.net:45782/railway'
);

// 1. Busca a feira de Manaus 2026
const [fairs] = await connection.execute(
  `SELECT id, name, edition, city, state, startDate, endDate
   FROM fairs
   WHERE (name LIKE '%manaus%' OR city LIKE '%manaus%' OR state = 'AM')
   ORDER BY createdAt DESC`
);

if (!fairs.length) {
  console.log('Nenhuma feira de Manaus encontrada.');
  await connection.end();
  process.exit(1);
}

console.log('Feiras encontradas:');
fairs.forEach((f, i) => console.log(`  [${i}] id=${f.id} | name="${f.name}" | edition="${f.edition}" | city=${f.city} | state=${f.state} | ${f.startDate} → ${f.endDate}`));

// Seleciona automaticamente a mais recente (primeira da lista por createdAt DESC)
const fair = fairs[0];
console.log(`\nUsando feira: "${fair.name}" (${fair.edition ?? ''}) — id: ${fair.id}\n`);

// 2. Visitantes inscritos na feira (via tabela fair_visitor)
const [registered] = await connection.execute(
  `SELECT v.registrationCode, v.name, v.email, v.company, v.cnpj, v.phone,
          v.city AS visitorCity, v.state AS visitorState,
          v.category, v.sectors, v.registrationDate
   FROM visitors v
   INNER JOIN fair_visitor fv ON fv.visitorsRegistrationCode = v.registrationCode
   WHERE fv.fairsId = ?`,
  [fair.id]
);

console.log(`Total de inscritos: ${registered.length}`);

// 3. Visitantes que fizeram check-in na feira
// CheckIn não possui fairId direto; usa-se a data do check-in dentro do período da feira
// Como a relação é visitor → checkins, filtramos quem tem pelo menos 1 check-in
// dentro do intervalo da feira (ou qualquer check-in se as datas forem nulas)
let checkedInCodes;

// Usa createdAt para filtrar check-ins no período da feira (checkInDate é nullable)
if (fair.startDate && fair.endDate) {
  const start = new Date(fair.startDate).toISOString().slice(0, 10);
  const end = new Date(fair.endDate).toISOString().slice(0, 10);
  const [checkins] = await connection.execute(
    `SELECT DISTINCT c.visitorRegistrationCode
     FROM checkins c
     WHERE DATE(c.createdAt) BETWEEN ? AND ?`,
    [start, end]
  );
  checkedInCodes = new Set(checkins.map((r) => r.visitorRegistrationCode));
} else {
  const [checkins] = await connection.execute(
    `SELECT DISTINCT c.visitorRegistrationCode FROM checkins c`
  );
  checkedInCodes = new Set(checkins.map((r) => r.visitorRegistrationCode));
}

// 4. Filtra ausentes
const absent = registered.filter((v) => !checkedInCodes.has(v.registrationCode));

console.log(`Presentes (com check-in): ${registered.length - absent.length}`);
console.log(`Ausentes: ${absent.length}`);

// 5. Gera CSV
const header = [
  'Código de Inscrição',
  'Nome',
  'E-mail',
  'Empresa',
  'CNPJ',
  'Telefone',
  'Cidade',
  'Estado',
  'Categoria',
  'Setores',
  'Data de Inscrição',
];

const escape = (v) => {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
};

const rows = absent.map((v) => [
  v.registrationCode,
  v.name,
  v.email,
  v.company,
  v.cnpj,
  v.phone,
  v.visitorCity,
  v.visitorState,
  v.category,
  v.sectors,
  v.registrationDate ? new Date(v.registrationDate).toLocaleDateString('pt-BR') : '',
].map(escape).join(','));

const csv = [header.join(','), ...rows].join('\r\n');

const outputPath = join(__dirname, `ausentes-manaus-2026.csv`);
writeFileSync(outputPath, '﻿' + csv, 'utf8'); // BOM para Excel
console.log(`\nCSV gerado: ${outputPath}`);

await connection.end();
