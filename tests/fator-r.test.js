import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ANO_REFERENCIA_PADRAO,
  ANOS_REFERENCIA_VALIDOS,
  DATA_CONSULTA_OFICIAL,
  PERCENTUAL_CORTE_FATOR_R,
  FATOR_R_FIXO_FOLHA_ZERO,
  FATOR_R_FIXO_RECEITA_ZERO,
  FATOR_R_PRESUMIDO_INICIO_2027,
  FONTES_OFICIAIS,
  ANEXOS_FATOR_R,
  ROTULOS_ANEXO,
  MODOS_APURACAO,
  ROTULOS_MODO_APURACAO,
  MODOS_ENTRADA_FOLHA,
  MODOS_ENTRADA_RECEITA,
  parseFlexibleNumber,
  roundDecimal,
  roundCurrency,
  formatCurrency,
  formatPercent,
  calcularComposicaoFolha,
  calcularComposicaoReceita,
  normalizeInput,
  validateInput,
  calculate,
  formatResult,
  buildCopyText,
  setupTool
} from '../js/tools/fator-r.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ===========================================================================
// SEÇÃO OBRIGATÓRIA: 12 CENÁRIOS NORMATIVOS EXIGIDOS NA CORREÇÃO FISCAL
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. Em 2026, após o mês de início, FS12 = 0 e RBT12r = 0 resulta em 1%
// ---------------------------------------------------------------------------
test('1. Em 2026, após o mês de início, FS12 = 0 e RBT12r = 0 resulta em 1,00% (Anexo V)', () => {
  // Cenário Regular (> 12 meses): FS12 = 0 e RBT12r = 0
  const resRegular = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    folhaConsolidada: '0,00',
    receitaConsolidada: '0,00'
  });

  assert.equal(resRegular.ok, true);
  assert.equal(resRegular.data.fatorRReal, 0.01, 'Fator R real deve ser 0.01 (1,00%)');
  assert.equal(resRegular.data.fatorRPercentual, 1.0);
  assert.equal(resRegular.data.atingiuCorte, false);
  assert.equal(resRegular.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_V);
  assert.equal(resRegular.data.casoEspecial, 'ambos_zero');
  assert.ok(
    resRegular.memoriaCalculo.some((m) => m.includes('0,01') || m.includes('1,00%')),
    'Memória de cálculo deve referenciar o Fator R de 1,00% para FS12=0 e RBT12r=0'
  );

  // Cenário Posterior ao 1º mês em início de atividade (ex: 5º mês com histórico zero):
  const resInicioMes5 = calculate({
    anoReferencia: 2026,
    modoApuracao: 'inicio_meses_3_12',
    mesesInicio: 4,
    folhaAcumuladaAnterior: '0,00',
    receitaAcumuladaAnterior: '0,00'
  });
  assert.equal(resInicioMes5.ok, true);
  assert.equal(resInicioMes5.data.fatorRReal, 0.01);
  assert.equal(resInicioMes5.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_V);
});

// ---------------------------------------------------------------------------
// 2. Em 2026, após o mês de início, FS12 positiva e RBT12r = 0 resulta em 28%
// ---------------------------------------------------------------------------
test('2. Em 2026, após o mês de início, FS12 positiva e RBT12r = 0 resulta em 28,00% (Anexo III)', () => {
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    folhaConsolidada: '50000,00',
    receitaConsolidada: '0,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.fatorRReal, 0.28, 'Fator R deve ser rigorosamente 28,00% (0,28), nunca 100%');
  assert.equal(res.data.fatorRPercentual, 28.0);
  assert.equal(res.data.atingiuCorte, true);
  assert.equal(res.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);
  assert.equal(res.data.casoEspecial, 'receita_zero_folha_positiva');
  assert.notEqual(res.data.fatorRPercentual, 100.0, 'Fator R de 100% está incorreto e foi removido');
});

// ---------------------------------------------------------------------------
// 3. No primeiro mês de 2026, folha positiva e receita zero resulta em 28%
// ---------------------------------------------------------------------------
test('3. No primeiro mês de 2026, folha positiva (FSPA > 0) e receita zero (RPAr = 0) resulta em 28,00% (Anexo III)', () => {
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'inicio_mes_1',
    folhaMesAtual: '7500,00',
    receitaMesAtual: '0,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.fatorRReal, 0.28);
  assert.equal(res.data.fatorRPercentual, 28.0);
  assert.equal(res.data.atingiuCorte, true);
  assert.equal(res.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);
  assert.equal(res.data.casoEspecial, 'inicio_sem_receita');
  assert.notEqual(res.data.fatorRPercentual, 100.0);
});

