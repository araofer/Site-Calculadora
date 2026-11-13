/**
 * Testes Automatizados — Calculadora de Taxa da Maquininha (#52)
 * Calculadora Master
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  arredondarMoeda,
  arredondarPercentual,
  parseTaxaPercentual,
  distribuirParcelas,
  temParcelasZeradas,
  calcularTaxaMaquininha,
  getResultSections,
  setupTool,
  TEXTO_AVISO_PARCELA_ZERADA
} from '../js/tools/taxa-maquininha.js';
import { formatResultText } from '../js/core/result-actions.js';

const paginaTaxaMaquininha = readFileSync(
  new URL('../src/pages/tools/financas/taxa-maquininha.page.html', import.meta.url),
  'utf8'
);

/* ==========================================================================
 * 1. Cálculos no Modo Direto (Descontar Taxa da Venda)
 * ========================================================================== */

test('Taxa Maquininha Direto: Débito R$ 100,00 a 1,99% sem tarifa fixa', () => {
  const res = calcularTaxaMaquininha({
    objetivo: 'direto',
    modalidade: 'debito',
    valor: '100,00',
    taxaPercentual: '1,99',
    tarifaFixa: ''
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.objetivo, 'direto');
  assert.equal(res.data.modalidade, 'debito');
  assert.equal(res.data.valorCobrado, 100.00);
  assert.equal(res.data.taxaPercentual, 1.99);
  assert.equal(res.data.tarifaFixa, 0.00);
  assert.equal(res.data.valorDesconto, 1.99);
  assert.equal(res.data.valorLiquido, 98.01);
  assert.equal(res.data.taxaEfetivaTotal, 1.99);
});

test('Taxa Maquininha Direto: Crédito à vista R$ 500,00 a 3,50% com tarifa fixa R$ 0,40', () => {
  const res = calcularTaxaMaquininha({
    objetivo: 'direto',
    modalidade: 'credito_vista',
    valor: 500,
    taxaPercentual: 3.5,
    tarifaFixa: '0,40'
  });

  assert.equal(res.ok, true);
  // 500 * 3.5% = 17.50 + 0.40 = 17.90
  assert.equal(res.data.valorCobrado, 500.00);
  assert.equal(res.data.valorDesconto, 17.90);
  assert.equal(res.data.valorLiquido, 482.10);
  // 17.90 / 500 * 100 = 3.58%
  assert.equal(res.data.taxaEfetivaTotal, 3.58);
});

test('Taxa Maquininha Direto: Crédito parcelado R$ 1.200,00 em 3x a 7,50% sem tarifa fixa', () => {
  const res = calcularTaxaMaquininha({
    objetivo: 'direto',
    modalidade: 'credito_parcelado',
    parcelas: '3',
    valor: '1.200,00',
    taxaPercentual: '7,5'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.parcelas, 3);
  assert.equal(res.data.valorCobrado, 1200.00);
  // 1200 * 7.5% = 90.00
  assert.equal(res.data.valorDesconto, 90.00);
  assert.equal(res.data.valorLiquido, 1110.00);
  assert.equal(res.data.valorParcelaCobrada, 400.00);
  assert.equal(res.data.valorParcelaLiquida, 370.00);
});

/* ==========================================================================
 * 2. Cálculos no Modo Inverso (Repassar Taxa via Gross-up)
 * ========================================================================== */

test('Taxa Maquininha Inverso: Líquido desejado R$ 100,00 a 10% sem tarifa fixa (Exemplo Clássico Gross-up)', () => {
  const res = calcularTaxaMaquininha({
    objetivo: 'inverso',
    modalidade: 'credito_vista',
    valor: '100,00',
    taxaPercentual: '10'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.objetivo, 'inverso');
  // 100 / (1 - 0.10) = 100 / 0.90 = 111.11
  assert.equal(res.data.valorCobrado, 111.11);
  assert.equal(res.data.valorLiquido, 100.00);
  assert.equal(res.data.valorDesconto, 11.11);
  assert.equal(res.data.taxaEfetivaTotal, 10.00);
});

test('Taxa Maquininha Inverso: Líquido desejado R$ 1.000,00 em 5x a 8,0% com tarifa fixa R$ 0,50', () => {
  const res = calcularTaxaMaquininha({
    objetivo: 'inverso',
    modalidade: 'credito_parcelado',
    parcelas: 5,
    valor: 1000,
    taxaPercentual: 8,
    tarifaFixa: 0.50
  });

  assert.equal(res.ok, true);
  // (1000 + 0.50) / (1 - 0.08) = 1000.50 / 0.92 = 1087.50
  assert.equal(res.data.valorCobrado, 1087.50);
  assert.equal(res.data.valorLiquido, 1000.00);
  assert.equal(res.data.valorDesconto, 87.50);
  assert.equal(res.data.valorParcelaCobrada, 217.50);
  assert.equal(res.data.valorParcelaLiquida, 200.00);
});

/* ==========================================================================
 * 3. Validações e Casos Extremos
 * ========================================================================== */

test('Validação: Taxa 0% é permitida (sem desconto)', () => {
  const res = calcularTaxaMaquininha({
    objetivo: 'direto',
    valor: '200,00',
    taxaPercentual: '0'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.valorDesconto, 0.00);
  assert.equal(res.data.valorLiquido, 200.00);
});

test('Validação: Taxa 100% ou superior é rejeitada', () => {
  const res100 = calcularTaxaMaquininha({
    valor: '100,00',
    taxaPercentual: '100'
  });
  assert.equal(res100.ok, false);
  assert.match(res100.error, /estritamente inferior a 100%/i);

  const res105 = calcularTaxaMaquininha({
    valor: '100,00',
    taxaPercentual: '105'
  });
  assert.equal(res105.ok, false);
});

test('Validação: Taxa negativa é rejeitada', () => {
  const res = calcularTaxaMaquininha({
    valor: '100,00',
    taxaPercentual: '-3,5'
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /não pode ser negativa/i);
});

test('Validação: Valor principal vazio, zero ou negativo é rejeitado', () => {
  assert.equal(calcularTaxaMaquininha({ valor: '', taxaPercentual: '2' }).ok, false);
  assert.equal(calcularTaxaMaquininha({ valor: '0,00', taxaPercentual: '2' }).ok, false);
  assert.equal(calcularTaxaMaquininha({ valor: '-50,00', taxaPercentual: '2' }).ok, false);
});

test('Validação: Tarifa fixa negativa é rejeitada', () => {
  const res = calcularTaxaMaquininha({
    valor: '100,00',
    taxaPercentual: '2',
    tarifaFixa: '-0,50'
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /tarifa fixa.*não pode ser negativa/i);
});

test('Validação: Parcelas inválidas em crédito parcelado são rejeitadas', () => {
  const resMenos = calcularTaxaMaquininha({
    modalidade: 'credito_parcelado',
    parcelas: 1,
    valor: '100,00',
    taxaPercentual: '2'
  });
  assert.equal(resMenos.ok, false);

  const resMais = calcularTaxaMaquininha({
    modalidade: 'credito_parcelado',
    parcelas: 15,
    valor: '100,00',
    taxaPercentual: '2'
  });
  assert.equal(resMais.ok, false);
});

test('Validação: Desconto que excede o valor da venda gera erro explicativo', () => {
  const res = calcularTaxaMaquininha({
    objetivo: 'direto',
    valor: '1,00',
    taxaPercentual: '5',
    tarifaFixa: '2,00'
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /desconto total.*superior ao valor da venda/i);
});

/* ==========================================================================
 * 4. Resiliência Numérica: Zero NaN ou Infinity
 * ========================================================================== */

test('Resiliência: Nenhuma combinação produz NaN ou Infinity', () => {
  const amostras = [
    { valor: 0.01, taxa: 0.01, fixa: 0 },
    { valor: 999999.99, taxa: 99.99, fixa: 50 },
    { valor: 100, taxa: 0, fixa: 0 },
    { valor: '150,50', taxa: '4,25', fixa: '0,40' }
  ];

  for (const a of amostras) {
    const r1 = calcularTaxaMaquininha({ objetivo: 'direto', valor: a.valor, taxaPercentual: a.taxa, tarifaFixa: a.fixa });
    const r2 = calcularTaxaMaquininha({ objetivo: 'inverso', valor: a.valor, taxaPercentual: a.taxa, tarifaFixa: a.fixa });

    for (const res of [r1, r2]) {
      if (res.ok) {
        for (const [chave, val] of Object.entries(res.data)) {
          if (typeof val === 'number') {
            assert.ok(!isNaN(val), `Propriedade ${chave} não pode ser NaN`);
            assert.ok(Number.isFinite(val), `Propriedade ${chave} não pode ser Infinity`);
          }
        }
      }
    }
  }
});

/* ==========================================================================
 * 5. Seções de Ações Compartilhadas (createResultActions)
 * ========================================================================== */

test('getResultSections: gera estrutura correta e formatação em Reais', () => {
  const calc = calcularTaxaMaquininha({
    objetivo: 'direto',
    modalidade: 'credito_parcelado',
    parcelas: 6,
    valor: '1.200,00',
    taxaPercentual: '6,5',
    tarifaFixa: '0,50'
  });

  const secoes = getResultSections(calc.data);
  assert.ok(Array.isArray(secoes));
  assert.ok(secoes.length >= 6);

  const mapa = Object.fromEntries(secoes.map(s => [s.label, s.value]));
  assert.equal(mapa['Modalidade'], 'Crédito parcelado em 6x');
  assert.ok(mapa['Valor cobrado na maquininha'].includes('R$ 1.200,00'));
  assert.ok(mapa['Tarifa fixa por transação'].includes('R$ 0,50'));
  assert.ok(mapa['Parcelamento'].includes('6x de R$ 200,00'));
  assert.ok(mapa['Metodologia'].includes('Cálculo direto'));
});

test('getResultSections (inverso): metodologia expressa estimativa e rejeita garantia absoluta de recebimento', () => {
  const calc = calcularTaxaMaquininha({
    objetivo: 'inverso',
    modalidade: 'credito_vista',
    valor: '100,00',
    taxaPercentual: '10',
    tarifaFixa: '0,50'
  });

  const secoes = getResultSections(calc.data);
  const mapa = Object.fromEntries(secoes.map(s => [s.label, s.value]));

  // Linguagem de estimativa
  assert.match(mapa['Metodologia'], /estimat|estima o valor/i);
  // Menciona taxa e tarifa informadas
  assert.match(mapa['Metodologia'], /taxa percentual e a tarifa fixa informadas/i);
  // Ressalva de regras contratuais e arredondamentos
  assert.match(mapa['Metodologia'], /regras contratuais e os arredondamentos da operadora/i);
  // Impede retorno de afirmação absoluta de garantia de recebimento integral
  assert.doesNotMatch(mapa['Metodologia'], /garante o recebimento integral/i);
  assert.doesNotMatch(mapa['Metodologia'], /garante 100%/i);
});

/* ==========================================================================
 * 6. Conformidade da Página HTML (Layout, Acessibilidade e SEO)
 * ========================================================================== */

test('HTML: página possui frontmatter com layout tool e scripts corretos', () => {
  assert.match(paginaTaxaMaquininha, /layout:\s*tool/);
  assert.match(paginaTaxaMaquininha, /canonical:\s*https:\/\/www\.calculadoramaster\.com\/tools\/financas\/taxa-maquininha\.html/);
  assert.match(paginaTaxaMaquininha, /pageScripts:\s*<script type="module" src="\{\{ROOT_PREFIX\}\}js\/tools\/taxa-maquininha\.js"><\/script>/);
});

test('HTML: conformidade de acessibilidade e convenções', () => {
  // H1 único
  const h1Matches = paginaTaxaMaquininha.match(/<h1[^>]*>.*?<\/h1>/gi);
  assert.equal(h1Matches?.length, 1, 'Deve haver exatamente um <h1>');

  // Cards padronizados
  assert.match(paginaTaxaMaquininha, /class="card tool-calculator-card"/);
  assert.match(paginaTaxaMaquininha, /class="card tool-result-card"/);

  // Região de status e acessibilidade
  assert.match(paginaTaxaMaquininha, /<p id="erroMaquininha" role="alert" aria-live="assertive" hidden><\/p>/);
  assert.match(paginaTaxaMaquininha, /<p id="statusAcoes" class="result-action-status" role="status" aria-live="polite"><\/p>/);
  assert.match(paginaTaxaMaquininha, /<section id="resultadoMaquininha" aria-live="polite" aria-atomic="true" hidden>/);

  // Botões de ação
  assert.match(paginaTaxaMaquininha, /id="btnCopiar"/);
  assert.match(paginaTaxaMaquininha, /id="btnCompartilhar"/);
  assert.match(paginaTaxaMaquininha, /id="btnImprimir"/);
  assert.match(paginaTaxaMaquininha, /id="btnLimpar"/);

  // Ausência de estilos inline
  assert.doesNotMatch(paginaTaxaMaquininha, /style\s*=\s*["'][^"']*["']/);
});

/* ==========================================================================
 * 7. Verificação Editorial: Linguagem de Estimativa e Ausência de Absolutos
 * ========================================================================== */

test('HTML: linguagem de estimativa e ausência de afirmações absolutas de precisão', () => {
  // Ausência de afirmações absolutas de precisão ou garantia de recebimento
  assert.doesNotMatch(paginaTaxaMaquininha, /garante 100% de precisão nos cálculos/i);
  assert.doesNotMatch(paginaTaxaMaquininha, /recebe exatamente os seus/i);
  assert.doesNotMatch(paginaTaxaMaquininha, /calcule exatamente quanto cobrar/i);
  assert.doesNotMatch(paginaTaxaMaquininha, /sem perder nenhum centavo/i);

  // Presença de linguagem de estimativa e simulação
  assert.match(paginaTaxaMaquininha, /Simule os descontos de taxas/i);
  assert.match(paginaTaxaMaquininha, /Estime o valor líquido aproximado a receber/i);
  assert.match(paginaTaxaMaquininha, /estimativa calculada a cobrar/i);

  // Ressalva sobre variações contratuais, arredondamentos e antecipação
  assert.match(paginaTaxaMaquininha, /regras contratuais da operadora/i);
  assert.match(paginaTaxaMaquininha, /antecipação de recebíveis/i);
  assert.match(paginaTaxaMaquininha, /critérios de arredondamento/i);

  // Faixas identificadas como referências ilustrativas
  assert.match(paginaTaxaMaquininha, /meras referências ilustrativas de mercado/i);

  // Preservação da nota de parcelamento e gross-up
  assert.match(paginaTaxaMaquininha, /gross-up/i);
  assert.match(paginaTaxaMaquininha, /class="tool-result-note"/);
});

/* ==========================================================================
 * 8. Parcelamento com Distribuição Exata de Centavos
 * ========================================================================== */

test('Parcelamento: R$ 100,00 em 3 parcelas distribui centavos sem divergência (soma exata)', () => {
  const res = calcularTaxaMaquininha({
    objetivo: 'direto',
    modalidade: 'credito_parcelado',
    parcelas: '3',
    valor: '100,00',
    taxaPercentual: '0'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.valorCobrado, 100.00);
  const p = res.data.parcelamentoCobrado;
  assert.equal(p.temAjusteCentavos, true);
  assert.equal(p.qtdParcelasBase, 2);
  assert.equal(p.valorParcelaBase, 33.33);
  assert.equal(p.qtdParcelasAjustadas, 1);
  assert.equal(p.valorParcelaAjustada, 33.34);
  assert.equal(p.somaParcelas, 100.00);
  assert.equal(p.textoParcelas, '2 parcelas de R$ 33,33 e 1 parcela de R$ 33,34');
  assert.equal(p.parcelasDetalhadas.length, 3);
  const soma = p.parcelasDetalhadas.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;
  assert.equal(soma, 100.00);
});

test('Parcelamento: R$ 100,00 em 6 parcelas distribui centavos sem divergência (soma exata)', () => {
  const res = calcularTaxaMaquininha({
    objetivo: 'direto',
    modalidade: 'credito_parcelado',
    parcelas: 6,
    valor: 100,
    taxaPercentual: 0
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.valorCobrado, 100.00);
  const p = res.data.parcelamentoCobrado;
  assert.equal(p.temAjusteCentavos, true);
  // 10000 / 6 = 1666 centavos base, resto 4 centavos
  assert.equal(p.qtdParcelasBase, 2);
  assert.equal(p.valorParcelaBase, 16.66);
  assert.equal(p.qtdParcelasAjustadas, 4);
  assert.equal(p.valorParcelaAjustada, 16.67);
  assert.equal(p.somaParcelas, 100.00);
  assert.equal(p.textoParcelas, '2 parcelas de R$ 16,66 e 4 parcelas de R$ 16,67');
  const soma = p.parcelasDetalhadas.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;
  assert.equal(soma, 100.00);
});

test('Parcelamento: R$ 111,11 em 3 parcelas distribui centavos sem divergência (soma exata)', () => {
  const res = calcularTaxaMaquininha({
    objetivo: 'direto',
    modalidade: 'credito_parcelado',
    parcelas: '3',
    valor: '111,11',
    taxaPercentual: '0'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.valorCobrado, 111.11);
  const p = res.data.parcelamentoCobrado;
  assert.equal(p.temAjusteCentavos, true);
  // 11111 / 3 = 3703 centavos base, resto 2 centavos
  assert.equal(p.qtdParcelasBase, 1);
  assert.equal(p.valorParcelaBase, 37.03);
  assert.equal(p.qtdParcelasAjustadas, 2);
  assert.equal(p.valorParcelaAjustada, 37.04);
  assert.equal(p.somaParcelas, 111.11);
  assert.equal(p.textoParcelas, '1 parcela de R$ 37,03 e 2 parcelas de R$ 37,04');
  const soma = p.parcelasDetalhadas.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;
  assert.equal(soma, 111.11);
});

test('Parcelamento: conferência de que a soma das parcelas sempre fecha com o total em múltiplas divisões inexatas', () => {
  const casos = [
    { valor: 50.00, parcelas: 3 },
    { valor: 70.00, parcelas: 7 }, // exato
    { valor: 70.01, parcelas: 7 }, // inexato
    { valor: 155.55, parcelas: 12 },
    { valor: 999.99, parcelas: 11 },
    { valor: 1234.56, parcelas: 9 }
  ];

  for (const c of casos) {
    const res = calcularTaxaMaquininha({
      objetivo: 'direto',
      modalidade: 'credito_parcelado',
      parcelas: c.parcelas,
      valor: c.valor,
      taxaPercentual: '5'
    });
    assert.equal(res.ok, true);
    const p = res.data.parcelamentoCobrado;
    const somaReal = p.parcelasDetalhadas.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;
    assert.equal(somaReal, res.data.valorCobrado, `Soma das parcelas fecha exatamente com valor cobrado para ${c.valor} em ${c.parcelas}x`);
  }
});

test('Parcelamento: valor líquido por parcela permanece identificado como estimativa/aproximado', () => {
  const calc = calcularTaxaMaquininha({
    objetivo: 'direto',
    modalidade: 'credito_parcelado',
    parcelas: '3',
    valor: '100,00',
    taxaPercentual: '10'
  });

  const secoes = getResultSections(calc.data);
  const mapa = Object.fromEntries(secoes.map(s => [s.label, s.value]));

  // Confere identificação de valor líquido aproximado
  assert.match(mapa['Parcelamento'], /Líquido estimado por parcela/i);
  assert.match(mapa['Parcelamento'], /média aproximada|~/i);
});

test('HTML: interface explica que pode haver ajuste de centavos na distribuição das parcelas', () => {
  assert.match(paginaTaxaMaquininha, /diferença de centavos|distribuição de centavos/i);
  assert.match(paginaTaxaMaquininha, /distribuídos entre as parcelas|distribuída entre as parcelas/i);
});

test('Integração de parcelamento: getResultSections utiliza distribuição individual das parcelas e compartilhamento não duplica parcelas iguais (R$ 100 em 3x)', () => {
  const calc = calcularTaxaMaquininha({
    objetivo: 'direto',
    modalidade: 'credito_parcelado',
    parcelas: 3,
    valor: '100,00',
    taxaPercentual: '0'
  });

  assert.equal(calc.ok, true);
  assert.equal(calc.data.valorCobrado, 100.00);
  assert.equal(calc.data.parcelas, 3);

  const secoes = getResultSections(calc.data);
  const secaoParcelamento = secoes.find(s => s.label === 'Parcelamento');
  assert.ok(secaoParcelamento, 'Seção de Parcelamento deve existir');

  // Apresentação esperada obrigatória: 2 parcelas de R$ 33,33 e 1 parcela de R$ 33,34
  assert.match(
    secaoParcelamento.value,
    /2 parcelas de R\$\s*33,33 e 1 parcela de R\$\s*33,34/,
    'getResultSections deve conter exatamente 2 parcelas de R$ 33,33 e 1 parcela de R$ 33,34'
  );

  // Compartilhamento (via formatResultText, utilizado por acoes.share() e acoes.copy())
  const textoCompartilhamento = formatResultText('Calculadora de Taxa da Maquininha — Calculadora Master', secoes);
  assert.match(
    textoCompartilhamento,
    /2 parcelas de R\$\s*33,33 e 1 parcela de R\$\s*33,34/,
    'Compartilhamento deve conter a distribuição individual das parcelas'
  );

  // Confirmar que o compartilhamento e a seção NÃO apresentam três parcelas iguais
  assert.doesNotMatch(
    textoCompartilhamento,
    /3x\s+de\s+R\$\s*33,33/i,
    'Compartilhamento não deve apresentar 3x de R$ 33,33'
  );
  assert.doesNotMatch(
    textoCompartilhamento,
    /3x\s+de\s+R\$\s*33,34/i,
    'Compartilhamento não deve apresentar 3x de R$ 33,34'
  );
  assert.doesNotMatch(
    textoCompartilhamento,
    /3\s+parcelas\s+de\s+R\$\s*33,3[34]/i,
    'Compartilhamento não deve apresentar três parcelas iguais quando há ajuste de centavos'
  );
  assert.doesNotMatch(
    secaoParcelamento.value,
    /3\s+parcelas\s+de\s+R\$\s*33,3[34]/i,
    'Seção de parcelamento não deve apresentar três parcelas iguais quando há ajuste de centavos'
  );
});

/* ==========================================================================
 * 8. Regressão Obrigatória: Aviso Informativo para Parcelas de R$ 0,00
 * ========================================================================== */

test('Regressão Aviso R$ 0,00 — Item 1: R$ 0,01 em 12 parcelas detecta parcelas zeradas e sinaliza aviso', () => {
  const p = distribuirParcelas(0.01, 12);
  assert.equal(p.temParcelasZeradas, true);
  assert.equal(temParcelasZeradas(p), true);
  assert.equal(p.parcelasDetalhadas.length, 12);
  // 11 parcelas de R$ 0,00 e 1 parcela de R$ 0,01
  const qtdZeradas = p.parcelasDetalhadas.filter((v) => v === 0).length;
  assert.equal(qtdZeradas, 11);
  assert.equal(p.parcelasDetalhadas.includes(0), true);

  const calc = calcularTaxaMaquininha({
    objetivo: 'direto',
    modalidade: 'credito_parcelado',
    parcelas: 12,
    valor: '0,01',
    taxaPercentual: '0'
  });
  assert.equal(calc.ok, true);
  assert.equal(calc.data.temParcelasZeradas, true);

  const secoes = getResultSections(calc.data);
  const secaoAviso = secoes.find((s) => s.label === 'Aviso sobre parcelamento');
  assert.ok(secaoAviso, 'Deve incluir seção de aviso em getResultSections');
  assert.equal(secaoAviso.value, TEXTO_AVISO_PARCELA_ZERADA);
});

test('Regressão Aviso R$ 0,00 — Item 2: Distribuição sem parcelas zeradas não exibe aviso', () => {
  const casos = [
    { valor: '100,00', parcelas: 3, taxa: '5' },
    { valor: '12,00', parcelas: 12, taxa: '0' },
    { valor: '1,20', parcelas: 12, taxa: '0' }, // 12 parcelas de R$ 0,10
    { valor: '0,12', parcelas: 12, taxa: '0' }  // 12 parcelas de R$ 0,01
  ];

  for (const c of casos) {
    const calc = calcularTaxaMaquininha({
      objetivo: 'direto',
      modalidade: 'credito_parcelado',
      parcelas: c.parcelas,
      valor: c.valor,
      taxaPercentual: c.taxa
    });
    assert.equal(calc.ok, true);
    assert.equal(calc.data.temParcelasZeradas, false);
    assert.equal(temParcelasZeradas(calc.data.parcelamentoCobrado), false);
    assert.equal(calc.data.parcelamentoCobrado.parcelasDetalhadas.some((v) => v === 0), false);

    const secoes = getResultSections(calc.data);
    const secaoAviso = secoes.find((s) => s.label === 'Aviso sobre parcelamento');
    assert.equal(secaoAviso, undefined, `Não deve haver aviso para valor ${c.valor} em ${c.parcelas}x`);
  }
});

test('Regressão Aviso R$ 0,00 — Item 3: A soma das parcelas continua correspondendo exatamente ao valor total', () => {
  const cenarios = [
    { valor: 0.01, parcelas: 12 },
    { valor: 0.02, parcelas: 12 },
    { valor: 0.05, parcelas: 12 },
    { valor: 0.10, parcelas: 12 },
    { valor: 0.11, parcelas: 12 },
    { valor: 0.01, parcelas: 2 },
    { valor: 0.01, parcelas: 6 }
  ];

  for (const c of cenarios) {
    const p = distribuirParcelas(c.valor, c.parcelas);
    const somaReal = p.parcelasDetalhadas.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;
    assert.equal(somaReal, c.valor, `Soma das parcelas detalhadas deve ser exatamente igual a ${c.valor}`);
    assert.equal(p.somaParcelas, c.valor);
  }
});

test('Regressão Aviso R$ 0,00 — Item 4: O aviso não altera o resultado financeiro nem impede a simulação', () => {
  const calc = calcularTaxaMaquininha({
    objetivo: 'direto',
    modalidade: 'credito_parcelado',
    parcelas: 12,
    valor: '0,01',
    taxaPercentual: '10'
  });

  // Simulação é permitida com sucesso
  assert.equal(calc.ok, true);
  assert.equal(calc.data.valorCobrado, 0.01);
  // Desconto calculado normalmente pelas regras aprovadas
  assert.equal(typeof calc.data.valorDesconto, 'number');
  assert.equal(typeof calc.data.valorLiquido, 'number');
  assert.equal(calc.data.valorDesconto + calc.data.valorLiquido, calc.data.valorCobrado);
  // Não cria limites mínimos comerciais artificiais
  assert.ok(calc.data.valorCobrado < 1.00);
});

test('Regressão Aviso R$ 0,00 — Item 5: Texto informativo permanece correto, acessível e evita duplicação na interface', () => {
  // 1. Conformidade do HTML estático
  assert.match(
    paginaTaxaMaquininha,
    /<p id="avisoParcelaZerada" class="tool-result-note" role="note" hidden>/,
    'HTML deve conter elemento #avisoParcelaZerada com role="note" e classe "tool-result-note"'
  );
  assert.match(
    paginaTaxaMaquininha,
    /A simulação resultou em uma ou mais parcelas de R\$ 0,00\. Embora a soma corresponda matematicamente ao valor total, essa distribuição pode não ser aceita comercialmente pela operadora\. Consulte as condições do seu plano antes de realizar a venda\./,
    'HTML deve conter exatamente o texto aprovado'
  );

  // 2. Comportamento dinâmico no DOM via setupTool
  const elementos = new Map();
  const mockEl = (id, tag = 'div') => {
    const el = {
      id,
      tagName: tag.toUpperCase(),
      value: '',
      checked: false,
      hidden: false,
      textContent: '',
      innerHTML: '',
      children: [],
      listeners: {},
      addEventListener(evt, fn) { (this.listeners[evt] ||= []).push(fn); },
      querySelector() { return null; },
      appendChild(c) { this.children.push(c); return c; },
      focus() {},
      reset() {
        this.value = '';
        this.checked = false;
      }
    };
    elementos.set(id, el);
    return el;
  };

  mockEl('formMaquininha', 'form');
  const radDireto = mockEl('objDireto', 'input');
  radDireto.checked = true;
  mockEl('objInverso', 'input');

  mockEl('modDebito', 'input');
  mockEl('modCreditoVista', 'input');
  const radCreditoParcelado = mockEl('modCreditoParcelado', 'input');
  radCreditoParcelado.checked = true;

  mockEl('grupoParcelas', 'div');
  const selectParcelas = mockEl('numeroParcelas', 'select');
  selectParcelas.value = '12';

  mockEl('labelValorPrincipal', 'label');
  const inputValor = mockEl('valorPrincipal', 'input');
  inputValor.value = '0,01';
  mockEl('ajudaValorPrincipal', 'p');

  const inputTaxa = mockEl('taxaPercentual', 'input');
  inputTaxa.value = '0';
  mockEl('tarifaFixa', 'input');

  mockEl('erroMaquininha', 'p');
  mockEl('resultadoMaquininha', 'section');

  mockEl('resValorCobrado', 'strong');
  mockEl('resDescontoTaxa', 'strong');
  mockEl('resValorLiquido', 'strong');
  mockEl('cardParcelamento', 'div');
  mockEl('resParcelaCliente', 'strong');
  mockEl('resParcelaVendedor', 'strong');
  const elAviso = mockEl('avisoParcelaZerada', 'p');
  elAviso.hidden = true;

  mockEl('btnCopiar', 'button');
  mockEl('btnCompartilhar', 'button');
  mockEl('btnImprimir', 'button');
  mockEl('statusAcoes', 'p');
  mockEl('btnLimpar', 'button');

  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  try {
    globalThis.document = {
      getElementById: (id) => elementos.get(id) || null,
      querySelector: () => null,
      createElement: (tag) => mockEl(`dynamic-${tag}-${Date.now()}`, tag),
      readyState: 'complete'
    };
    globalThis.window = {
      location: { href: 'https://www.calculadoramaster.com/tools/financas/taxa-maquininha.html' }
    };

    setupTool();

    const form = elementos.get('formMaquininha');
    assert.ok(form.listeners.submit && form.listeners.submit.length > 0);

    // 1º Envio: R$ 0,01 em 12 parcelas -> aviso exibido
    form.listeners.submit[0]({ preventDefault() {} });
    assert.equal(elAviso.hidden, false, 'Aviso deve ser exibido para R$ 0,01 em 12 parcelas');
    assert.equal(elAviso.textContent, TEXTO_AVISO_PARCELA_ZERADA);

    // 2º Envio consecutivo (mesmo cenário): evita duplicação e permanece ativo
    form.listeners.submit[0]({ preventDefault() {} });
    assert.equal(elAviso.hidden, false);
    assert.equal(elAviso.textContent, TEXTO_AVISO_PARCELA_ZERADA);

    // 3º Envio: R$ 100,00 em 3 parcelas -> aviso ocultado
    inputValor.value = '100,00';
    selectParcelas.value = '3';
    form.listeners.submit[0]({ preventDefault() {} });
    assert.equal(elAviso.hidden, true, 'Aviso deve ser ocultado quando não há parcelas zeradas');

    // 4º Envio: Volta para R$ 0,01 em 12 parcelas -> aviso reaparece
    inputValor.value = '0,01';
    selectParcelas.value = '12';
    form.listeners.submit[0]({ preventDefault() {} });
    assert.equal(elAviso.hidden, false, 'Aviso deve reaparecer para parcelas zeradas');

    // 5º Limpeza do formulário -> aviso é ocultado
    const btnLimpar = elementos.get('btnLimpar');
    assert.ok(btnLimpar.listeners.click && btnLimpar.listeners.click.length > 0);
    btnLimpar.listeners.click[0]();
    assert.equal(elAviso.hidden, true, 'Aviso deve ser ocultado ao limpar formulário');
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});
