#!/bin/sh

# Inicia o cron em background
crond

# Inicia a aplicação NestJS
if [ "$NODE_ENV" = "production" ]; then
  node dist/main
else
  npm run start:devcont
fi
