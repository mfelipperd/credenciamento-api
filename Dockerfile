# Usa imagem base leve com Node 18
FROM node:18-alpine

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia e instala dependências
COPY package.json package-lock.json ./
RUN npm install

# Copia o restante dos arquivos
COPY . .

# Adiciona build do NestJS
RUN npm run build

# Instala ferramentas adicionais (cron, bash, etc)
RUN apk add --no-cache bash curl dcron rclone

# Copia scripts de backup
COPY backup.sh /backups/backup.sh
COPY upload_to_gdrive.sh /backups/upload_to_gdrive.sh
RUN chmod +x /backups/backup.sh /backups/upload_to_gdrive.sh

# Adiciona cron jobs
RUN (crontab -l 2>/dev/null; echo "0 2 * * * /backups/backup.sh") | crontab -
RUN (crontab -l 2>/dev/null; echo "0 3 * * * /backups/upload_to_gdrive.sh") | crontab -

# Expõe a porta do app
EXPOSE 8000

# 🧼 REMOVE qualquer CMD fixo
# O comando de start será fornecido no painel do Railway

# ✅ OU se quiser deixar hardcoded:
# CMD ["npm", "run", "start:prod"]
