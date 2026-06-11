import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

// Recognised column names
const NAME_COLUMNS = ['nome', 'name', 'contato'];
const PHONE_COLUMNS = ['telefone', 'numero', 'phone', 'number', 'tel', 'celular', 'mobile', 'whatsapp'];

// Normalise column names to make matching robust
function normalizeHeaderName(name) {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents (e.g. "número" -> "numero")
}

// Phone normalisation function
function normalizePhone(phoneStr, defaultDDD = '92') {
  if (!phoneStr) return '';
  
  // Keep only digits
  let digits = phoneStr.replace(/\D/g, '');
  if (!digits) return '';

  // Case 1: Starts with 55 (country code)
  if (digits.startsWith('55')) {
    const rest = digits.substring(2);
    if (rest.length === 11) {
      // 55 + DD + 9 + 8 digits
      return '55' + rest;
    } else if (rest.length === 10) {
      // 55 + DD + 8 digits -> Insert 9 after DD
      return '55' + rest.substring(0, 2) + '9' + rest.substring(2);
    } else if (rest.length === 9) {
      // 55 + 9 + 8 digits -> Missing DDD
      return '55' + defaultDDD + rest;
    } else if (rest.length === 8) {
      // 55 + 8 digits -> Missing DDD and prefix 9
      return '55' + defaultDDD + '9' + rest;
    }
  }

  // Case 2: Does not start with 55 (or weird length after 55)
  if (digits.length === 11) {
    // DD + 9 + 8 digits
    return '55' + digits;
  } else if (digits.length === 10) {
    // DD + 8 digits -> Insert 9 after DD
    return '55' + digits.substring(0, 2) + '9' + digits.substring(2);
  } else if (digits.length === 9) {
    // 9 + 8 digits -> Missing DDD
    return '55' + defaultDDD + digits;
  } else if (digits.length === 8) {
    // 8 digits -> Missing DDD and prefix 9
    return '55' + defaultDDD + '9' + digits;
  }

  // Case 3: Exactly 13 digits starting with 55 (already correct)
  if (digits.length === 13 && digits.startsWith('55')) {
    return digits;
  }

  // Fallback for longer/shorter digits
  if (digits.length >= 8) {
    const num = digits.slice(-8);
    const restBefore = digits.slice(0, -8);
    const hasNine = restBefore.endsWith('9');
    const dddAndCountry = hasNine ? restBefore.slice(0, -1) : restBefore;
    
    let ddd = defaultDDD;
    if (dddAndCountry.length >= 2) {
      ddd = dddAndCountry.slice(-2);
    }
    return '55' + ddd + '9' + num;
  }

  return digits;
}

// Simple, robust CSV parser supporting quoted values and custom delimiters
function parseCSV(csvText, delimiter = ',') {
  const lines = [];
  let row = [''];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        row[row.length - 1] += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        row.push('');
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += char;
      }
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

// Detect CSV delimiter based on count in the header line
function detectDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

// CSV value escaping
function escapeCSVValue(v) {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""');
  return s.includes(',') || s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r') 
    ? `"${s}"` 
    : s;
}

// CLI argument parsing
const args = process.argv.slice(2);
const helpIndex = args.findIndex(arg => arg === '--help' || arg === '-h');

if (helpIndex !== -1 || args.length === 0) {
  console.log(`
Uso:
  node scripts/normalize-csv.mjs <caminho_do_csv_entrada> [caminho_do_csv_saida] [ddd_padrao]

Argumentos:
  <caminho_do_csv_entrada>  Caminho para o arquivo CSV de entrada.
  [caminho_do_csv_saida]    Caminho para salvar o CSV normalizado. (Padrão: <entrada>_normalizado.csv)
  [ddd_padrao]              Código de DDD padrão (2 dígitos) a ser usado quando ausente. (Padrão: 92)

Exemplo:
  node scripts/normalize-csv.mjs contatos.csv contatos_formatados.csv 92
`);
  process.exit(0);
}

const inputPath = resolve(args[0]);
if (!existsSync(inputPath)) {
  console.error(`Erro: O arquivo de entrada não existe: ${inputPath}`);
  process.exit(1);
}

const defaultDDD = args[2] || '92';
const outputPath = args[1] 
  ? resolve(args[1]) 
  : resolve(inputPath.replace(/\.csv$/i, '') + '_normalizado.csv');

console.log(`Processando: ${basename(inputPath)}`);
console.log(`DDD Padrão: ${defaultDDD}`);

try {
  let content = readFileSync(inputPath, 'utf8');
  
  // Remove UTF-8 BOM if present
  if (content.startsWith('\ufeff')) {
    content = content.substring(1);
  }

  // Split lines to detect delimiter from the first line
  const firstLineEnd = content.indexOf('\n');
  const firstLine = firstLineEnd !== -1 ? content.substring(0, firstLineEnd) : content;
  const delimiter = detectDelimiter(firstLine);
  console.log(`Delimitador detectado: "${delimiter}"`);

  // Parse CSV
  const parsed = parseCSV(content, delimiter);
  if (parsed.length === 0) {
    console.error('Erro: O arquivo CSV está vazio.');
    process.exit(1);
  }

  const headers = parsed[0];
  let nameIdx = headers.findIndex(h => {
    const normalized = normalizeHeaderName(h);
    return NAME_COLUMNS.some(keyword => normalized.includes(keyword));
  });
  let phoneIdx = headers.findIndex(h => {
    const normalized = normalizeHeaderName(h);
    return PHONE_COLUMNS.some(keyword => normalized.includes(keyword));
  });

  if (nameIdx === -1 || phoneIdx === -1) {
    if (headers.length === 2) {
      console.log('Não foi possível mapear os cabeçalhos automaticamente. Como o CSV possui exatamente 2 colunas, assumiremos:');
      console.log(`  Coluna 1: Nome (${headers[0]})`);
      console.log(`  Coluna 2: Telefone (${headers[1]})`);
      nameIdx = 0;
      phoneIdx = 1;
    } else {
      console.error('Erro: Não foi possível identificar as colunas de Nome e/ou Telefone.');
      console.error('Cabeçalhos encontrados:', headers);
      console.error('Cabeçalhos reconhecidos para Nome:', NAME_COLUMNS.join(', '));
      console.error('Cabeçalhos reconhecidos para Telefone:', PHONE_COLUMNS.join(', '));
      process.exit(1);
    }
  } else {
    console.log(`Colunas mapeadas:`);
    console.log(`  Nome     -> "${headers[nameIdx]}" (índice ${nameIdx})`);
    console.log(`  Telefone -> "${headers[phoneIdx]}" (índice ${phoneIdx})`);
  }

  const outputRows = [['nome', 'telefone']];

  // Process rows
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i];
    // Skip empty lines
    if (row.length === 1 && row[0] === '') continue;

    const nameValue = row[nameIdx] || '';
    const phoneValue = row[phoneIdx] || '';
    const normalizedPhone = normalizePhone(phoneValue, defaultDDD);

    outputRows.push([nameValue, normalizedPhone]);
  }

  // Generate output CSV content
  const outputCSV = outputRows.map(r => r.map(escapeCSVValue).join(',')).join('\r\n');
  
  // Write output file (including BOM for Excel compatibility)
  writeFileSync(outputPath, '\ufeff' + outputCSV, 'utf8');
  console.log(`Sucesso! Arquivo normalizado salvo em: ${outputPath}`);
  console.log(`Total de registros processados: ${outputRows.length - 1}`);

} catch (error) {
  console.error('Erro inesperado ao processar o CSV:', error.message);
  process.exit(1);
}
