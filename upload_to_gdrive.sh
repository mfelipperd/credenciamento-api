#!/bin/bash

# Nome do diretório remoto no Google Drive
REMOTE_DIR="gdrive:mysql-backups"

# Diretório onde os backups são salvos
BACKUP_DIR="/backups"

# Enviar os arquivos compactados para o Google Drive
rclone copy $BACKUP_DIR gdrive:/MySQL-Backups --ignore-existing

echo "✅ Backup enviado para o Google Drive com sucesso!"
