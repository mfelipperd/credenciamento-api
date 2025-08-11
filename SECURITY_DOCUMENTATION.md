# Sistema de Segurança para Proteção de Dados Sensíveis

## Problema Identificado

Usuários com credenciais válidas de login podem extrair o token JWT e usar clientes de API (como Postman ou Thunder Client) para acessar endpoints com dados sensíveis dos visitantes, incluindo:

- Nome completo
- Email
- CNPJ/CPF
- Telefone
- Empresa
- CEP
- Setores de interesse
- Como conheceu o evento
- Categoria

## Solução Implementada

### FrontendOriginGuard

Um guard customizado que implementa múltiplas camadas de segurança para garantir que apenas requisições legítimas do frontend possam acessar dados sensíveis.

#### Camadas de Segurança:

1. **Detecção de User-Agent**

   - Bloqueia clientes de API conhecidos (Postman, Insomnia, Thunder Client, cURL, etc.)
   - Permite apenas navegadores web

2. **Validação de Origem**

   - Verifica header `Origin` ou `Referer`
   - Permite apenas origens configuradas na lista de permissões

3. **Autenticação de Frontend**
   - Requer header customizado `x-frontend-auth` com timestamp criptografado
   - Timestamp deve ser recente (últimos 5 minutos)

### Endpoints Protegidos

Os seguintes endpoints do `VisitorsController` agora estão protegidos:

- `GET /visitors` - Listagem de visitantes
- `GET /visitors/stats` - Estatísticas de visitantes
- `GET /visitors/:registrationCode` - Dados específicos de um visitante

### Configuração

#### Origens Permitidas (configurável no guard):

```typescript
this.allowedOrigins = [
  'http://localhost:3000', // Development
  'http://localhost:3001', // Development alt
  'https://yourdomain.com', // Production
  'https://www.yourdomain.com', // Production www
];
```

#### Variável de Ambiente:

```
FRONTEND_SECRET_KEY=sua-chave-secreta-aqui
```

## Integração Frontend

### 1. Gerar Header de Autenticação

O frontend deve gerar o header `x-frontend-auth` antes de cada requisição:

```javascript
import { FrontendOriginGuard } from './path/to/guard';

// Gerar header de autenticação
const secretKey = process.env.FRONTEND_SECRET_KEY || 'your-secret-key-here';
const authHeader = FrontendOriginGuard.generateFrontendAuth(secretKey);

// Incluir em todas as requisições para endpoints protegidos
const headers = {
  Authorization: `Bearer ${jwtToken}`,
  'x-frontend-auth': authHeader,
  'Content-Type': 'application/json',
};
```

### 2. Interceptor Automático (Recomendado)

Configure um interceptor HTTP para adicionar automaticamente o header:

```javascript
// Axios interceptor example
axios.interceptors.request.use((config) => {
  // Verificar se é endpoint protegido
  const protectedEndpoints = ['/visitors'];
  const isProtected = protectedEndpoints.some((endpoint) =>
    config.url?.includes(endpoint),
  );

  if (isProtected) {
    const secretKey = process.env.FRONTEND_SECRET_KEY;
    config.headers['x-frontend-auth'] =
      FrontendOriginGuard.generateFrontendAuth(secretKey);
  }

  return config;
});
```

### 3. Tratamento de Erros

```javascript
// Tratar erros de autenticação
.catch(error => {
  if (error.response?.status === 401) {
    const message = error.response.data.message;

    if (message.includes('Cliente de API detectado')) {
      console.error('Acesso bloqueado: Use um navegador web');
    } else if (message.includes('Origem não permitida')) {
      console.error('Acesso bloqueado: Origem não autorizada');
    } else if (message.includes('Token de frontend inválido')) {
      console.error('Acesso bloqueado: Token de frontend expirado');
    }
  }
});
```

## Como Funciona a Criptografia

### Algoritmo: AES-256-CBC

1. **Geração**:

   - Timestamp atual é convertido para string
   - IV (Initialization Vector) aleatório de 16 bytes é gerado
   - Timestamp é criptografado usando chave derivada da secret key
   - Resultado: IV(32 hex chars) + encrypted_timestamp

2. **Validação**:
   - IV é extraído dos primeiros 32 caracteres
   - Parte criptografada é descriptografada
   - Timestamp é verificado (deve ser recente - últimos 5 minutos)

## Limitações e Considerações

### Limitações:

- Não protege contra ataques de usuários que tenham acesso ao código frontend
- Depende de JavaScript ser executado em ambiente confiável
- Adiciona pequena latência para criptografia/descriptografia

### Benefícios:

- Bloqueia efetivamente clientes de API comuns
- Dificulta acesso não autorizado mesmo com token JWT válido
- Mantém usabilidade do frontend legítimo
- Configurável para diferentes ambientes

## Monitoramento

Para monitorar tentativas de acesso bloqueadas, verifique os logs da aplicação:

```
[UnauthorizedException] Acesso não autorizado: Cliente de API detectado
[UnauthorizedException] Acesso não autorizado: Origem não permitida
[UnauthorizedException] Acesso não autorizado: Token de frontend inválido
```

## Alternativas Futuras

Para segurança ainda maior, considere:

1. **Rotação de Chaves**: Implementar rotação automática da secret key
2. **Rate Limiting**: Limitar número de requisições por IP/usuário
3. **Device Fingerprinting**: Validação adicional baseada em características do dispositivo
4. **CSRF Tokens**: Implementar proteção CSRF adicional
5. **IP Whitelisting**: Restringir acesso por faixas de IP confiáveis