// ---------------------------------------------------------------------------
// 4. No primeiro mês de 2026, folha zero e receita positiva resulta em 1%
// ---------------------------------------------------------------------------
test('4. No primeiro mês de 2026, folha zero (FSPA = 0) e receita positiva (RPAr > 0) resulta em 1,00% (Anexo V)', () => {
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'inicio_mes_1',
    folhaMesAtual: '0,00',
    receitaMesAtual: '20000,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.fatorRReal, 0.01, 'Fator R no 1º mês com receita e sem folha deve ser fixado em 1,00%');
  assert.equal(res.data.fatorRPercentual, 1.0);
  assert.equal(res.data.atingiuCorte, false);
  assert.equal(res.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_V);
  assert.equal(res.data.casoEspecial, 'inicio_sem_folha');
});

// ---------------------------------------------------------------------------
// 5. No primeiro mês de 2026, folha e receita ambas zero não geram anexo inventado
// ---------------------------------------------------------------------------
test('5. No primeiro mês de 2026, folha e receita ambas zero (FSPA = 0 e RPAr = 0) não geram anexo inventado', () => {
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'inicio_mes_1',
    folhaMesAtual: '0,00',
    receitaMesAtual: '0,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.fatorRReal, null, 'Fator R não deve ser inventado');
  assert.equal(res.data.fatorRPercentual, null);
  assert.equal(res.data.anexoEnquadrado, null, 'Anexo não deve ser inventado');
  assert.equal(res.data.atingiuCorte, null);
  assert.equal(res.data.casoEspecial, 'inicio_mes_1_ambos_zero');

  // Verifica a formatação amigável
  const formatted = formatResult(res.data);
  assert.equal(formatted.anexoBadge, 'Indeterminado');
  assert.match(formatted.resumoMensagem, /não pode ser determinado automaticamente/i);
  assert.match(formatted.resumoMensagem, /PGDAS-D|contador/i);

  // Verifica alerta orientativo
  assert.ok(
    res.warnings.some((w) => w.includes('não pode ser determinado automaticamente')),
    'Deve emitir aviso informativo orientando conferência no PGDAS-D ou com contador'
  );
});

// ---------------------------------------------------------------------------
// 6. Nos dois primeiros meses de início de atividade em 2027, o Fator R é 28%
// ---------------------------------------------------------------------------
test('6. Nos dois primeiros meses de início de atividade em 2027, o Fator R é 28,00% (Resolução CGSN nº 190/2026)', () => {
  // 1º Mês de 2027
  const resMes1 = calculate({
    anoReferencia: 2027,
    modoApuracao: 'inicio_mes_1',
    folhaMesAtual: '0,00',
    receitaMesAtual: '50000,00'
  });
  assert.equal(resMes1.ok, true);
  assert.equal(resMes1.data.fatorRReal, 0.28);
  assert.equal(resMes1.data.fatorRPercentual, 28.0);
  assert.equal(resMes1.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);
  assert.equal(resMes1.data.casoEspecial, 'inicio_2027_dois_primeiros_meses');

  // 2º Mês de 2027
  const resMes2 = calculate({
    anoReferencia: 2027,
    modoApuracao: 'inicio_mes_2',
    folhaAcumuladaAnterior: '0,00',
    receitaAcumuladaAnterior: '35000,00'
  });
  assert.equal(resMes2.ok, true);
  assert.equal(resMes2.data.fatorRReal, 0.28);
  assert.equal(resMes2.data.fatorRPercentual, 28.0);
  assert.equal(resMes2.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);
  assert.equal(resMes2.data.casoEspecial, 'inicio_2027_dois_primeiros_meses');

  // Verificação textual na memória de cálculo
  assert.ok(
    resMes1.memoriaCalculo.some((m) => m.includes('2 (dois) primeiros meses') && m.includes('0,28')),
    'Memória deve explicitar a presunção legal do § 6º da Resolução CGSN nº 190/2026'
  );
});

