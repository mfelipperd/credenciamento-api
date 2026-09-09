const MASK = '****';

/**
 * Mascara um valor mantendo alguns caracteres visíveis nas pontas e usando
 * um número FIXO de asteriscos no meio — de propósito, pra não revelar o
 * tamanho real do valor original.
 */
function maskWithFixedMiddle(value: string, keepStart: number, keepEnd: number): string {
  if (value.length <= keepStart + keepEnd) {
    return MASK;
  }
  return `${value.slice(0, keepStart)}${MASK}${value.slice(-keepEnd)}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return MASK;
  const maskedLocal = maskWithFixedMiddle(local, 2, 1);
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return maskWithFixedMiddle(digits, 4, 4);
}

export function maskCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  return maskWithFixedMiddle(digits, 2, 4);
}
