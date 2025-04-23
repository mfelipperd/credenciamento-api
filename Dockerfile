FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm install -g nodemon

ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

EXPOSE 8000

RUN apk add --no-cache bash curl dcron rclone

COPY backup.sh /backups/backup.sh
COPY upload_to_gdrive.sh /backups/upload_to_gdrive.sh
RUN chmod +x /backups/backup.sh /backups/upload_to_gdrive.sh

RUN (crontab -l 2>/dev/null; echo "0 2 * * * /backups/backup.sh") | crontab -
RUN (crontab -l 2>/dev/null; echo "0 3 * * * /backups/upload_to_gdrive.sh") | crontab -

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
