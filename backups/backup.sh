#!/bin/bash

# Configuração do banco de dados
DB_NAME="credenciamento_db"
DB_USER="user"
DB_PASSWORD="password"
DB_HOST="mysql"

# Diretório de backup
BACKUP_DIR="/backups"
mkdir -p $BACKUP_DIR

# Nome do arquivo de backup com timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Gerar o backup
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_FILE

# Compactar o backup para economizar espaço
gzip $BACKUP_FILE

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;

echo "✅ Backup realizado e salvo em: $BACKUP_FILE.gz"
