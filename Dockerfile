# Usa a imagem oficial do Node.js
FROM node:18-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia apenas os arquivos essenciais
COPY package.json package-lock.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código
COPY . .

# Define a variável de ambiente para produção
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

# Expõe a porta 8000 para a API
EXPOSE 8000

# Instala pacotes para backups e cron jobs
RUN apk add --no-cache bash curl dcron rclone

# Copia os scripts de backup e envio para o Google Drive
COPY backup.sh /backups/backup.sh
COPY upload_to_gdrive.sh /backups/upload_to_gdrive.sh
RUN chmod +x /backups/backup.sh /backups/upload_to_gdrive.sh

# Adiciona os scripts ao Cron Job
RUN (crontab -l 2>/dev/null; echo "0 2 * * * /backups/backup.sh") | crontab -
RUN (crontab -l 2>/dev/null; echo "0 3 * * * /backups/upload_to_gdrive.sh") | crontab -

# Inicia o cron junto com a API
CMD ["sh", "-c", "service dcron start && if [ \"$NODE_ENV\" = \"production\" ]; then npm run start:prod; else npm run start:dev; fi"]
