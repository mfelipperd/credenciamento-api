# API de Campanhas de Email — Documentação Frontend

Base URL: `https://credenciamento-api-production.up.railway.app`

---

## Visão Geral

O módulo de campanhas permite ao frontend:

1. **Enviar** campanhas de email marketing com título e rastreamento automático
2. **Listar** o histórico de campanhas enviadas
3. **Analisar** métricas por campanha (entrega, abertura, cliques)
4. **Monitorar** o saldo de créditos e saúde geral da conta Brevo

---

## 1. Estatísticas da Conta

### `GET /emails/account-stats`

Retorna informações do plano Brevo + agregado dos últimos 30 dias.

**Autenticação:** JWT Bearer token

**Resposta:**
```json
{
  "plan": {
    "name": "Starter",
    "status": "active",
    "periodStart": "2026-05-26",
    "periodEnd": "2026-06-26"
  },
  "credits": {
    "total": 10000,
    "remaining": 9847,
    "used": 0
  },
  "last30Days": {
    "sent": 153,
    "delivered": 148,
    "deliveryRate": 96.7,
    "opens": 89,
    "uniqueOpens": 67,
    "openRate": 60.1,
    "clicks": 23,
    "uniqueClicks": 18,
    "bounced": 3,
    "spam": 0,
    "unsubscribed": 1
  }
}
```

**Campos:**

| Campo | Descrição |
|-------|-----------|
| `plan.name` | Nome do plano (`Free`, `Starter`, `Business`) |
| `plan.periodStart/End` | Datas do ciclo de cobrança atual |
| `credits.total` | Total de emails permitidos no período |
| `credits.remaining` | Emails restantes neste ciclo |
| `last30Days.deliveryRate` | Taxa de entrega em % |
| `last30Days.openRate` | Taxa de abertura sobre entregues em % |

---

## 2. Listar Campanhas

### `GET /emails/campaigns`

Retorna o histórico de todas as campanhas enviadas, ordenadas da mais recente para a mais antiga.

**Autenticação:** JWT Bearer token

**Resposta:**
```json
[
  {
    "id": "a1b2c3d4-...",
    "title": "Remarketing Manaus - Maio 2026",
    "subject": "Você perdeu a maior feira do Norte — ainda dá tempo!",
    "targetFairId": "fa342b59-...",
    "templateFairId": "fa342b59-...",
    "sendTo": "absent",
    "totalQueued": 342,
    "brevoTag": "emm-a1b2c3d4e5f6",
    "sentAt": "2026-05-26T18:45:00.000Z"
  }
]
```

**Campos:**

| Campo | Descrição |
|-------|-----------|
| `id` | UUID da campanha — use para buscar stats |
| `title` | Nome interno da campanha |
| `subject` | Subject line usado no email |
| `targetFairId` | Feira cujos visitantes receberam a campanha |
| `sendTo` | `"all"` (todos) ou `"absent"` (ausentes) |
| `totalQueued` | Total de emails enfileirados |
| `brevoTag` | Tag usada no Brevo para rastreamento |
| `sentAt` | Data/hora do envio |

---

## 3. Estatísticas de uma Campanha

### `GET /emails/campaigns/:id/stats`

Retorna métricas detalhadas de uma campanha específica, buscando os dados em tempo real do Brevo.

**Autenticação:** JWT Bearer token

**Parâmetros:** `:id` — UUID da campanha (obtido em `GET /emails/campaigns`)

**Resposta:**
```json
{
  "campaign": {
    "id": "a1b2c3d4-...",
    "title": "Remarketing Manaus - Maio 2026",
    "subject": "Você perdeu a maior feira do Norte — ainda dá tempo!",
    "targetFairId": "fa342b59-...",
    "templateFairId": "fa342b59-...",
    "sendTo": "absent",
    "totalQueued": 342,
    "brevoTag": "emm-a1b2c3d4e5f6",
    "sentAt": "2026-05-26T18:45:00.000Z"
  },
  "delivery": {
    "queued": 342,
    "delivered": 331,
    "deliveryRate": 96.8,
    "hardBounces": 2,
    "softBounces": 5,
    "blocked": 3,
    "spam": 0,
    "invalid": 1
  },
  "engagement": {
    "opens": 178,
    "uniqueOpens": 142,
    "openRate": 42.9,
    "clicks": 38,
    "uniqueClicks": 31,
    "clickRate": 11.5,
    "unsubscribed": 0
  }
}
```

**Campos de entrega:**

| Campo | Descrição |
|-------|-----------|
| `queued` | Total enfileirado na hora do envio |
| `delivered` | Confirmados como entregues |
| `deliveryRate` | `delivered / queued × 100` |
| `hardBounces` | Endereços inválidos permanentes |
| `softBounces` | Falha temporária (caixa cheia, servidor offline) |
| `blocked` | Bloqueados pela política do servidor destinatário |
| `spam` | Marcados como spam |

