# Estratégia de Disparo em Massa via WhatsApp com Z-API + Node.js

## Visão Geral

Este documento descreve a arquitetura completa, regras de negócio, estrutura de código e boas práticas para implementar um sistema de disparo em massa de mensagens WhatsApp utilizando a Z-API integrada a uma API Node.js existente com banco de dados de 3.000+ contatos.

O objetivo principal é **não ser banido**, garantindo envios controlados, personalizados e rastreáveis.

---

## Stack Tecnológica

- **Runtime:** Node.js (API já existente)
- **Fila de jobs:** Bull (recomendado, requer Redis) ou `p-queue` (sem dependência externa)
- **HTTP Client:** `node-fetch` ou `axios`
- **Banco de dados:** o existente (MySQL, PostgreSQL, MongoDB — adaptar conforme o projeto)
- **Webhooks:** endpoint Express/Fastify já existente na API
- **Provider WhatsApp:** Z-API (`https://api.z-api.io`)

---

## Arquitetura do Sistema

```
[Banco de Dados]
      │
      ▼
[Módulo de Segmentação]   ← filtra contatos por opt-in, categoria, lote
      │
      ▼
[Fila com Rate Limiting]  ← Bull ou p-queue, delay entre mensagens
      │
      ▼
[Módulo de Envio Z-API]   ← POST /send-text com personalização
      │
      ▼
[WhatsApp (entrega)]
      │
      ▼ (webhook)
[Módulo de Monitoramento] ← logs de entrega, leitura, falhas, opt-out
```

---

## Configuração do Z-API

### 1. Criar conta e instância

1. Acessar `https://app.z-api.io`
2. Criar uma nova instância
3. Ler o QR Code com o WhatsApp do número que será usado para disparo
4. Copiar as credenciais:
   - `INSTANCE_ID` — ID da instância
   - `INSTANCE_TOKEN` — token da instância
   - `CLIENT_TOKEN` — token de segurança do cliente (enviado no header)

### 2. Variáveis de ambiente (.env)

```env
ZAPI_INSTANCE_ID=sua_instancia_aqui
ZAPI_TOKEN=seu_token_aqui
ZAPI_CLIENT_TOKEN=seu_client_token_aqui
ZAPI_BASE_URL=https://api.z-api.io/instances
WEBHOOK_SECRET=chave_secreta_para_validar_webhook
```

### 3. Endpoint base de envio

```
POST https://api.z-api.io/instances/{INSTANCE_ID}/token/{TOKEN}/send-text
Header: client-token: {CLIENT_TOKEN}
```

---

## Estrutura de Pastas Sugerida

```
src/
├── zapi/
│   ├── client.js          # cliente HTTP da Z-API
│   ├── sender.js          # função de envio individual
│   └── webhook.js         # handler de eventos recebidos
├── campaign/
│   ├── segmentation.js    # filtra e prepara lotes de contatos
│   ├── queue.js           # fila de envio com rate limiting
│   └── campaign.js        # orquestra toda a campanha
├── models/
│   └── contact.js         # model de contato (adaptar ao banco existente)
└── routes/
    └── webhook.route.js   # rota do webhook Z-API
```

---

## Implementação

### `src/zapi/client.js` — Cliente HTTP da Z-API

