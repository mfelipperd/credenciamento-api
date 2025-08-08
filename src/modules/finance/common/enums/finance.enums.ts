export enum EntryModelType {
  STAND = 'STAND',
  PATROCINIO = 'PATROCINIO',
}

export enum RevenueStatus {
  PENDENTE = 'PENDENTE',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  EM_ATRASO = 'EM_ATRASO',
  PAGO = 'PAGO',
  CANCELADO = 'CANCELADO',
}

export enum InstallmentStatus {
  A_VENCER = 'A_VENCER',
  VENCIDA = 'VENCIDA',
  PAGA = 'PAGA',
  CANCELADA = 'CANCELADA',
}

export enum PaymentMethod {
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CARTAO = 'CARTAO',
  TED = 'TED',
  DINHEIRO = 'DINHEIRO',
}
