import { ApiProperty } from '@nestjs/swagger';

export class FinanceCategoryResponseDto {
  @ApiProperty({ description: 'ID da categoria' })
  id: string;

  @ApiProperty({ description: 'Nome da categoria' })
  nome: string;

  @ApiProperty({ description: 'ID da categoria pai', required: false })
  parentId?: string;

  @ApiProperty({ description: 'Se é uma categoria global' })
  global: boolean;

  @ApiProperty({ description: 'ID da feira', required: false })
  fairId?: string;

  @ApiProperty({ description: 'Se é uma categoria obrigatória' })
  isRequired: boolean;

  @ApiProperty({ description: 'Descrição da categoria', required: false })
  description?: string;

  @ApiProperty({ description: 'Categoria pai', required: false })
  parent?: FinanceCategoryResponseDto;

  @ApiProperty({
    description: 'Categorias filhas',
    type: [FinanceCategoryResponseDto],
    required: false,
  })
  children?: FinanceCategoryResponseDto[];
}

export class RequiredCategoriesSummaryDto {
  @ApiProperty({ description: 'Total de categorias obrigatórias' })
  totalRequired: number;

  @ApiProperty({
    description: 'Lista de categorias obrigatórias',
    type: [Object],
  })
  categories: {
    id: string;
    nome: string;
    description?: string;
    isGlobal: boolean;
    parentId?: string;
  }[];
}