```javascript
import fetch from 'node-fetch';

const BASE_URL = process.env.ZAPI_BASE_URL;
const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const TOKEN = process.env.ZAPI_TOKEN;
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;

export async function zapiPost(endpoint, body) {
  const url = `${BASE_URL}/${INSTANCE_ID}/token/${TOKEN}/${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'client-token': CLIENT_TOKEN,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Z-API error [${response.status}]: ${JSON.stringify(error)}`,
    );
  }

  return response.json();
}
```

---

### `src/zapi/sender.js` — Envio Individual com Retry

```javascript
import { zapiPost } from './client.js';

/**
 * Envia uma mensagem de texto para um contato.
 * @param {Object} contato - { telefone: '5511999999999', nome: 'João' }
 * @param {string} mensagem - texto da mensagem (pode conter variáveis já interpoladas)
 * @param {number} tentativa - controle interno de retry
 */
export async function enviarMensagem(contato, mensagem, tentativa = 1) {
  const MAX_TENTATIVAS = 3;
  const DELAY_RETRY_MS = 10000; // 10s entre retries

  try {
    const result = await zapiPost('send-text', {
      phone: contato.telefone,
      message: mensagem,
    });

    console.log(
      `[OK] Mensagem enviada para ${contato.telefone} | ID: ${result.zaapId}`,
    );
    return { sucesso: true, zaapId: result.zaapId, contato };
  } catch (err) {
    console.error(
      `[ERRO] Tentativa ${tentativa}/${MAX_TENTATIVAS} para ${contato.telefone}: ${err.message}`,
    );

    if (tentativa < MAX_TENTATIVAS) {
      await sleep(DELAY_RETRY_MS);
      return enviarMensagem(contato, mensagem, tentativa + 1);
    }

    return { sucesso: false, erro: err.message, contato };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

---

### `src/campaign/segmentation.js` — Segmentação de Contatos

```javascript
/**
 * Busca contatos aptos para a campanha.
 * Adaptar a query ao banco de dados existente.
 *
 * Critérios obrigatórios:
 * - opt_in = true (consentimento do usuário)
 * - opt_out = false (não cancelou recebimento)
 * - telefone válido (começa com 55 + DDD + número)
 *
 * @param {Object} db - instância do banco de dados
 * @param {Object} filtros - { categoria, limite }
 */
export async function buscarContatosParaCampanha(db, filtros = {}) {
  const { categoria = null, limite = 3000 } = filtros;

  // ADAPTAR esta query ao ORM/banco do projeto
  const contatos = await db.query(`
    SELECT id, nome, telefone, categoria
    FROM contatos
    WHERE opt_in = true
      AND opt_out = false
      AND telefone IS NOT NULL
      AND telefone != ''
      ${categoria ? `AND categoria = '${categoria}'` : ''}
    LIMIT ${limite}
  `);

  return contatos
    .filter((c) => validarTelefone(c.telefone))
    .map((c) => ({
      ...c,
      telefone: normalizarTelefone(c.telefone),
    }));
}

/**
 * Divide um array em lotes menores.
 * Nunca enviar mais de 50 contatos por lote.
 */
export function dividirEmLotes(contatos, tamanhoLote = 50) {
  const lotes = [];
  for (let i = 0; i < contatos.length; i += tamanhoLote) {
    lotes.push(contatos.slice(i, i + tamanhoLote));
  }
  return lotes;
}

/**
 * Valida se o telefone está no formato esperado pela Z-API.
 * Formato: apenas dígitos, começando com 55 (Brasil).
 * Exemplos válidos: 5511999998888, 5521988887777
 */
function validarTelefone(tel) {
  const limpo = tel.replace(/\D/g, '');
  return /^55\d{10,11}$/.test(limpo);
}

/**
 * Remove caracteres não numéricos do telefone.
 */
function normalizarTelefone(tel) {
  return tel.replace(/\D/g, '');
}
```

---

### `src/campaign/queue.js` — Fila com Rate Limiting

```javascript
import PQueue from 'p-queue';
import { enviarMensagem } from '../zapi/sender.js';

// Configurações de rate limiting
const CONFIG = {
  DELAY_ENTRE_MENSAGENS_MS: 7000, // 7 segundos entre cada mensagem
  DELAY_ENTRE_LOTES_MS: 900000, // 15 minutos entre lotes (900.000ms)
  CONCORRENCIA: 1, // NUNCA alterar para > 1 (risco de ban)
};

/**
 * Cria e retorna a fila de envio configurada.
 */
export function criarFila() {
  return new PQueue({
    concurrency: CONFIG.CONCORRENCIA,
    interval: CONFIG.DELAY_ENTRE_MENSAGENS_MS,
    intervalCap: 1,
  });
}

/**
 * Processa um único lote de contatos na fila.
 * @param {PQueue} fila
 * @param {Array} lote - array de contatos
 * @param {string} templateMensagem - texto com variáveis ex: "Olá, {{nome}}!"
 * @param {Function} onResultado - callback chamado após cada envio
 */
export async function processarLote(fila, lote, templateMensagem, onResultado) {
  const promises = lote.map((contato) =>
    fila.add(async () => {
      const mensagem = interpolarMensagem(templateMensagem, contato);
      const resultado = await enviarMensagem(contato, mensagem);
      if (onResultado) onResultado(resultado);
      return resultado;
    }),
  );

  return Promise.all(promises);
}

/**
 * Substitui variáveis no template da mensagem.
 * Suporta: {{nome}}, {{telefone}}, {{categoria}} e qualquer campo do contato.
 */
function interpolarMensagem(template, contato) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, chave) => {
    return contato[chave] ?? '';
  });
}