// ---------------------------------------------------------------------------
// 7. O terceiro mês de 2027 usa a janela de referência correta da nova redação
// ---------------------------------------------------------------------------
test('7. O terceiro mês de 2027 usa a janela de referência correta da nova redação (1 mês antecedente ao mês anterior)', () => {
  // No 3º mês de 2027:
  // PA = mês 3. Mês anterior ao PA = mês 2.
  // Meses antecedentes ao mês anterior = apenas o mês 1 (1 mês na janela).
  // Folha do 1º mês = R$ 10.000,00 -> anualizada: 10.000 * 12 = 120.000,00
  // Receita do 1º mês = R$ 30.000,00 -> anualizada: 30.000 * 12 = 360.000,00
  // Fator R = 120.000 / 360.000 = 0.333333... (33,3333%) -> Anexo III
  const res = calculate({
    anoReferencia: 2027,
    mesAtividade: 3,
    folhaAcumuladaAnterior: '10000,00',
    receitaAcumuladaAnterior: '30000,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.mesesJanelaReferencia, 1, 'Janela do 3º mês em 2027 deve conter exatamente 1 mês de histórico');
  assert.equal(res.data.fsConsiderada, 120000.0);
  assert.equal(res.data.rbtConsiderada, 360000.0);
  assert.equal(roundDecimal(res.data.fatorRReal, 4), 0.3333);
  assert.equal(res.data.atingiuCorte, true);
  assert.equal(res.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);
  assert.match(res.data.janelaReferenciaDescricao, /1 mês\(es\) antecedente\(s\) ao mês anterior/i);

  // Memória de cálculo deve registrar os detalhes da janela e anualização
  assert.ok(res.memoriaCalculo.some((m) => m.includes('mês anterior ao PA é o 2º mês')));
});

// ---------------------------------------------------------------------------
// 8. O 13º mês de atividade recebe o tratamento de início de atividade em 2027
// ---------------------------------------------------------------------------
test('8. O 13º mês de atividade recebe o tratamento de início de atividade previsto para 2027 (11 meses antecedentes)', () => {
  // No 13º mês de 2027:
  // Empresa tem menos de 14 meses de atividade.
  // PA = mês 13. Mês anterior ao PA = mês 12.
  // Meses antecedentes ao mês anterior = meses 1 a 11 (11 meses na janela).
  // Folha acumulada nos 11 meses = R$ 110.000,00 -> FS12 anualizada = (110.000 / 11) * 12 = 120.000,00
  // Receita acumulada nos 11 meses = R$ 440.000,00 -> RBT12r anualizada = (440.000 / 11) * 12 = 480.000,00
  // Fator R = 120.000 / 480.000 = 0.25 (25,00%) -> Anexo V
  const res = calculate({
    anoReferencia: 2027,
    mesAtividade: 13,
    folhaAcumuladaAnterior: '110000,00',
    receitaAcumuladaAnterior: '440000,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.mesesJanelaReferencia, 11, 'Janela do 13º mês em 2027 deve conter 11 meses antecedentes');
  assert.equal(res.data.fsConsiderada, 120000.0);
  assert.equal(res.data.rbtConsiderada, 480000.0);
  assert.equal(res.data.fatorRReal, 0.25);
  assert.equal(res.data.atingiuCorte, false);
  assert.equal(res.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_V);
  assert.match(res.data.janelaReferenciaDescricao, /11 mês\(es\) antecedente\(s\) ao mês anterior/i);

  // Memória de cálculo confirma o enquadramento em início de atividade (mais de 2 e menos de 14 meses)
  assert.ok(res.memoriaCalculo.some((m) => m.includes('mais de 2 e menos de 14 meses')));
});

// ---------------------------------------------------------------------------
// 9. O 14º mês segue a regra regular aplicável em 2027
// ---------------------------------------------------------------------------
test('9. O 14º mês segue a regra regular aplicável em 2027 (12 meses antecedentes ao mês anterior)', () => {
  // No 14º mês de 2027:
  // Empresa tem mais de 13 meses de atividade.
  // PA = mês 14. Mês anterior ao PA = mês 13.
  // Meses antecedentes ao mês anterior = meses 1 a 12 (12 meses completos!).
  // Folha nos 12 meses antecedentes = R$ 140.000,00
  // Receita nos 12 meses antecedentes = R$ 500.000,00
  // Fator R = 140.000 / 500.000 = 0.28 (28,00%) -> Anexo III
  const res = calculate({
    anoReferencia: 2027,
    mesAtividade: 14,
    folhaConsolidada: '140000,00',
    receitaConsolidada: '500000,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.mesesJanelaReferencia, 12, 'Janela regular do 14º mês deve conter 12 meses completos');
  assert.equal(res.data.fsConsiderada, 140000.0);
  assert.equal(res.data.rbtConsiderada, 500000.0);
  assert.equal(res.data.fatorRReal, 0.28);
  assert.equal(res.data.atingiuCorte, true);
  assert.equal(res.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);
  assert.match(res.data.regraAplicadaDescricao, /Regra geral de 2027/i);
  assert.match(res.data.janelaReferenciaDescricao, /12 meses antecedentes ao mês anterior/i);
});

// ---------------------------------------------------------------------------
// 10. A janela de referência de 2026 permanece inalterada
// ---------------------------------------------------------------------------
test('10. A janela de referência de 2026 permanece inalterada (12 meses anteriores sem defasagem)', () => {
  const res2026 = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    folhaConsolidada: '70000,00',
    receitaConsolidada: '250000,00'
  });

  assert.equal(res2026.ok, true);
  assert.equal(res2026.data.mesesJanelaReferencia, 12);
  assert.match(
    res2026.data.janelaReferenciaDescricao,
    /12 meses anteriores ao período de apuração \(Resolução CGSN nº 140\/2018, art\. 26\)/
  );
  assert.equal(
    res2026.data.janelaReferenciaDescricao.includes('antecedentes ao mês anterior'),
    false,
    'A janela de 2026 não deve usar a defasagem introduzida pela Resolução CGSN nº 190/2026'
  );

  // No 13º mês em 2026, a empresa já utiliza a regra geral dos 12 meses anteriores:
  const res2026Mes13 = calculate({
    anoReferencia: 2026,
    mesAtividade: 13,
    folhaConsolidada: '70000,00',
    receitaConsolidada: '250000,00'
  });
  assert.equal(res2026Mes13.ok, true);
  assert.equal(res2026Mes13.data.modoApuracao, MODOS_APURACAO.REGRA_GERAL);
});

// ---------------------------------------------------------------------------
// 11. Os limites de 27,999%, 28% e 28,001% continuam corretos
// ---------------------------------------------------------------------------
test('11. Os limites de 27,999%, 28,000% e 28,001% continuam perfeitamente delimitados', () => {
  // Limite 1: 27,999% -> Anexo V
  const res27999 = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    folhaConsolidada: '27999,00',
    receitaConsolidada: '100000,00'
  });
  assert.equal(res27999.ok, true);
  assert.equal(res27999.data.atingiuCorte, false);
  assert.equal(res27999.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_V);
  assert.equal(roundDecimal(res27999.data.fatorRReal, 5), 0.27999);

  // Limite 2: Exatamente 28,000% -> Anexo III
  const res28000 = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    folhaConsolidada: '28000,00',
    receitaConsolidada: '100000,00'
  });
  assert.equal(res28000.ok, true);
  assert.equal(res28000.data.atingiuCorte, true);
  assert.equal(res28000.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);
  assert.equal(res28000.data.fatorRReal, 0.28);

  // Limite 3: 28,001% -> Anexo III
  const res28001 = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    folhaConsolidada: '28001,00',
    receitaConsolidada: '100000,00'
  });
  assert.equal(res28001.ok, true);
  assert.equal(res28001.data.atingiuCorte, true);
  assert.equal(res28001.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);
  assert.equal(roundDecimal(res28001.data.fatorRReal, 5), 0.28001);

  // Cenário de razão superior a 28% (ex: 35,00%): confirma que não há limitação artificial do resultado a 28%
  const res35 = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    folhaConsolidada: '35000,00',
    receitaConsolidada: '100000,00'
  });
  assert.equal(res35.ok, true);
  assert.equal(res35.data.fatorRReal, 0.35, 'Fator R calculado deve ser exatamente 0,35 (sem teto artificial)');
  assert.equal(res35.data.fatorRPercentual, 35.0, 'Percentual deve ser exatamente 35,00%');
  assert.equal(res35.data.atingiuCorte, true);
  assert.equal(res35.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);
});

