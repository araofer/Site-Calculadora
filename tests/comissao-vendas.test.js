/**
 * Testes Automatizados — Calculadora de Comissão de Vendas (#51)
 * Calculadora Master
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  arredondarMoeda,
  arredondarPercentual,
  parseTaxaPercentual,
  calcularComissaoVendas,
  getResultSections
} from '../js/tools/comissao-vendas.js';

const paginaComissao = readFileSync(
  new URL('../src/pages/tools/trabalhista/comissao-vendas.page.html', import.meta.url),
  'utf8'
);

/* ==========================================================================
 * 1. Cálculos de Comissão e Perfis (CLT e Autônomo/PJ)
 * ========================================================================== */

test('Comissão CLT: vendas R$ 50.000,00 a 4,5% com salário fixo R$ 2.000,00', () => {
  const res = calcularComissaoVendas({
    perfil: 'clt',
    valorVendas: '50.000,00',
    taxaComissao: '4,5',
    valorFixo: '2.000,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.perfil, 'clt');
  assert.equal(res.data.valorVendas, 50000.00);
  assert.equal(res.data.taxaComissao, 4.5);
  assert.equal(res.data.valorFixo, 2000.00);
  assert.equal(res.data.valorComissao, 2250.00);
  assert.equal(res.data.remuneracaoBruta, 4250.00);
  // 2250 / 4250 * 100 = 52.941... -> 52.9%
  assert.equal(res.data.participacaoComissao, 52.9);
});

test('Comissão CLT pura: sem salário fixo (vendas R$ 30.000,00 a 5%)', () => {
  const res = calcularComissaoVendas({
    perfil: 'clt',
    valorVendas: 30000,
    taxaComissao: 5,
    valorFixo: ''
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.valorFixo, 0.00);
  assert.equal(res.data.valorComissao, 1500.00);
  assert.equal(res.data.remuneracaoBruta, 1500.00);
  assert.equal(res.data.participacaoComissao, 100.0);
});

test('Comissão Autônomo/PJ: vendas R$ 80.000,00 a 3,0% com fixo R$ 1.500,00', () => {
  const res = calcularComissaoVendas({
    perfil: 'autonomo_pj',
    valorVendas: '80.000,00',
    taxaComissao: '3,00',
    valorFixo: '1.500,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.perfil, 'autonomo_pj');
  assert.equal(res.data.valorComissao, 2400.00);
  assert.equal(res.data.valorFixo, 1500.00);
  assert.equal(res.data.remuneracaoBruta, 3900.00);
  // 2400 / 3900 * 100 = 61.538... -> 61.5%
  assert.equal(res.data.participacaoComissao, 61.5);
});

test('Comissão Autônomo/PJ pura: vendas R$ 120.000,00 a 2,5% sem fixo', () => {
  const res = calcularComissaoVendas({
    perfil: 'autonomo_pj',
    valorVendas: '120.000,00',
    taxaComissao: '2,5'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.valorComissao, 3000.00);
  assert.equal(res.data.valorFixo, 0);
  assert.equal(res.data.remuneracaoBruta, 3000.00);
  assert.equal(res.data.participacaoComissao, 100.0);
});

/* ==========================================================================
 * 2. Casos Limites e Vendas Zeradas
 * ========================================================================== */

test('Vendas iguais a zero: comissão zero e total igual ao fixo', () => {
  const res = calcularComissaoVendas({
    perfil: 'clt',
    valorVendas: '0,00',
    taxaComissao: '5',
    valorFixo: '1.621,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.valorComissao, 0.00);
  assert.equal(res.data.remuneracaoBruta, 1621.00);
  assert.equal(res.data.participacaoComissao, 0.0);
});

test('Vendas zero e fixo zero: remuneração bruta zero sem NaN ou divisão por zero', () => {
  const res = calcularComissaoVendas({
    valorVendas: 0,
    taxaComissao: 5,
    valorFixo: 0
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.valorComissao, 0);
  assert.equal(res.data.remuneracaoBruta, 0);
  assert.equal(res.data.participacaoComissao, 0);
});

/* ==========================================================================
 * 3. Validações e Rejeições de Entradas Inválidas
 * ========================================================================== */

test('Rejeição: valor de vendas vazio', () => {
  const res = calcularComissaoVendas({
    valorVendas: '',
    taxaComissao: '5'
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /Informe o total de vendas/i);
});

test('Rejeição: valor de vendas negativo', () => {
  const res = calcularComissaoVendas({
    valorVendas: '-1000',
    taxaComissao: '5'
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /não pode ser negativo/i);
});

test('Rejeição: taxa de comissão vazia', () => {
  const res = calcularComissaoVendas({
    valorVendas: '10000',
    taxaComissao: ''
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /Informe a taxa de comissão/i);
});

test('Rejeição: taxa de comissão igual a zero ou negativa', () => {
  const resZero = calcularComissaoVendas({
    valorVendas: '10000',
    taxaComissao: '0'
  });
  assert.equal(resZero.ok, false);
  assert.match(resZero.error, /maior que zero/i);

  const resNeg = calcularComissaoVendas({
    valorVendas: '10000',
    taxaComissao: '-5'
  });
  assert.equal(resNeg.ok, false);
  assert.match(resNeg.error, /maior que zero/i);
});

test('Rejeição: taxa de comissão superior a 100%', () => {
  const res = calcularComissaoVendas({
    valorVendas: '10000',
    taxaComissao: '105'
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /não pode ser superior a 100%/i);
});

test('Rejeição: valor fixo contratual negativo', () => {
  const res = calcularComissaoVendas({
    valorVendas: '10000',
    taxaComissao: '5',
    valorFixo: '-500'
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /fixo contratual não pode ser negativo/i);
});

test('Perfil desconhecido assume fallback defensivo para "clt"', () => {
  const res = calcularComissaoVendas({
    perfil: 'outro_invalido',
    valorVendas: '10000',
    taxaComissao: '5'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.perfil, 'clt');
});

/* ==========================================================================
 * 4. Utilitários de Precisão e Parsing
 * ========================================================================== */

test('parseTaxaPercentual: suporta vírgula, ponto, espaços e símbolo %', () => {
  assert.equal(parseTaxaPercentual('4,5'), 4.5);
  assert.equal(parseTaxaPercentual('4.5%'), 4.5);
  assert.equal(parseTaxaPercentual(' 10,25 % '), 10.25);
  assert.equal(parseTaxaPercentual(7), 7);
  assert.ok(isNaN(parseTaxaPercentual('')));
  assert.ok(isNaN(parseTaxaPercentual('abc')));
});

test('arredondarMoeda e arredondarPercentual: imunidade contra -0 e imprecisão IEEE 754', () => {
  assert.equal(arredondarMoeda(0.1 + 0.2), 0.30);
  assert.equal(Object.is(arredondarMoeda(-0), 0), true);
  assert.equal(Object.is(arredondarPercentual(-0), 0), true);
  assert.equal(arredondarMoeda(NaN), 0);
  assert.equal(arredondarMoeda(Infinity), 0);
});

/* ==========================================================================
 * 5. Textos de Compartilhamento e Ações por Perfil
 * ========================================================================== */

test('getResultSections: gera seções com aviso específico para CLT', () => {
  const dados = {
    perfil: 'clt',
    valorVendas: 50000,
    taxaComissao: 5,
    valorFixo: 2000,
    valorComissao: 2500,
    remuneracaoBruta: 4500,
    participacaoComissao: 55.6
  };
  const sections = getResultSections(dados);
  assert.ok(Array.isArray(sections));

  const mapa = Object.fromEntries(sections.map(s => [s.label, s.value]));
  assert.equal(mapa['Perfil'], 'CLT Comissionado');
  assert.equal(mapa['Salário fixo contratual'], 'R$ 2.000,00');
  assert.equal(mapa['Remuneração bruta estimada'], 'R$ 4.500,00');
  assert.match(mapa['Aviso legal'], /Não contempla DSR sobre comissões/i);
});

test('getResultSections: gera seções com aviso específico para Autônomo/PJ', () => {
  const dados = {
    perfil: 'autonomo_pj',
    valorVendas: 100000,
    taxaComissao: 3,
    valorFixo: 0,
    valorComissao: 3000,
    remuneracaoBruta: 3000,
    participacaoComissao: 100
  };
  const sections = getResultSections(dados);
  const mapa = Object.fromEntries(sections.map(s => [s.label, s.value]));
  assert.equal(mapa['Perfil'], 'Autônomo / PJ / Representante');
  assert.equal(mapa['Valor fixo contratual'], 'R$ 0,00');
  assert.equal(mapa['Faturamento bruto estimado'], 'R$ 3.000,00');
  assert.match(mapa['Aviso legal'], /Não deduz tributos \(DAS\/Simples\/IRPF\/INSS\)/i);
});

/* ==========================================================================
 * 6. Estrutura HTML e Acessibilidade (WCAG / CONVENCAO_CALCULADORAS.md)
 * ========================================================================== */

test('HTML da ferramenta: Frontmatter e metadados obrigatórios', () => {
  assert.match(paginaComissao, /^---\n[\s\S]*layout:\s*tool[\s\S]*---/);
  assert.match(paginaComissao, /canonical:\s*https:\/\/www\.calculadoramaster\.com\/tools\/trabalhista\/comissao-vendas\.html/);
  assert.match(paginaComissao, /title:\s*Calculadora de Comissão de Vendas/);
  assert.match(paginaComissao, /description:\s*Calcule a comissão de vendas/);
});

test('HTML da ferramenta: estrutura acessível sem estilos inline', () => {
  assert.match(paginaComissao, /class="card tool-calculator-card"/);
  assert.match(paginaComissao, /class="card tool-result-card"/);
  assert.match(paginaComissao, /role="alert"/);
  assert.match(paginaComissao, /aria-live="assertive"/);
  assert.match(paginaComissao, /aria-live="polite"/);
  assert.doesNotMatch(paginaComissao, /style\s*=\s*["'][^"']*["']/);
  assert.doesNotMatch(paginaComissao, /<br\s*\/?>/);

  // Mapeamento for -> id
  const ids = new Set([...paginaComissao.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  for (const [, target] of paginaComissao.matchAll(/\bfor="([^"]+)"/g)) {
    assert.ok(ids.has(target), `HTML: label for="${target}" aponta para elemento existente`);
  }

  // Mapeamento aria-describedby -> id
  for (const [, references] of paginaComissao.matchAll(/\baria-describedby="([^"]+)"/g)) {
    for (const target of references.split(/\s+/)) {
      assert.ok(ids.has(target), `HTML: aria-describedby="${target}" aponta para elemento existente`);
    }
  }

  // Botões de ação compartilhada
  assert.match(paginaComissao, /id="btnCopiar"/);
  assert.match(paginaComissao, /id="btnCompartilhar"/);
  assert.match(paginaComissao, /id="btnImprimir"/);
  assert.match(paginaComissao, /id="statusAcoes"/);
});