export { CONFIG };
```

---

### `src/campaign/campaign.js` — Orquestrador da Campanha

```javascript
import { buscarContatosParaCampanha, dividirEmLotes } from './segmentation.js';
import { criarFila, processarLote, CONFIG } from './queue.js';

/**
 * Executa uma campanha de disparo completa.
 *
 * @param {Object} db - instância do banco de dados
 * @param {Object} opcoes - configurações da campanha
 * @param {string} opcoes.mensagem - template da mensagem com variáveis {{nome}} etc.
 * @param {string} [opcoes.categoria] - filtrar contatos por categoria (opcional)
 * @param {number} [opcoes.tamanhoLote=50] - contatos por lote (máx. recomendado: 50)
 */
export async function executarCampanha(db, opcoes) {
  const { mensagem, categoria = null, tamanhoLote = 50 } = opcoes;

  console.log('[CAMPANHA] Iniciando...');

  // 1. Buscar e segmentar contatos
  const contatos = await buscarContatosParaCampanha(db, { categoria });
  console.log(`[CAMPANHA] ${contatos.length} contatos encontrados`);

  if (contatos.length === 0) {
    console.log('[CAMPANHA] Nenhum contato válido. Encerrando.');
    return;
  }

  // 2. Dividir em lotes
  const lotes = dividirEmLotes(contatos, tamanhoLote);
  console.log(`[CAMPANHA] ${lotes.length} lotes de ${tamanhoLote} contatos`);

  // 3. Criar fila
  const fila = criarFila();

  // 4. Estatísticas
  const stats = { total: contatos.length, enviados: 0, falhas: 0 };

  // 5. Processar lotes com pausa entre eles
  for (let i = 0; i < lotes.length; i++) {
    console.log(`[CAMPANHA] Processando lote ${i + 1}/${lotes.length}...`);

    await processarLote(fila, lotes[i], mensagem, (resultado) => {
      if (resultado.sucesso) {
        stats.enviados++;
      } else {
        stats.falhas++;
        console.warn(
          `[FALHA] ${resultado.contato.telefone}: ${resultado.erro}`,
        );
      }
    });

    // Aguardar fila do lote atual zerar antes de continuar
    await fila.onIdle();

    // Pausa entre lotes (exceto após o último)
    if (i < lotes.length - 1) {
      const minutos = CONFIG.DELAY_ENTRE_LOTES_MS / 60000;
      console.log(
        `[CAMPANHA] Lote ${i + 1} concluído. Aguardando ${minutos} minutos para o próximo lote...`,
      );
      await sleep(CONFIG.DELAY_ENTRE_LOTES_MS);
    }
  }

  console.log('[CAMPANHA] Finalizada!');
  console.log(
    `[STATS] Total: ${stats.total} | Enviados: ${stats.enviados} | Falhas: ${stats.falhas}`,
  );

  return stats;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

---

### `src/zapi/webhook.js` — Handler de Eventos do Webhook

```javascript
/**
 * Processa os eventos recebidos via webhook da Z-API.
 * Eventos principais:
 * - message-status: atualização de status de uma mensagem enviada
 * - received-callback: nova mensagem recebida do contato
 */
export async function handleWebhookEvent(db, evento) {
  const { type, phone, status, zaapId } = evento;

  switch (type) {
    case 'message-status':
      await registrarStatusMensagem(db, { zaapId, phone, status });
      break;

    case 'received-callback':
      await registrarRespostaContato(db, {
        phone,
        mensagem: evento.text?.message,
      });

      // Se o contato responder SAIR, PARAR, NÃO QUERO etc → aplicar opt-out
      if (detectarOptOut(evento.text?.message)) {
        await aplicarOptOut(db, phone);
        console.log(`[OPT-OUT] Contato ${phone} removido da lista.`);
      }
      break;

    default:
      console.log(`[WEBHOOK] Evento ignorado: ${type}`);
  }
}

function detectarOptOut(mensagem = '') {
  const palavras = [
    'sair',
    'parar',
    'cancelar',
    'não quero',
    'nao quero',
    'remover',
    'stop',
  ];
  const texto = mensagem.toLowerCase().trim();
  return palavras.some((p) => texto.includes(p));
}

// Adaptar ao banco de dados do projeto
async function registrarStatusMensagem(db, { zaapId, phone, status }) {
  // ex: await db.query(`UPDATE mensagens_enviadas SET status = ? WHERE zaap_id = ?`, [status, zaapId]);
  console.log(`[STATUS] ${phone} → ${status} (ID: ${zaapId})`);
}

async function registrarRespostaContato(db, { phone, mensagem }) {
  // ex: await db.query(`INSERT INTO respostas (telefone, mensagem) VALUES (?, ?)`, [phone, mensagem]);
  console.log(`[RESPOSTA] ${phone}: ${mensagem}`);
}

async function aplicarOptOut(db, phone) {
  // ex: await db.query(`UPDATE contatos SET opt_out = true WHERE telefone = ?`, [phone]);
}
```

---

### `src/routes/webhook.route.js` — Rota do Webhook

```javascript
import express from 'express';
import { handleWebhookEvent } from '../zapi/webhook.js';

const router = express.Router();

/**
 * Configurar esta URL no painel da Z-API:
 * https://sua-api.com/webhook/zapi
 */
router.post('/zapi', async (req, res) => {
  // Validar token de segurança (opcional mas recomendado)
  const clientToken = req.headers['client-token'];
  if (clientToken !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ erro: 'Token inválido' });
  }

  try {
    await handleWebhookEvent(req.db, req.body); // req.db = instância do banco
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[WEBHOOK] Erro:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

export default router;
```

---

## Como Usar — Exemplo de Disparo

```javascript
// disparo.js — executar via CLI: node disparo.js
import db from './src/database.js'; // adaptar ao banco existente
import { executarCampanha } from './src/campaign/campaign.js';

await executarCampanha(db, {
  mensagem: `Olá, {{nome}}! 👋

Temos uma novidade especial para você.
Acesse: https://seusite.com.br/promo

Para não receber mais mensagens, responda *SAIR*.`,

  categoria: 'clientes_ativos', // opcional — null para todos
  tamanhoLote: 50,
});
```

---

## Configuração do Webhook no Painel Z-API

1. Acessar o painel em `https://app.z-api.io`
2. Selecionar a instância
3. Ir em **Webhooks**
4. Configurar as seguintes URLs:

| Evento              | URL                                |
| ------------------- | ---------------------------------- |
| `message-status`    | `https://sua-api.com/webhook/zapi` |
| `received-callback` | `https://sua-api.com/webhook/zapi` |
| `disconnected`      | `https://sua-api.com/webhook/zapi` |

5. Ativar os eventos desejados e salvar.

---

## Dependências NPM

```bash
npm install p-queue node-fetch dotenv
# Se usar Bull (recomendado para produção com Redis):
npm install bull ioredis
```

### `package.json` (trecho relevante)

```json
{
  "type": "module",
  "dependencies": {
    "p-queue": "^8.0.1",
    "node-fetch": "^3.3.2",
    "dotenv": "^16.4.5"
  }
}
```

---

## Tabela de Rate Limiting Recomendado

| Volume de contatos | Delay entre msgs | Tamanho do lote | Pausa entre lotes |
| ------------------ | ---------------- | --------------- | ----------------- |
| Até 500            | 5s               | 50              | 10 min            |
| 500 – 1.500        | 7s               | 50              | 15 min            |
| 1.500 – 3.000      | 10s              | 40              | 20 min            |
| 3.000+             | 12s              | 30              | 30 min            |

> Para 3.000 contatos com delay de 10s e lotes de 40: estimativa de ~12–14 horas de disparo total, distribuídas ao longo do dia.

---

## Regras de Negócio Obrigatórias

### Opt-in e Opt-out

- **Nunca enviar** para contatos sem `opt_in = true` no banco
- **Aplicar opt-out imediato** quando o contato responder com palavras como: `sair`, `parar`, `cancelar`, `stop`, `não quero`
- **Nunca reenviar** para o mesmo contato na mesma campanha
- **Registrar** todas as respostas no banco para histórico

### Conteúdo das mensagens

- Personalizar sempre com o nome do contato (`{{nome}}`)
- Incluir instrução de opt-out ao final: _"Para não receber mais mensagens, responda SAIR"_
- Evitar palavras que ativam filtros de spam: "grátis", "promoção imperdível", "clique agora", "urgente"
- Não enviar links encurtados genéricos (bit.ly, etc.) — usar domínio próprio

### Horário de envio

- Enviar **somente entre 8h e 20h** (horário de Brasília)
- Nunca enviar em domingos ou feriados nacionais
- Implementar verificação de horário antes de iniciar a campanha

### Monitoramento de saúde da instância

- Verificar status da instância antes de iniciar: `GET /instances/{id}/token/{token}/status`
- Se status retornar `disconnected` → interromper campanha e alertar
- Monitorar taxa de falhas: se > 10% das mensagens falharem → pausar e investigar

---

## Verificação de Status da Instância

```javascript
// Verificar antes de iniciar qualquer campanha
export async function verificarInstancia() {
  const url = `${process.env.ZAPI_BASE_URL}/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/status`;

  const res = await fetch(url, {
    headers: { 'client-token': process.env.ZAPI_CLIENT_TOKEN },
  });

  const data = await res.json();

  if (data.connected !== true) {
    throw new Error(
      `Instância Z-API desconectada. Status: ${JSON.stringify(data)}`,
    );
  }

  console.log('[Z-API] Instância conectada e pronta.');
  return true;
}
```

---

## Checklist de Segurança Antes de Cada Disparo

- [ ] Instância Z-API conectada (verificar QR code se necessário)
- [ ] Lista de contatos filtrada apenas com `opt_in = true`
- [ ] Telefones normalizados no formato `55DDNÚMERO`
- [ ] Template da mensagem revisado e com opt-out informado
- [ ] Delay entre mensagens configurado (mínimo 5s)
- [ ] Webhooks configurados no painel Z-API
- [ ] Horário de envio dentro da janela 8h–20h
- [ ] Banco de dados com tabela/campo para registrar status de envio

---

## Estrutura de Banco de Dados Sugerida

```sql
-- Tabela de contatos (adaptar à estrutura existente)
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS opt_in BOOLEAN DEFAULT false;
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS opt_out BOOLEAN DEFAULT false;
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS opt_out_em TIMESTAMP;

-- Tabela de log de envios
CREATE TABLE IF NOT EXISTS disparos_log (
  id SERIAL PRIMARY KEY,
  campanha_id VARCHAR(100),
  contato_id INT,
  telefone VARCHAR(20),
  zaap_id VARCHAR(100),
  status VARCHAR(50),   -- enviado | entregue | lido | falhou
  tentativas INT DEFAULT 1,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de respostas recebidas
CREATE TABLE IF NOT EXISTS respostas_recebidas (
  id SERIAL PRIMARY KEY,
  telefone VARCHAR(20),
  mensagem TEXT,
  recebido_em TIMESTAMP DEFAULT NOW()
);
```

---

## Referências

- Documentação Z-API: `https://developer.z-api.io`
- Comparativo Z-API vs API Oficial: `https://developer.z-api.io/tips/Z-APIvsAPI-OFICIAL`
- Políticas de uso WhatsApp: `https://www.whatsapp.com/legal`
- Repositório p-queue: `https://github.com/sindresorhus/p-queue`