// ---------------------------------------------------------------------------
// 12. O valor arredondado exibido não altera a decisão de enquadramento
// ---------------------------------------------------------------------------
test('12. O valor arredondado exibido (ex: 27,9995% exibido como 28,00%) não altera o enquadramento (permanece Anexo V)', () => {
  // Razão real: 279.995 / 1.000.000 = 0.279995 (27,9995%)
  // Visualmente com 2 casas arredonda para 28,00%, mas matematicamente < 28% -> Anexo V
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    folhaConsolidada: '279995,00',
    receitaConsolidada: '1000000,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.atingiuCorte, false, 'Valor matemático real de 0.279995 não deve atingir 0.28');
  assert.equal(res.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_V);

  const formatted = formatResult(res.data);
  assert.equal(formatted.anexoBadge, 'Anexo V');
  assert.equal(formatted.anexoId, ANEXOS_FATOR_R.ANEXO_V);
});

// ===========================================================================
// SEÇÃO ADICIONAL: TESTES DE COMPOSIÇÃO, INTEGRIDADE E CONFORMIDADE TÉCNICA
// ===========================================================================

test('13. Composição detalhada da folha soma salários, pró-labore, 13º, CPP e FGTS sem duplicidade', () => {
  // Salários: R$ 40.000 | Pró-labore: R$ 25.000 | 13º: R$ 5.000 | CPP: R$ 10.000 | FGTS: R$ 4.000
  // Total folha = R$ 84.000,00. RBT12r = R$ 300.000,00 -> 84.000 / 300.000 = 0,28 (28,00%) -> Anexo III
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    modoEntradaFolha: 'detalhada',
    salarios: '40000,00',
    proLabore: '25000,00',
    decimoTerceiro: '5000,00',
    cppPatronal: '10000,00',
    fgts: '4000,00',
    receitaConsolidada: '300000,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.fsConsiderada, 84000.0);
  assert.equal(res.data.rbtConsiderada, 300000.0);
  assert.equal(res.data.fatorRReal, 0.28);
  assert.equal(res.data.atingiuCorte, true);
  assert.equal(res.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);
});

