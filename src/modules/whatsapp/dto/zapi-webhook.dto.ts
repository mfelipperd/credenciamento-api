export interface ZapiWebhookEvent {
  type: 'message-status' | 'received-callback' | 'disconnected' | string;
  phone?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed' | string;
  zaapId?: string;
  text?: { message?: string };
}
