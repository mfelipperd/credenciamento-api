import { Injectable } from '@nestjs/common';

// Mapeamento: primeiros 2 dígitos do código CNAE → setor de negócio
const CNAE_SECTOR_MAP: Record<string, string> = {
  '01': 'Agronegócio',
  '02': 'Agronegócio',
  '03': 'Agronegócio',
  '05': 'Mineração',
  '06': 'Petróleo e Gás',
  '07': 'Mineração',
  '08': 'Mineração',
  '09': 'Mineração',
  '10': 'Alimentos e Bebidas',
  '11': 'Alimentos e Bebidas',
  '12': 'Fumo',
  '13': 'Têxtil e Moda',
  '14': 'Têxtil e Moda',
  '15': 'Couro e Calçados',
  '16': 'Madeira e Móveis',
  '17': 'Papel e Celulose',
  '18': 'Gráfica e Embalagens',
  '19': 'Petróleo e Químicos',
  '20': 'Química e Fertilizantes',
  '21': 'Farmacêutico',
  '22': 'Borracha e Plástico',
  '23': 'Cerâmica e Vidro',
  '24': 'Metalurgia',
  '25': 'Produtos de Metal',
  '26': 'Eletrônicos e Informática',
  '27': 'Equipamentos Elétricos',
  '28': 'Máquinas e Equipamentos',
  '29': 'Veículos e Autopeças',
  '30': 'Outros Veículos',
  '31': 'Móveis',
  '32': 'Indústria Diversa',
  '33': 'Manutenção Industrial',
  '35': 'Energia',
  '36': 'Água e Saneamento',
  '37': 'Esgoto e Resíduos',
  '38': 'Gestão de Resíduos',
  '39': 'Descontaminação',
  '41': 'Construção Civil',
  '42': 'Obras de Infraestrutura',
  '43': 'Serviços Especializados de Construção',
  '45': 'Comércio Automotivo',
  '46': 'Comércio Atacadista',
  '47': 'Comércio Varejista',
  '49': 'Transporte Terrestre',
  '50': 'Transporte Aquaviário',
  '51': 'Transporte Aéreo',
  '52': 'Armazenagem e Logística',
  '53': 'Correios e Entregas',
  '55': 'Hotelaria',
  '56': 'Alimentação e Restaurantes',
  '58': 'Publicações e Editoras',
  '59': 'Audiovisual e Entretenimento',
  '60': 'Rádio e TV',
  '61': 'Telecomunicações',
  '62': 'TI e Software',
  '63': 'Dados e Serviços de TI',
  '64': 'Bancos e Financeiras',
  '65': 'Seguros e Previdência',
  '66': 'Serviços Financeiros',
  '68': 'Imóveis',
  '69': 'Jurídico e Contabilidade',
  '70': 'Consultoria Empresarial',
  '71': 'Arquitetura e Engenharia',
  '72': 'Pesquisa e Desenvolvimento',
  '73': 'Publicidade e Marketing',
  '74': 'Design e Fotografia',
  '75': 'Veterinário',
  '77': 'Locação e Leasing',
  '78': 'RH e Recrutamento',
  '79': 'Viagens e Eventos',
  '80': 'Segurança',
  '81': 'Limpeza e Facilities',
  '82': 'Serviços Administrativos',
  '84': 'Administração Pública',
  '85': 'Educação',
  '86': 'Saúde',
  '87': 'Cuidados e Reabilitação',
  '88': 'Assistência Social',
  '90': 'Arte e Cultura',
  '91': 'Museus e Patrimônio',
  '92': 'Jogos e Apostas',
  '93': 'Esporte e Lazer',
  '94': 'Associações e Sindicatos',
  '95': 'Manutenção de TI e Eletrônicos',
  '96': 'Serviços Pessoais',
  '99': 'Organismos Internacionais',
};

// Grupos de setores B2B prioritários para ExpoMultimix
export const B2B_PRIORITY_SECTORS = [
  'TI e Software',
  'Dados e Serviços de TI',
  'Eletrônicos e Informática',
  'Telecomunicações',
  'Equipamentos Elétricos',
  'Máquinas e Equipamentos',
  'Publicidade e Marketing',
  'Design e Fotografia',
  'Audiovisual e Entretenimento',
  'Comércio Atacadista',
  'Comércio Varejista',
  'Consultoria Empresarial',
  'Gráfica e Embalagens',
  'Viagens e Eventos',
  'Rádio e TV',
  'Publicações e Editoras',
];

@Injectable()
export class CnaeService {
  classify(cnaeCode: string | number): string {
    const code = String(cnaeCode).replace(/\D/g, '');
    const division = code.slice(0, 2);
    return CNAE_SECTOR_MAP[division] ?? 'Outros';
  }

  isB2bPriority(sector: string): boolean {
    return B2B_PRIORITY_SECTORS.includes(sector);
  }

  getAllSectors(): string[] {
    return [...new Set(Object.values(CNAE_SECTOR_MAP))].sort();
  }

  getSectorMap(): Record<string, string> {
    return CNAE_SECTOR_MAP;
  }
}
