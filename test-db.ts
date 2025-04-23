import { createConnection } from 'mysql2';

const connection = createConnection({
  host: 'tramway.proxy.rlwy.net',
  port: 45782,
  user: 'root',
  password: 'VxbyvUXcJrNeyhfRYeVAuoDDWCDMMywG',
  database: 'railway',
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Falha na conexão com o banco:', err.message);
  } else {
    console.log('✅ Conectado com sucesso ao banco!');
    connection.end();
  }
});
