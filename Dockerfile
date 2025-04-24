# Etapa 1 — Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copia arquivos essenciais pro build
COPY package.json package-lock.json tsconfig.json ./
COPY ./src ./src

# Instala dependências e faz o build
RUN npm install
RUN npm run build

# Etapa 2 — Container final
FROM node:18-alpine

WORKDIR /app

# Copia apenas os arquivos de runtime + build da etapa anterior
COPY package.json package-lock.json ./
RUN npm install

# Copia o resultado do build
COPY --from=builder /app/dist ./dist

# Scripts de backup
COPY backup.sh /backups/backup.sh
COPY upload_to_gdrive.sh /backups/upload_to_gdrive.sh
RUN chmod +x /backups/*.sh

# Dependências extras e cron
RUN apk add --no-cache bash curl dcron rclone
RUN echo "0 2 * * * /backups/backup.sh" >> /etc/crontabs/root
RUN echo "0 3 * * * /backups/upload_to_gdrive.sh" >> /etc/crontabs/root

EXPOSE 8000

# Comando final para iniciar a aplicação
CMD ["npm", "run", "start:prod"]
