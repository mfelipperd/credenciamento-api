# Integracao da Dashboard Financeira

## Endpoint principal

```http
GET /charts/fair/:fairId/kpi
```

O `fairId` deve ser o ID da feira atualmente selecionada no frontend. O endpoint retorna os indicadores de visitantes e os indicadores financeiros da feira.

O frontend nao deve recalcular receitas, despesas, lucro ou impostos. Esses valores sao consolidados pelo backend e o calculo tributario e compartilhado com o endpoint de balanco.

## Estrutura da resposta

```ts
interface FairKpi {
  receita: {
    totalContrato: number;
    contratosValidos: number;
    ticketMedio: number;
    totalRecebido: number;
    totalAReceber: number;
    totalVencido: number;
    inadimplencia: number;
    taxaRecebimento: number;
  };
  despesas: {
    total: number;
    diretas: number;
    rateadas: number;
  };
  resultado: {
    lucroProjetado: number;
    lucroRealizado: number;
    margemProjetada: number;
    margemRealizada: number;
    despesasSobreReceita: number;
    isProfitable: boolean;
  };
  visitantes: {
    total: number;
    checkins: number;
    taxaComparecimento: number;
    custoPorVisitante: number;
    custoPorStand: number;
  };
  impostos: {
    cnae: '8230-0/01';
    annex: 'III' | 'V';
    annualRevenue: number | null;
    annualAmount: number | null;
    amount: number | null;
    rbt12: number | null;
    rbt12Complete: boolean;
    bracket: number | null;
    nominalRate: number | null;
    deduction: number | null;
    effectiveRate: number | null;
    message: string;
  };
}
```

Todos os valores monetarios sao retornados em reais, com duas casas decimais. Percentuais sao retornados como numero percentual: `7.59` significa `7,59%`.

## Campos para os cards

| Campo | Exibicao sugerida |
|---|---|
| `receita.totalContrato` | Receita total da feira |
| `receita.contratosValidos` | Contratos validos |
| `receita.ticketMedio` | Ticket medio |
| `receita.totalRecebido` | Recebido |
| `receita.totalAReceber` | A receber |
| `receita.totalVencido` | Em atraso |
| `receita.inadimplencia` | Inadimplencia (%) |
| `receita.taxaRecebimento` | Taxa de recebimento (%) |
| `despesas.total` | Total de despesas |
| `resultado.lucroProjetado` | Lucro projetado |
| `resultado.lucroRealizado` | Lucro realizado |
| `resultado.margemProjetada` | Margem projetada (%) |
| `resultado.margemRealizada` | Margem realizada (%) |
| `resultado.despesasSobreReceita` | Despesas sobre receita (%) |
| `impostos.annualRevenue` | Faturamento anual da empresa |
| `impostos.annualAmount` | Imposto anual estimado |
| `impostos.amount` | Imposto estimado da feira |
| `impostos.effectiveRate` | Aliquota efetiva (%) |
| `visitantes.total` | Inscritos |
| `visitantes.checkins` | Check-ins |
| `visitantes.taxaComparecimento` | Taxa de comparecimento (%) |
| `visitantes.custoPorVisitante` | Custo por visitante |
| `visitantes.custoPorStand` | Custo por stand |

## Regra do imposto

O balanco e especifico para a feira selecionada, mas a faixa e a aliquota sao calculadas com o faturamento anual das feiras realizadas no mesmo ano da feira selecionada.

A base anual considera receitas:

- de todas as feiras do ano;
- com status diferente de `CANCELADO`;
- que nao estejam identificadas como permuta;
- com `contractValue` convertido de centavos para reais.

A formula da aliquota efetiva e:

```text
((faturamento anual * aliquota nominal) - parcela a deduzir)
/ faturamento anual
```

O valor da aliquota nominal e convertido corretamente de percentual para fracao antes do calculo.

O imposto da feira e calculado assim:

```text
impostos.amount = receita tributavel da feira * impostos.effectiveRate / 100
```

A resposta tambem informa:

- `impostos.annualAmount`: imposto estimado sobre todo o faturamento anual;
- `impostos.amount`: imposto proporcional da feira selecionada;
- `impostos.annualRevenue`: faturamento usado para identificar a faixa;
- `impostos.bracket`: faixa utilizada;
- `impostos.nominalRate`: aliquota nominal da faixa;
- `impostos.deduction`: parcela a deduzir;
- `impostos.effectiveRate`: aliquota efetiva final.

## Estimativa e valores nulos

No endpoint da dashboard, o faturamento anual e calculado automaticamente pelo backend e `rbt12Complete` permanece `false`, pois o sistema nao confirma que todas as receitas da empresa foram cadastradas.

Quando `annualRevenue`, `annualAmount` ou `amount` forem `null`, o frontend deve exibir um estado de estimativa ou indisponibilidade, sem substituir por zero silenciosamente.

Use `impostos.message` como aviso ao usuario quando estiver preenchido.

## Endpoint de balanco

```http
GET /cash-flow/report/consolidated/:fairId
```

Esse endpoint retorna os mesmos dados financeiros usados pela dashboard. Ele aceita configuracao manual para conferencia contabil:

```http
GET /cash-flow/report/consolidated/:fairId?rbt12=250000&annex=III
```

- `rbt12`: valor manual em reais;
- `annex`: `III` ou `V`;
- se `rbt12` for informado, `taxes.rbt12Complete` sera `true`;
- se omitido, o backend usa a soma anual calculada e marca o resultado como estimativa.

## Observacoes de implementacao

- Receitas canceladas nao entram nos totais.
- Permutas ficam fora da receita tributavel.
- Despesas nao reduzem a base do Simples Nacional.
- `resultado.lucroProjetado` considera receita da feira, despesas da feira e o imposto estimado da feira.
- `resultado.lucroRealizado` considera recebimentos, despesas e imposto estimado da feira.
- O frontend deve atualizar os cards sempre que o `fairId` selecionado mudar.
