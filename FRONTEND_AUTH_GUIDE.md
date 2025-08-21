# Guia de Autenticação Frontend

## Visão Geral

Rotas protegidas pelo `FrontendOriginGuard` requerem headers específicos para validação de origem e token criptografado.

## Chave Secreta

```
FRONTEND_SECRET_KEY = "passagemsecretdofront@2025"
```

_(Mesma chave deve estar no .env do backend)_

## Implementação Frontend

### 1. Função de Geração de Token

```javascript
// utils/frontendAuth.js
import crypto from 'crypto';

const FRONTEND_SECRET_KEY =
  process.env.REACT_APP_FRONTEND_SECRET_KEY || 'passagemsecretdofront@2025';

export function generateFrontendAuth() {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(FRONTEND_SECRET_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const timestamp = Date.now().toString();

  let encrypted = cipher.update(timestamp, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + encrypted;
}
```

### 2. Headers Obrigatórios

```javascript
const protectedHeaders = {
  Origin: window.location.origin,
  'x-frontend-auth': generateFrontendAuth(),
  'Content-Type': 'application/json',
};
```

### 3. Exemplo de Uso

```javascript
// GET Visitors
const response = await fetch(`/visitors?fairId=${fairId}`, {
  headers: protectedHeaders,
});

// POST Visitor
const response = await fetch('/visitors', {
  method: 'POST',
  headers: protectedHeaders,
  body: JSON.stringify(visitorData),
});
```

## Rotas Afetadas

- ✅ `GET /visitors` - **Requer autenticação**
- ✅ `POST /visitors` - **Requer autenticação**
- ❌ `GET /visitors/pdf/:fairId` - **Rota pública**

## Detalhes Técnicos

- **Token expira**: 5 minutos
- **Algoritmo**: AES-256-CBC
- **Validação**: Origin + User-Agent + Token criptografado
- **Origens permitidas**:
  - http://localhost:3000
  - http://localhost:3001
  - https://credenciamento-frontend.vercel.app
  - https://www.expomultimix.com

## Erros Comuns

- `Cliente de API detectado`: User-Agent inválido (Postman/curl)
- `Origem não permitida`: Origin header ausente/inválido
- `Token de frontend inválido`: Token expirado ou malformado
