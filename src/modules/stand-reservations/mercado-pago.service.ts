import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac } from 'crypto';

const API_BASE = 'https://api.mercadopago.com';

export interface CreatePixOrderParams {
  externalReference: string;
  amountCents: number;
  description: string;
  notificationUrl: string;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
    cpf?: string;
  };
}

export interface CreateCardOrderParams {
  externalReference: string;
  amountCents: number;
  description: string;
  notificationUrl: string;
  cardToken: string;
  installments: number;
  issuerId?: string;
  paymentMethodId: string;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
    cpf?: string;
  };
}

export interface MercadoPagoOrderResult {
  mpOrderId: string;
  status: string;
  statusDetail?: string;
  paymentMethodId?: string;
  installments?: number;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
}

/** Único par (status, status_detail) que a documentação confirma como "pago de
 * verdade" — qualquer outra combinação (mesmo "processed" com outro detail,
 * como partially_refunded) não deve liberar o stand. */
export function isMercadoPagoOrderPaid(status?: string, statusDetail?: string): boolean {
  return status === 'processed' && statusDetail === 'accredited';
}

/**
 * Cliente da Orders API do Mercado Pago (https://api.mercadopago.com/v1/orders),
 * que unifica Pix e Cartão num único endpoint. Documentação consultada em
 * mercadopago.com.br/developers/pt/docs/checkout-api-orders.
 */
@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);

  // Lidas sob demanda (não no boot): checkout de stand é uma feature entre
  // várias nessa API — sem a credencial configurada, só ela deve falhar,
  // nunca a aplicação inteira (check-in, painel admin etc. não podem cair
  // junto por causa disso).
  private get accessToken(): string {
    const value = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!value) {
      throw new ServiceUnavailableException(
        'Pagamento online ainda não está configurado (MERCADO_PAGO_ACCESS_TOKEN ausente).',
      );
    }
    return value;
  }

  private get webhookSecret(): string {
    const value = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (!value) {
      throw new ServiceUnavailableException(
        'Pagamento online ainda não está configurado (MERCADO_PAGO_WEBHOOK_SECRET ausente).',
      );
    }
    return value;
  }

  async createPixOrder(params: CreatePixOrderParams): Promise<MercadoPagoOrderResult> {
    const amount = (params.amountCents / 100).toFixed(2);
    const body = {
      type: 'online',
      processing_mode: 'automatic',
      total_amount: amount,
      external_reference: params.externalReference,
      notification_url: params.notificationUrl,
      payer: this.buildPayer(params.payer),
      transactions: {
        payments: [
          {
            amount,
            payment_method: { id: 'pix', type: 'bank_transfer' },
          },
        ],
      },
    };

    const data = await this.post('/v1/orders', body, params.externalReference);
    const payment = data.transactions?.payments?.[0];

    return {
      mpOrderId: data.id,
      status: data.status,
      statusDetail: data.status_detail,
      paymentMethodId: 'pix',
      pixQrCode: payment?.payment_method?.qr_code,
      pixQrCodeBase64: payment?.payment_method?.qr_code_base64,
    };
  }

  async createCardOrder(params: CreateCardOrderParams): Promise<MercadoPagoOrderResult> {
    const amount = (params.amountCents / 100).toFixed(2);
    const body = {
      type: 'online',
      processing_mode: 'automatic',
      total_amount: amount,
      external_reference: params.externalReference,
      notification_url: params.notificationUrl,
      payer: this.buildPayer(params.payer),
      transactions: {
        payments: [
          {
            amount,
            payment_method: {
              id: params.paymentMethodId,
              type: 'credit_card',
              token: params.cardToken,
              installments: params.installments,
              issuer_id: params.issuerId,
            },
          },
        ],
      },
    };

    const data = await this.post('/v1/orders', body, params.externalReference);

    return {
      mpOrderId: data.id,
      status: data.status,
      statusDetail: data.status_detail,
      paymentMethodId: params.paymentMethodId,
      installments: params.installments,
    };
  }

  /** Busca a order direto na API — nunca confiamos só no corpo do webhook. */
  async getOrder(
    mpOrderId: string,
  ): Promise<{ status: string; statusDetail?: string } | null> {
    const response = await fetch(`${API_BASE}/v1/orders/${mpOrderId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) {
      this.logger.error(`Erro ao buscar order ${mpOrderId} (${response.status})`);
      return null;
    }
    const data = await response.json();
    return { status: data.status, statusDetail: data.status_detail };
  }

  /**
   * Valida o header x-signature conforme documentado: manifest
   * "id:{data.id};request-id:{x-request-id};ts:{ts};" assinado com
   * HMAC-SHA256 usando o secret configurado no painel de integrações.
   */
  validateWebhookSignature(params: {
    xSignature: string;
    xRequestId: string;
    dataId: string;
  }): boolean {
    const parts = Object.fromEntries(
      params.xSignature.split(',').map((p) => {
        const [key, value] = p.split('=');
        return [key.trim(), value?.trim()];
      }),
    );
    const ts = parts.ts;
    const hash = parts.v1;
    if (!ts || !hash) return false;

    const manifest = `id:${params.dataId};request-id:${params.xRequestId};ts:${ts};`;
    const computed = createHmac('sha256', this.webhookSecret)
      .update(manifest)
      .digest('hex');

    return computed === hash;
  }

  private buildPayer(payer: CreatePixOrderParams['payer']) {
    return {
      email: payer.email,
      first_name: payer.firstName,
      last_name: payer.lastName,
      ...(payer.cpf
        ? { identification: { type: 'CPF', number: payer.cpf } }
        : {}),
    };
  }

  private async post(path: string, body: unknown, idempotencyKey: string) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '');
      this.logger.error(
        `Erro na API do Mercado Pago (${response.status}) em ${path}: ${responseBody}`,
      );
      throw new ServiceUnavailableException(
        'Não foi possível processar o pagamento agora. Tente novamente em instantes.',
      );
    }

    return response.json();
  }
}
