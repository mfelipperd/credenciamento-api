# API de Emails

## Base URL

```text
https://credenciamento-api-production.up.railway.app
```

Todos os endpoints exigem **JWT** no header:

```text
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Confirmação de Cadastro

Disparado **automaticamente** ao criar um visitante. Pode ser chamado manualmente para reenvio.

```text
POST /emails/confirmation
```

**Body:**

```json
{
  "visitorEmail": "visitante@email.com",
  "visitorName": "João Silva",
  "registrationCode": "ABC123",
  "fairId": "uuid-da-feira"
}
```

**Comportamento:**

- Busca os dados da feira (nome, local, data de início)
- Gera o QR code com o link de check-in do visitante
- Monta o HTML server-side com template fixo
- Envia via Brevo API com QR code embutido no corpo do email

**HTML:** gerado pelo **backend** (`src/utils/emailLayoutGenerator.ts`)

**Resposta:**

```json
{ "success": true }
```

---

### 2. Marketing — Envio Principal

Endpoint principal de marketing. O backend busca os destinatários conforme os critérios e enfileira os envios.

```text
POST /emails/marketing/send
```

**Body:**

```json
{
  "targetFairId": "uuid-da-feira-destino",
  "templateFairId": "uuid-da-feira-usada-no-template",
  "sendTo": "all",
  "subject": "Assunto do email",
  "htmlContent": "<html>...template montado no frontend...</html>"
}
```

**Campos:**

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `targetFairId` | `string (UUID)` | Sim | Feira cujos visitantes vão receber o email |
| `templateFairId` | `string (UUID)` | Sim | Feira cujos dados foram usados para montar o HTML no frontend (pode ser diferente da `targetFairId` em remarketing cross-feira) |
| `sendTo` | `"all" \| "absent"` | Sim | `"all"` = todos os inscritos; `"absent"` = somente quem não fez check-in |
| `subject` | `string` | Sim | Assunto do email |
| `htmlContent` | `string` | Sim | HTML completo montado no frontend |

**Comportamento:**

- Valida que `targetFairId` e `templateFairId` existem no banco
- Busca os destinatários conforme `sendTo` na `targetFairId`
- Enfileira todos no BullMQ (Redis) e retorna imediatamente
- Worker processa com concorrência de 5 emails simultâneos
- Retry automático: 3 tentativas com backoff exponencial (5s → 10s → 20s)
- Substitui `{{VISITOR_NAME}}` no HTML pelo nome de cada visitante

**Variável dinâmica no HTML:**

```html
<!-- O backend substitui automaticamente {{VISITOR_NAME}} pelo nome do visitante -->
<p>Olá, {{VISITOR_NAME}}! Sentimos sua falta na feira...</p>
```

**Exemplo de remarketing cross-feira:**

Enviar email com dados da **Manaus 2026** para visitantes que se inscreveram na **Belém 2025** mas não foram:

```json
{
  "targetFairId": "uuid-belem-2025",
  "templateFairId": "uuid-manaus-2026",
  "sendTo": "absent",
  "subject": "A ExpoMultimix chega a Manaus — venha nos visitar!",
  "htmlContent": "<html>...template com dados da Manaus 2026...</html>"
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "150 email(s) enfileirados para envio",
  "targetFairId": "uuid-belem-2025",
  "templateFairId": "uuid-manaus-2026",
  "sendTo": "absent",
  "totalQueued": 150,
  "status": "QUEUED"
}
```

---

### 3. Marketing — Visitantes Ausentes (legado)

Mantido para compatibilidade retroativa. Prefira o endpoint `/emails/marketing/send`.

```text
POST /emails/marketing/absent-visitors
```

**Body:**

```json
{
  "fairId": "uuid-da-feira",
  "subject": "Assunto do email",
  "htmlContent": "<html>...template montado no frontend...</html>"
}
```

**Comportamento:** idêntico ao `/marketing/send` com `sendTo: "absent"` e `targetFairId === templateFairId`.

---

### 4. Campanha Manual

Envia o mesmo HTML para uma lista de destinatários específica, sem filtrar por feira.

```text
POST /emails/campaign
```

**Body:**

```json
{
  "subject": "Assunto do email",
  "htmlTemplate": "<html>...template montado no frontend...</html>",
  "recipients": [
    { "email": "fulano@email.com", "name": "Fulano" },
    { "email": "ciclano@email.com" }
  ]
}
```

**Comportamento:**

- Envia para cada destinatário via Brevo API em paralelo
- Sem fila — ideal para listas pequenas e pontuais
- Não suporta `{{VISITOR_NAME}}`

**Resposta:**

```json
{
  "success": true,
  "sent": 3
}
```

---

## Comparativo dos Endpoints de Marketing

| | `/marketing/send` | `/marketing/absent-visitors` | `/campaign` |
| --- | --- | --- | --- |
| Destinatários | Backend busca por `sendTo` | Backend busca ausentes | Frontend envia a lista |
| Escopo | `"all"` ou `"absent"` | Somente ausentes | Lista livre |
| Cross-feira | Sim (`targetFairId` + `templateFairId`) | Não | Não |
| `{{VISITOR_NAME}}` | Sim | Não | Não |
| Fila BullMQ | Sim | Sim | Não |
| Status | **Principal** | Legado | Pontual |

---

## Infraestrutura

| Componente | Serviço |
| --- | --- |
| Provedor de email | [Brevo](https://brevo.com) |
| Fila de jobs | BullMQ |
| Redis | Railway (`redis.railway.internal:6379`) |
| Remetente verificado | `gerencia@expomultimix.com.br` |
| Concorrência do worker | 5 emails simultâneos |
| Retry | 3 tentativas, backoff exponencial (5s → 10s → 20s) |

---

## Variáveis de Ambiente

| Variável | Descrição |
| --- | --- |
| `BREVO_API_KEY` | Chave de API da Brevo |
| `BREVO_SENDER_EMAIL` | Email remetente verificado na Brevo |
| `BREVO_SENDER_NAME` | Nome exibido no remetente |
| `REDIS_URL` | URL de conexão com o Redis |
