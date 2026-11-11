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
  calcularTaxaMaquininha,
  getResultSections
} from '../js/tools/taxa-maquininha.js';

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
});