test('14. Vedações expressas: avisos explicitam exclusão de aluguéis, lucros, estagiários e pagamentos a MEI', () => {
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    folhaConsolidada: '50000,00',
    receitaConsolidada: '200000,00'
  });

  assert.equal(res.ok, true);
  const avisoExclusoes = res.warnings.find((w) => w.includes('EXCLUSÕES VEDADAS NA FOLHA'));
  assert.ok(avisoExclusoes);
  assert.match(avisoExclusoes, /aluguéis/i);
  assert.match(avisoExclusoes, /lucros/i);
  assert.match(avisoExclusoes, /estagiários/i);
  assert.match(avisoExclusoes, /MEI/i);
});

test('15. RBT12r computa conjuntamente faturamento do mercado interno e receitas de exportação', () => {
  // Mercado interno: R$ 250.000,00 | Exportações: R$ 50.000,00 | Total = R$ 300.000,00
  // Folha = R$ 90.000,00 -> 90.000 / 300.000 = 0,30 (30,00%) -> Anexo III
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    folhaConsolidada: '90000,00',
    modoEntradaReceita: 'detalhada',
    mercadoInterno: '250000,00',
    exportacoes: '50000,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.rbtConsiderada, 300000.0);
  assert.equal(res.data.fsConsiderada, 90000.0);
  assert.equal(res.data.fatorRReal, 0.30);
  assert.equal(res.data.atingiuCorte, true);
  assert.equal(res.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);
});

test('16. Regime de caixa na folha é destacado conforme Solução de Consulta Cosit nº 17/2021', () => {
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    folhaConsolidada: '35000,00',
    receitaConsolidada: '100000,00'
  });

  assert.equal(res.ok, true);
  const avisoCaixa = res.warnings.find((w) => w.includes('REGIME DE CAIXA DA FOLHA'));
  assert.ok(avisoCaixa);
  assert.match(avisoCaixa, /Solução de Consulta Cosit nº 17\/2021/i);
  assert.match(avisoCaixa, /efetivamente pagos/i);
});