**Campos de engajamento:**

| Campo | Descrição |
|-------|-----------|
| `opens` | Total de aberturas (inclui reabertura pelo mesmo usuário) |
| `uniqueOpens` | Pessoas únicas que abriram |
| `openRate` | `uniqueOpens / delivered × 100` |
| `clicks` | Total de cliques em links |
| `uniqueClicks` | Pessoas únicas que clicaram |
| `clickRate` | `uniqueClicks / delivered × 100` |
| `unsubscribed` | Descadastros gerados por esta campanha |

---

## 4. Enviar Campanha

### `POST /emails/marketing/send`

Salva a campanha no banco, enfileira os emails e retorna o `campaignId` para acompanhamento.

**Autenticação:** JWT Bearer token

**Body:**
```json
{
  "title": "Remarketing Manaus - Maio 2026",
  "targetFairId": "fa342b59-1032-434c-9658-e532a1fa79bd",
  "templateFairId": "fa342b59-1032-434c-9658-e532a1fa79bd",
  "sendTo": "absent",
  "subject": "Você perdeu a maior feira do Norte — ainda dá tempo!",
  "htmlContent": "<html>...</html>"
}
```

**Campos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `title` | string (max 255) | Nome interno para identificar a campanha no histórico |
| `targetFairId` | UUID | Feira cujos visitantes receberão o email |
| `templateFairId` | UUID | Feira que serviu de base para montar o HTML (pode ser a mesma) |
| `sendTo` | `"all"` \| `"absent"` | `"all"` = todos os inscritos; `"absent"` = só quem não fez check-in |
| `subject` | string (max 500) | Subject line — aparece na caixa de entrada |
| `htmlContent` | string | HTML completo do email. Use `{{VISITOR_NAME}}` onde quiser o nome do destinatário |

**Resposta (sucesso):**
```json
{
  "success": true,
  "message": "342 email(s) enfileirados para envio",
  "campaignId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "brevoTag": "emm-a1b2c3d4e5f6",
  "targetFairId": "fa342b59-...",
  "templateFairId": "fa342b59-...",
  "sendTo": "absent",
  "totalQueued": 342,
  "status": "QUEUED"
}
```

**Resposta (sem destinatários):**
```json
{
  "success": true,
  "message": "Nenhum destinatário encontrado para os critérios informados",
  "totalQueued": 0,
  "status": "QUEUED"
}
```

---

## Boas Práticas de Subject Line

Subjects que performam melhor na base ExpoMultimix:

| Tipo | Exemplo | Por quê funciona |
|------|---------|------------------|
| Pergunta direta | `Você ainda vai à ExpoMultimix?` | Cria senso de questionamento pessoal |
| Urgência + benefício | `Últimas vagas: preços de fábrica te esperando` | Escassez + valor claro |
| Nome do evento | `ExpoMultimix Manaus – seu QR Code está aqui` | Relevância imediata |
| FOMO | `Você perdeu a maior feira do Norte — ainda dá tempo!` | Medo de perder |
| Número concreto | `+200 fabricantes em 1 lugar — venha ver` | Especificidade gera curiosidade |

**Evitar:**
- Tudo em maiúsculas (`PROMOÇÃO IMPERDÍVEL!!!`)
- Palavras spam (`grátis`, `ganhe`, `clique aqui`)
- Mais de 60 caracteres (trunca em mobile)

---

## Fluxo Recomendado no Frontend

```
1. Usuário monta o HTML da campanha (editor visual ou textarea)
2. Escolhe targetFairId e sendTo
3. Digita title (nome interno) e subject (o que o visitante vê)
4. POST /emails/marketing/send → recebe campaignId
5. Redirecionar para tela de acompanhamento

Na tela de acompanhamento:
6. GET /emails/campaigns → lista todas as campanhas
7. Seleciona uma → GET /emails/campaigns/:id/stats
8. Exibir cards: Enviados / Entregues / Abertos / Clicados
9. Exibir taxas: Taxa de entrega / Open rate / Click rate
10. GET /emails/account-stats → barra de créditos restantes no topo
```

---

## Placeholder de Nome

No `htmlContent`, use `{{VISITOR_NAME}}` onde quiser inserir o nome do destinatário. O worker substitui automaticamente antes de enviar:

```html
<h1>Olá, {{VISITOR_NAME}}! Sentimos sua falta na feira.</h1>
```

---

## Identificando Campanhas Campeãs

Use `GET /emails/campaigns` + `GET /emails/campaigns/:id/stats` para comparar campanhas e replicar as mais eficientes:

| Métrica | Ruim | Médio | Bom |
|---------|------|-------|-----|
| Taxa de entrega | < 85% | 85–95% | > 95% |
| Open rate | < 15% | 15–30% | > 30% |
| Click rate | < 2% | 2–5% | > 5% |

Campanhas com **open rate > 30%** devem ter seu subject e HTML preservados para reuso.
