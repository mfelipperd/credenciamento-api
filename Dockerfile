# Etapa 1 — Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2 — App pronto pra rodar
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install 

COPY --from=builder /app/dist ./dist
COPY backup.sh /backups/backup.sh
COPY upload_to_gdrive.sh /backups/upload_to_gdrive.sh
RUN chmod +x /backups/*.sh
RUN apk add --no-cache bash curl dcron rclone

RUN (crontab -l 2>/dev/null; echo "0 2 * * * /backups/backup.sh") | crontab -
RUN (crontab -l 2>/dev/null; echo "0 3 * * * /backups/upload_to_gdrive.sh") | crontab -

EXPOSE 8000
CMD ["npm", "run", "start:prod"]