test('17. Validações e rejeição de entradas inválidas ou valores negativos', () => {
  // Ano inválido
  const anoInvalido = calculate({ anoReferencia: 2025 });
  assert.equal(anoInvalido.ok, false);
  assert.match(anoInvalido.error, /Ano de referência inválido/i);

  // Folha negativa
  const folhaNegativa = calculate({ anoReferencia: 2026, folhaConsolidada: '-500' });
  assert.equal(folhaNegativa.ok, false);
  assert.match(folhaNegativa.error, /não pode ser negativo/i);

  // Receita negativa
  const receitaNegativa = calculate({ anoReferencia: 2026, receitaConsolidada: '-1000' });
  assert.equal(receitaNegativa.ok, false);
  assert.match(receitaNegativa.error, /não pode ser negativo/i);
});

test('18. Conformidade do arquivo HTML (acessibilidade, semântica, ausência de style inline e br)', () => {
  const pagePath = path.join(ROOT, 'src/pages/tools/financas/fator-r.page.html');
  assert.equal(fs.existsSync(pagePath), true);
  const html = fs.readFileSync(pagePath, 'utf8');

  assert.match(html, /layout:\s*tool/);
  assert.match(html, /canonical:\s*https:\/\/www\.calculadoramaster\.com\/tools\/financas\/fator-r\.html/);
  assert.match(html, /<h1>Calculadora Fator R Simples Nacional<\/h1>/);
  assert.equal(html.includes('<br'), false, 'Não deve utilizar <br>');
  assert.equal(/\bstyle\s*=/i.test(html), false, 'Não deve utilizar style inline');
  assert.match(html, /id="erroFatorR"[^>]*role="alert"/);
  assert.match(html, /id="resultadoFatorR"[^>]*aria-live="polite"/);
  assert.match(html, /id="statusFatorR"[^>]*role="status"/);
  assert.match(html, /id="formFatorR"/);
  assert.match(html, /id="btnCalcularFR"/);
  assert.match(html, /id="btnLimparFR"/);
  assert.match(html, /id="btnCopiarFR"/);
  assert.match(html, /id="btnCompartilharFR"/);
  assert.match(html, /id="btnImprimirFR"/);
  assert.match(html, /Solução de Consulta Cosit nº 17\/2021/);
  assert.match(html, /Resolução CGSN nº 190\/2026/);
  assert.match(html, /regime de caixa/i);
});

test('19. Integração DOM: cálculo, limpeza e geração do texto de compartilhamento/cópia', () => {
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  try {
    const listeners = new Map();
    const elements = new Map();

    const mockRoot = {
      querySelector: (selector) => {
        if (!elements.has(selector)) {
          const el = {
            id: selector.replace(/[#.]/g, ''),
            value: '',
            textContent: '',
            innerHTML: '',
            hidden: true,
            className: '',
            addEventListener: (event, handler) => {
              listeners.set(`${selector}:${event}`, handler);
            },
            reset: () => {
              el.value = '';
            },
            appendChild: (child) => {}
          };
          elements.set(selector, el);
        }
        return elements.get(selector);
      }
    };

    globalThis.window = {
      location: { href: 'https://www.calculadoramaster.com/tools/financas/fator-r.html' }
    };
    globalThis.document = {
      createElement: () => ({ textContent: '', appendChild: () => {} })
    };
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: { writeText: async () => {} }
      }
    });

    const tool = setupTool(mockRoot);
    assert.ok(tool);

    const inFolha = mockRoot.querySelector('#folhaConsolidadaFR');
    inFolha.value = '28000,00';
    const inReceita = mockRoot.querySelector('#receitaConsolidadaFR');
    inReceita.value = '100000,00';

    const res = tool.executarCalculo();
    assert.equal(res.ok, true);
    assert.equal(res.data.anexoEnquadrado, ANEXOS_FATOR_R.ANEXO_III);

    const copyText = buildCopyText(res);
    assert.match(copyText, /Calculadora Fator R/);
    assert.match(copyText, /Fator R Apurado: 28,0000%/);
    assert.match(copyText, /Janela de Referência:/);

    // Teste do botão limpar
    const btnLimparHandler = listeners.get('#btnLimparFR:click');
    assert.ok(btnLimparHandler);
    btnLimparHandler();
    assert.equal(mockRoot.querySelector('#resultadoFatorR').hidden, true);
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    if (prevNavigator) {
      Object.defineProperty(globalThis, 'navigator', prevNavigator);
    }
  }
});
