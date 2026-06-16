import { Injectable, Logger } from '@nestjs/common';

export interface CnpjApiData {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao_cadastral: string;
  descricao_situacao_cadastral: string;
  email?: string;
  ddd_telefone_1?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  logradouro?: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  cnaes_secundarios?: Array<{ codigo: number; descricao: string }>;
  porte?: string;
}

@Injectable()
export class CnpjService {
  private readonly logger = new Logger(CnpjService.name);

  async lookup(cnpj: string): Promise<CnpjApiData | null> {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return null;

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
        headers: { 'User-Agent': 'credenciamento-api/1.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (res.status === 404) {
        this.logger.warn(`CNPJ ${clean} não encontrado na Receita Federal`);
        return null;
      }

      if (!res.ok) {
        this.logger.warn(`BrasilAPI retornou ${res.status} para CNPJ ${clean}`);
        return null;
      }

      return res.json() as Promise<CnpjApiData>;
    } catch (error) {
      this.logger.error(`Erro ao consultar CNPJ ${clean}: ${error.message}`);
      return null;
    }
  }

  formatCnpj(cnpj: string): string {
    const c = cnpj.replace(/\D/g, '').padStart(14, '0');
    return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`;
  }

  cleanCnpj(cnpj: string): string {
    return cnpj.replace(/\D/g, '');
  }

  isValid(cnpj: string): boolean {
    return this.cleanCnpj(cnpj).length === 14;
  }

  extractPhone(ddd: string): string | null {
    if (!ddd) return null;
    const digits = ddd.replace(/\D/g, '');
    if (digits.length < 10) return null;
    return digits;
  }
}
