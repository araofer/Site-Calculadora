/**
 * Suíte de Testes Automatizados - Calculadora de Pró-labore 2026
 *
 * Valida a exatidão matemática, conformidade legal, tratamento de limites
 * previdenciários e fiscais, regras da Lei nº 15.270/2025, encargos patronais,
 * acessibilidade e integração com o DOM.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  calculate,
  calcularInssSocio,
  calcularIrrf,
  calcularEncargosPatronais,
  formatResult,
  buildCopyText,
  setupTool,
  roundCurrency,
  roundDecimal,
  PARAMETROS_2026,
  REGIMES_TRIBUTARIOS
} from '../js/tools/pro-labore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. Pró-labore zero
// ---------------------------------------------------------------------------
test('1. Pró-labore zero: retorna todos os tributos zerados sem erro', () => {
  const res = calculate({
    proLaboreBruto: '0,00',
    anoReferencia: 2026
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.proLaboreBruto, 0);
  assert.equal(res.data.inssSocio, 0);
  assert.equal(res.data.baseCalculoIrrf, 0);
  assert.equal(res.data.irrfFinal, 0);
  assert.equal(res.data.proLaboreLiquido, 0);
  assert.equal(res.data.cppPatronal, 0);
  assert.equal(res.data.custoTotalEmpresa, 0);
});

// ---------------------------------------------------------------------------
// 2. Valores negativos e campos inválidos
// ---------------------------------------------------------------------------
test('2. Valores negativos e campos inválidos são rejeitados com erro explícito', () => {
  const resNegativo = calculate({
    proLaboreBruto: '-1500,00',
    anoReferencia: 2026
  });
  assert.equal(resNegativo.ok, false);
  assert.match(resNegativo.error, /não pode ser negativo/i);

  const resAnoInvalido = calculate({
    proLaboreBruto: '5000,00',
    anoReferencia: 2025
  });
  assert.equal(resAnoInvalido.ok, false);
  assert.match(resAnoInvalido.error, /Ano de competência inválido ou não suportado/i);
});

// ---------------------------------------------------------------------------
// 3. Pró-labore de R$ 5.000,00 em 2026, verificando a redução do IRRF
// ---------------------------------------------------------------------------
test('3. Pró-labore de R$ 5.000,00 em 2026: redução integral do IRRF pela Lei nº 15.270/2025 (imposto zero)', () => {
  // Pró-labore = R$ 5.000,00
  // INSS = 11% de 5.000,00 = R$ 550,00
  // Deduções legais: 550,00 vs Desconto Simplificado: 607,20 -> adota Simplificado
  // Base IRRF = 5.000,00 - 607,20 = 4.392,80 (faixa 22,5%, dedução 675,49)
  // IRRF antes da redução = 4.392,80 * 0,225 - 675,49 = 988,38 - 675,49 = R$ 312,89
  // Redução Lei 15.270/2025: rendimento de até R$ 5.000,00 tem redução integral do imposto devido -> zerando o IRRF
  const res = calculate({
    proLaboreBruto: '5000,00',
    anoReferencia: 2026
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.inssSocio, 550.0);
  assert.equal(res.data.baseCalculoIrrf, 4392.8);
  assert.equal(res.data.metodoDeducaoIrrf, 'simplificado');
  assert.equal(res.data.irrfAntesReducao, 312.89);
  assert.equal(res.data.reducaoLei15270, 312.89, 'Redução deve cobrir integralmente o imposto apurado');
  assert.equal(res.data.irrfFinal, 0.0, 'IRRF final retido deve ser rigorosamente zero');
  assert.equal(res.data.proLaboreLiquido, 4450.0, 'Líquido = 5.000 - 550 (INSS) - 0 (IRRF) = R$ 4.450,00');
});

// ---------------------------------------------------------------------------
// 4. Pró-labore de R$ 6.000,00 em 2026, verificando cálculo progressivo e redução parcial
// ---------------------------------------------------------------------------
test('4. Pró-labore de R$ 6.000,00 em 2026: cálculo progressivo e redução parcial na faixa de transição', () => {
  // Pró-labore = R$ 6.000,00
  // INSS sócio: 11% de 6.000,00 = R$ 660,00
  // Deduções legais: 660,00 > 607,20 (simplificado) -> adota Deduções Legais
  // Base IRRF = 6.000,00 - 660,00 = 5.340,00 (faixa 27,5%, dedução 908,73)
  // IRRF antes da redução: round2(5.340 * 0,275 - 908,73) = round2(1.468,50 - 908,73) = R$ 559,77
  // Redução Lei 15.270/2025: 978,62 - (0,133145 * 6.000) = 978,62 - 798,87 = R$ 179,75
  // IRRF Final: 559,77 - 179,75 = R$ 380,02
  // Pró-labore Líquido: 6.000,00 - 660,00 - 380,02 = R$ 4.959,98
  const res = calculate({
    proLaboreBruto: '6000,00',
    anoReferencia: 2026
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.inssSocio, 660.0);
  assert.equal(res.data.metodoDeducaoIrrf, 'legal');
  assert.equal(res.data.baseCalculoIrrf, 5340.0);
  assert.equal(res.data.irrfAntesReducao, 559.77);
  assert.equal(res.data.reducaoLei15270, 179.75);
  assert.equal(res.data.irrfFinal, 380.02);
  assert.equal(res.data.proLaboreLiquido, 4959.98);
});

// ---------------------------------------------------------------------------
// 5. Rendimento mensal de R$ 7.350,00 e valor acima desse limite
// ---------------------------------------------------------------------------
test('5. Rendimento mensal de R$ 7.350,00 (redução zerada) e acima desse limite (sem redução)', () => {
  // Limite da transição: R$ 7.350,00
  // Redução: round2(978,62 - 0,133145 * 7.350) = round2(978,62 - 978,61575) = R$ 0,00
  const res7350 = calculate({
    proLaboreBruto: '7350,00',
    anoReferencia: 2026
  });
  assert.equal(res7350.ok, true);
  assert.equal(res7350.data.faixaReducaoLei15270, 'transicao_5000_a_7350');
  assert.equal(res7350.data.reducaoLei15270, 0.0);
  assert.equal(res7350.data.irrfFinal, res7350.data.irrfAntesReducao);

  // Valor acima de R$ 7.350,00: R$ 8.000,00 -> sem redução
  const res8000 = calculate({
    proLaboreBruto: '8000,00',
    anoReferencia: 2026
  });
  assert.equal(res8000.ok, true);
  assert.equal(res8000.data.faixaReducaoLei15270, 'acima_7350_sem_reducao');
  assert.equal(res8000.data.reducaoLei15270, 0.0);
  assert.equal(res8000.data.irrfFinal, res8000.data.irrfAntesReducao);
});

// ---------------------------------------------------------------------------
// 6. Desconto simplificado comparado com deduções legais
// ---------------------------------------------------------------------------
test('6. Desconto simplificado comparado com deduções legais: escolhe automaticamente a mais favorável', () => {
  // Pró-labore de R$ 3.000,00 sem dependentes:
  // INSS = 11% de 3.000 = R$ 330,00.
  // Deduções legais: R$ 330,00 < Desconto Simplificado de R$ 607,20.
  // O sistema deve escolher 'simplificado'.
  const res = calculate({
    proLaboreBruto: '3000,00',
    anoReferencia: 2026,
    dependentes: 0
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.inssSocio, 330.0);
  assert.equal(res.data.metodoDeducaoIrrf, 'simplificado');
  assert.equal(res.data.baseCalculoIrrf, 3000.0 - 607.2);
});

// ---------------------------------------------------------------------------
// 7. Dedução por dependentes
// ---------------------------------------------------------------------------
test('7. Dedução por dependentes: aplica R$ 189,59 por dependente em 2026', () => {
  // Pró-labore de R$ 6.000,00 com 2 dependentes:
  // INSS = R$ 660,00.
  // Dependentes: 2 * 189,59 = R$ 379,18.
  // Total deduções legais: 660,00 + 379,18 = R$ 1.039,18.
  // Base IRRF: 6.000 - 1.039,18 = R$ 4.960,82.
  const res = calculate({
    proLaboreBruto: '6000,00',
    anoReferencia: 2026,
    dependentes: 2
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.totalDeducoesLegais, 1039.18);
  assert.equal(res.data.baseCalculoIrrf, 4960.82);
  assert.equal(res.data.metodoDeducaoIrrf, 'legal');
});

// ---------------------------------------------------------------------------
// 8. Pensão alimentícia judicial, quando informada
// ---------------------------------------------------------------------------
test('8. Pensão alimentícia judicial abate integralmente da base de cálculo legal', () => {
  // Pró-labore R$ 7.000,00 | INSS = 770,00 | Pensão = 1.000,00
  // Total legal = 1.770,00 -> Base = 5.230,00
  const res = calculate({
    proLaboreBruto: '7000,00',
    anoReferencia: 2026,
    pensaoAlimenticia: '1000,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.totalDeducoesLegais, 1770.0);
  assert.equal(res.data.baseCalculoIrrf, 5230.0);
});

// ---------------------------------------------------------------------------
// 9. INSS de 11% aplicado corretamente ao pró-labore
// ---------------------------------------------------------------------------
test('9. INSS de 11% do Contribuinte Individual é aplicado ao pró-labore com fundamentação correta (Lei nº 10.666/2003, art. 4º, caput e Lei nº 8.212/1991, arts. 21 e 30, § 4º)', () => {
  const inss = calcularInssSocio(4000.0, 0, 0, PARAMETROS_2026);
  assert.equal(inss.inssDescontado, 440.0, '11% de 4.000 deve ser R$ 440,00');
  assert.equal(inss.aliquotaEfetiva, 0.11);

  // Verificação de fundamentação legal na memória de cálculo:
  // - Obrigação da empresa: art. 4º, caput da Lei nº 10.666/2003 (não § 1º, que rege cooperativas)
  // - Alíquota de 11%: arts. 21 e 30, § 4º da Lei nº 8.212/1991 c/c IN RFB nº 2.110/2022, art. 37
  const res = calculate({
    proLaboreBruto: '4000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.SIMPLES_ANEXO_1_2_3_5
  });
  assert.equal(res.ok, true);
  assert.ok(
    res.memoriaCalculo.some((m) => m.includes('Lei nº 10.666/2003, art. 4º, caput') && m.includes('Lei nº 8.212/1991')),
    'Memória de cálculo deve explicitar a fundamentação legal correta da obrigação patronal e da alíquota do sócio'
  );
  assert.ok(
    !res.memoriaCalculo.some((m) => m.includes('art. 4º, § 1º')),
    'Não deve citar o art. 4º, § 1º da Lei nº 10.666/2003, que é restrito a cooperativas de trabalho'
  );
});

// ---------------------------------------------------------------------------
// 10. Limite máximo previdenciário de 2026
// ---------------------------------------------------------------------------
test('10. Limite máximo previdenciário de 2026 (teto RGPS R$ 8.475,55 e desconto R$ 932,31)', () => {
  // Pró-labore de R$ 15.000,00 (acima do teto de R$ 8.475,55)
  const res = calculate({
    proLaboreBruto: '15000,00',
    anoReferencia: 2026
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.baseCalculoInss, 8475.55);
  assert.equal(res.data.inssSocio, 932.31);
  assert.equal(res.data.atingiuTetoInss, true);
});

// ---------------------------------------------------------------------------
// 11. Existência de outras remunerações previdenciárias na mesma competência
// ---------------------------------------------------------------------------
test('11. Existência de outras remunerações previdenciárias reduz a margem disponível até o teto', () => {
  // Sócio já tem remuneração CLT de R$ 5.000,00 em outra empresa.
  // Teto RGPS 2026 = 8.475,55.
  // Base disponível nesta empresa = 8.475,55 - 5.000,00 = 3.475,55.
  // Pró-labore = R$ 5.000,00 -> base tributável nesta fonte = R$ 3.475,55.
  // INSS a descontar = round2(3.475,55 * 0,11) = R$ 382,31.
  const res = calculate({
    proLaboreBruto: '5000,00',
    anoReferencia: 2026,
    outrasRemuneracoes: '5000,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.baseCalculoInss, 3475.55);
  assert.equal(res.data.inssSocio, 382.31);
});

// ---------------------------------------------------------------------------
// 12. Contribuições já retidas em outras fontes
// ---------------------------------------------------------------------------
test('12. Contribuições já retidas em outras fontes que atingem o teto zeram a retenção nesta empresa', () => {
  // Sócio já teve retenção de R$ 932,31 em outra fonte: retenção deve ser zero
  const res = calculate({
    proLaboreBruto: '7000,00',
    anoReferencia: 2026,
    inssOutrasFontes: '932,31'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.inssSocio, 0.0);
  assert.ok(res.warnings.some((w) => w.includes('TETO DO INSS JÁ ATINGIDO')));
});

// ---------------------------------------------------------------------------
// 13. Pró-labore inferior ao salário mínimo, sem ajuste silencioso
// ---------------------------------------------------------------------------
test('13. Pró-labore inferior ao salário mínimo (R$ 1.621,00): calcula 11% sobre o valor real e emite aviso', () => {
  // Pró-labore = R$ 1.000,00 (inferior a R$ 1.621,00)
  // INSS = 11% de 1.000 = R$ 110,00 (não altera silenciosamente para 1.621 * 0,11 = 178,31)
  const res = calculate({
    proLaboreBruto: '1000,00',
    anoReferencia: 2026
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.inssSocio, 110.0, 'Retenção deve ser calculada estritamente sobre o valor real');
  assert.ok(
    res.warnings.some((w) => w.includes('PRÓ-LABORE INFERIOR AO SALÁRIO MÍNIMO')),
    'Deve emitir aviso legal sobre necessidade de complementação voluntária'
  );
});

// ---------------------------------------------------------------------------
// 14. Separação entre INSS do sócio e CPP patronal
// ---------------------------------------------------------------------------
test('14. Separação explícita entre INSS descontado do sócio e encargo patronal da empresa', () => {
  const res = calculate({
    proLaboreBruto: '6000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.SIMPLES_ANEXO_4
  });

  assert.equal(res.ok, true);
  // Sócio
  assert.equal(res.data.inssSocio, 660.0);
  assert.equal(res.data.proLaboreLiquido, 4959.98);
  // Empresa
  assert.equal(res.data.cppPatronal, 1200.0, '20% de CPP patronal = R$ 1.200,00');
  assert.equal(res.data.custoTotalEmpresa, 7200.0, 'Custo total empresa = 6.000 + 1.200 = R$ 7.200,00');
  assert.notEqual(res.data.proLaboreLiquido, res.data.custoTotalEmpresa);
});

// ---------------------------------------------------------------------------
// 15. Regime Simples Nacional nos Anexos I, II, III e V
// ---------------------------------------------------------------------------
test('15. Simples Nacional nos Anexos I, II, III e V: CPP inclusa no DAS, encargo avulso é zero', () => {
  const res = calculate({
    proLaboreBruto: '8000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.SIMPLES_ANEXO_1_2_3_5
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.cppPatronal, 0.0);
  assert.equal(res.data.isentoOuSubstituidoNoDas, true);
  assert.equal(res.data.custoTotalEmpresa, 8000.0);
});

// ---------------------------------------------------------------------------
// 16. Regime Simples Nacional no Anexo IV
// ---------------------------------------------------------------------------
test('16. Simples Nacional no Anexo IV: CPP de 20% recolhida separadamente em DARF', () => {
  const res = calculate({
    proLaboreBruto: '5000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.SIMPLES_ANEXO_4
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.aliquotaPatronal, 0.2);
  assert.equal(res.data.cppPatronal, 1000.0);
  assert.equal(res.data.custoTotalEmpresa, 6000.0);
});

// ---------------------------------------------------------------------------
// 16A. Empresa fora do Simples, sem CPRB (Regime Comum)
// ---------------------------------------------------------------------------
test('16A. Empresa fora do Simples sem CPRB: CPP patronal ordinária de 20% (art. 22, III da Lei nº 8.212/1991)', () => {
  const res = calculate({
    proLaboreBruto: '6000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.FORA_SIMPLES
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.aliquotaPatronal, 0.2);
  assert.equal(res.data.cppPatronal, 1200.0, '20% de 6.000 = R$ 1.200,00');
  assert.equal(res.data.custoTotalEmpresa, 7200.0, 'Custo = 6.000 + 1.200 = R$ 7.200,00');
  assert.equal(res.data.cprbAplicavel, false);
});

// ---------------------------------------------------------------------------
// 16B. Empresa abrangida e optante pela CPRB em 2026
// ---------------------------------------------------------------------------
test('16B. Empresa optante pela CPRB em 2026: CPP parcial de 10% e conjunto completo de resultados do sócio marcado como estimativo sob hipótese operacional', () => {
  // Lei nº 14.973/2024, art. 9º-A estabelece em 2026 50% das alíquotas do art. 22, III da Lei 8.212/91 (50% de 20% = 10%)
  const res = calculate({
    proLaboreBruto: '6000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB
  });

  assert.equal(res.ok, true);
  // Encargos da Empresa
  assert.equal(res.data.aliquotaPatronal, 0.1, 'Alíquota de CPP sobre pró-labore com CPRB em 2026 deve ser 10%');
  assert.equal(res.data.cppPatronal, 600.0, '10% de 6.000 = R$ 600,00');
  assert.equal(res.data.cprbAplicavel, true);
  assert.equal(res.data.cprbSobreReceitaInclusa, false, 'Não deve computar CPRB sobre receita sem faturamento');
  assert.equal(res.data.custoTotalEmpresa, 6600.0, 'Custo sobre pró-labore = 6.000 + 600 = R$ 6.600,00');

  // Sinalização de incerteza jurídica para todo o conjunto de resultados do sócio
  assert.equal(res.data.limitacaoPrevidenciariaCprb, true, 'Deve sinalizar limitação previdenciária sob CPRB');
  assert.equal(res.data.valoresSocioDefinitivos, false, 'Conjunto de valores do sócio não deve ser tratado como definitivo');
  assert.equal(res.data.retencaoInssDefinitiva, false, 'INSS do sócio não deve ser definitivo');
  assert.equal(res.data.baseIrrfDefinitiva, false, 'Base do IRRF não deve ser definitiva pois depende do INSS');
  assert.equal(res.data.irrfDefinitivo, false, 'IRRF não deve ser definitivo');
  assert.equal(res.data.proLaboreLiquidoDefinitivo, false, 'Líquido do sócio não deve ser definitivo');

  // Valores numéricos sob a hipótese operacional de 11%
  assert.equal(res.data.inssSocio, 660.0, 'Retenção mantida em 11% sob hipótese operacional sem inventar alíquota alternativa');
  assert.equal(res.data.irrfFinal, 380.02, 'IRRF calculado pela hipótese operacional de 11%');
  assert.equal(res.data.proLaboreLiquido, 4959.98, 'Líquido calculado pela hipótese operacional');

  // Avisos legais e memória de cálculo
  assert.ok(
    res.warnings.some(
      (w) =>
        w.includes('CPRB EM 2026 (LEI Nº 14.973/2024 — INCERTEZA JURÍDICA E CARÁTER ESTIMATIVO)') &&
        w.includes('HIPÓTESE OPERACIONAL E ORIENTATIVA') &&
        w.includes('ESTIMATIVO e não definitivo')
    ),
    'Avisos legais devem explicitar o caráter estimativo e a ausência de manifestação conclusiva'
  );
  assert.ok(
    !res.warnings.some((w) => w.toLowerCase().includes('pacificada') || w.toLowerCase().includes('pacífico')),
    'Não deve afirmar que a alíquota de 11% é pacificada no cenário de transição'
  );

  // Formatação visual da interface (formatResult)
  const formatted = formatResult(res.data);
  assert.match(formatted.inssSocioFormatado, /estimativo/i, 'INSS formatado deve indicar estimativa');
  assert.match(formatted.baseIrrfFormatada, /estimativa/i, 'Base IRRF formatada deve indicar estimativa');
  assert.match(formatted.irrfFinalFormatado, /estimativo/i, 'IRRF formatado deve indicar estimativo');
  assert.match(formatted.proLaboreLiquidoFormatado, /estimativo/i, 'Líquido formatado deve indicar estimativa');
  assert.ok(formatted.avisoIncertezaCprb, 'Deve fornecer aviso estruturado de incerteza da CPRB');

  // Texto de cópia e compartilhamento (buildCopyText)
  const copyText = buildCopyText(res);
  assert.match(copyText, /estimativo sob hipótese operacional/i, 'Texto de cópia deve advertir caráter estimativo');
});

// ---------------------------------------------------------------------------
// 16C. CPRB sobre receita bruta não incluída no custo total
// ---------------------------------------------------------------------------
test('16C. CPRB sobre receita bruta não é incluída no custo total por falta de dados de receita e alíquota setorial', () => {
  const res = calculate({
    proLaboreBruto: '10000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.cppPatronal, 1000.0, '10% de 10.000 = R$ 1.000,00');
  assert.equal(res.data.cprbSobreReceitaInclusa, false);
  assert.ok(
    res.warnings.some((w) => w.includes('CPRB EM 2026') && w.includes('NÃO está incluída')),
    'Deve avisar expressamente que a contribuição sobre receita bruta não está inclusa e o custo total da empresa não pode ser determinado'
  );
});

// ---------------------------------------------------------------------------
// 16D. Regime patronal não informado
// ---------------------------------------------------------------------------
test('16D. Regime patronal não informado: emite aviso de limitação e não apresenta estimativa patronal indevida', () => {
  // Teste com valor explícito 'nao_informado'
  const resExplicit = calculate({
    proLaboreBruto: '5000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.NAO_INFORMADO
  });

  assert.equal(resExplicit.ok, true);
  assert.equal(resExplicit.data.cppPatronalCalculavel, false);
  assert.equal(resExplicit.data.cppPatronal, null);
  assert.equal(resExplicit.data.custoTotalEmpresa, null);
  assert.ok(resExplicit.warnings.some((w) => w.includes('REGIME PATRONAL NÃO INFORMADO')));
  // Sócio deve continuar sendo calculado normalmente
  assert.equal(resExplicit.data.inssSocio, 550.0);
  assert.equal(resExplicit.data.proLaboreLiquido, 4450.0);

  // Teste com campo omitido / vazio
  const resOmitido = calculate({
    proLaboreBruto: '5000,00',
    anoReferencia: 2026
  });
  assert.equal(resOmitido.ok, true);
  assert.equal(resOmitido.data.cppPatronalCalculavel, false);
  assert.equal(resOmitido.data.cppPatronal, null);
  assert.equal(resOmitido.data.custoTotalEmpresa, null);
  assert.ok(resOmitido.warnings.some((w) => w.includes('REGIME PATRONAL NÃO INFORMADO')));
});

// ---------------------------------------------------------------------------
// 16E. Regimes normais mantêm resultados definitivos sem marcação de estimativa
// ---------------------------------------------------------------------------
test('16E. Regimes normais (fora do Simples sem CPRB e Simples Nacional): resultados do sócio são definitivos', () => {
  const resComum = calculate({
    proLaboreBruto: '6000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.FORA_SIMPLES
  });

  assert.equal(resComum.ok, true);
  assert.equal(resComum.data.valoresSocioDefinitivos, true);
  assert.equal(resComum.data.retencaoInssDefinitiva, true);
  assert.equal(resComum.data.baseIrrfDefinitiva, true);
  assert.equal(resComum.data.irrfDefinitivo, true);
  assert.equal(resComum.data.proLaboreLiquidoDefinitivo, true);
  assert.equal(resComum.data.limitacaoPrevidenciariaCprb, false);

  const formatted = formatResult(resComum.data);
  assert.equal(formatted.inssSocioFormatado.includes('(estimativo)'), false);
  assert.equal(formatted.baseIrrfFormatada.includes('(estimativa)'), false);
  assert.equal(formatted.irrfFinalFormatado.includes('(estimativo)'), false);
  assert.equal(formatted.proLaboreLiquidoFormatado.includes('(estimativo)'), false);
  assert.equal(formatted.avisoIncertezaCprb, null);
});

// ---------------------------------------------------------------------------
// 17. Empresas com atividades concomitantes não suportadas integralmente
// ---------------------------------------------------------------------------
test('17. Atividades concomitantes: apresenta aviso de limitação técnica sem inventar rateio', () => {
  const res = calculate({
    proLaboreBruto: '5000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.CONCOMITANTE
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.cppPatronalCalculavel, false);
  assert.equal(res.data.cppPatronal, null);
  assert.equal(res.data.custoTotalEmpresa, null);
  assert.ok(res.warnings.some((w) => w.includes('ATIVIDADES CONCOMITANTES')));
});

// ---------------------------------------------------------------------------
// 18. Tratamento específico do MEI
// ---------------------------------------------------------------------------
test('18. MEI: emite aviso fundamentado na SC Cosit nº 251/2024 de que não há pró-labore regular', () => {
  const res = calculate({
    proLaboreBruto: '3000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.MEI
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.cppPatronal, 0);
  assert.ok(res.warnings.some((w) => w.includes('TRATAMENTO DO MEI (SC Cosit nº 251/2024)')));
});

// ---------------------------------------------------------------------------
// 19. Ausência de imposto negativo ou divisão por zero
// ---------------------------------------------------------------------------
test('19. Ausência absoluta de imposto negativo, NaN ou divisão por zero', () => {
  const resZero = calculate({ proLaboreBruto: '0,00', anoReferencia: 2026 });
  assert.equal(resZero.ok, true);
  assert.equal(resZero.data.irrfFinal, 0);
  assert.equal(isNaN(resZero.data.proLaboreLiquido), false);

  // Rendimento na faixa de transição onde a redução teórica supera o imposto
  const resPequeno = calculate({ proLaboreBruto: '2500,00', anoReferencia: 2026 });
  assert.equal(resPequeno.ok, true);
  assert.ok(resPequeno.data.irrfFinal >= 0, 'IRRF final nunca pode ser negativo');
});

// ---------------------------------------------------------------------------
// 20. Arredondamento consistente para centavos
// ---------------------------------------------------------------------------
test('20. Arredondamento consistente para centavos em todas as métricas financeiras', () => {
  const res = calculate({
    proLaboreBruto: '3333,33',
    anoReferencia: 2026
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.inssSocio, roundCurrency(res.data.inssSocio));
  assert.equal(res.data.baseCalculoIrrf, roundCurrency(res.data.baseCalculoIrrf));
  assert.equal(res.data.irrfFinal, roundCurrency(res.data.irrfFinal));
  assert.equal(res.data.proLaboreLiquido, roundCurrency(res.data.proLaboreLiquido));
});

// ---------------------------------------------------------------------------
// 21. Impedimento de usar tabelas de ano futuro sem valores oficiais
// ---------------------------------------------------------------------------
test('21. Impedimento de usar tabelas de anos futuros (ex: 2027) sem valores oficiais homologados', () => {
  const res2027 = calculate({
    proLaboreBruto: '5000,00',
    anoReferencia: 2027
  });

  assert.equal(res2027.ok, false);
  assert.match(res2027.error, /não suportado/i);
});

// ---------------------------------------------------------------------------
// 22. Conformidade do arquivo HTML da ferramenta
// ---------------------------------------------------------------------------
test('22. Conformidade do arquivo HTML: semântica, acessibilidade e convenções', () => {
  const htmlPath = path.join(ROOT_DIR, 'src', 'pages', 'tools', 'financas', 'pro-labore.page.html');
  assert.ok(fs.existsSync(htmlPath), 'Arquivo pro-labore.page.html deve existir');

  const content = fs.readFileSync(htmlPath, 'utf-8');

  // Apenas um único <h1>
  const h1Matches = content.match(/<h1[\s>]/gi) || [];
  assert.equal(h1Matches.length, 1, 'Deve existir exatamente um <h1>');

  // Sem tags <br>
  assert.equal(/<br\s*\/?>/i.test(content), false, 'Não deve conter tags <br>');

  // Sem estilos inline
  assert.equal(/style\s*=/i.test(content), false, 'Não deve conter atributos style inline');

  // Frontmatter e layout tool
  assert.match(content, /layout:\s*tool/);
  assert.match(content, /canonical:\s*https:\/\/www\.calculadoramaster\.com\/tools\/financas\/pro-labore\.html/);

  // Elementos de acessibilidade
  assert.match(content, /id="erroProLabore"/);
  assert.match(content, /role="alert"/);
  assert.match(content, /aria-live="assertive"/);
  assert.match(content, /id="resultadoProLabore"/);
  assert.match(content, /aria-live="polite"/);
});

// ---------------------------------------------------------------------------
// 23. Integração com o DOM e Ações de Resultado
// ---------------------------------------------------------------------------
test('23. Integração com o DOM: setupTool executa cálculo, limpeza e gera texto de cópia', () => {
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
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
            setAttribute: () => {},
            focus: () => {},
            addEventListener: (event, handler) => {
              listeners.set(`${selector}:${event}`, handler);
            },
            reset: () => {
              el.value = '';
            },
            appendChild: (child) => {
              if (child && child.textContent) {
                el.textContent += child.textContent;
              }
            }
          };
          elements.set(selector, el);
        }
        return elements.get(selector);
      },
      querySelectorAll: () => []
    };

    globalThis.window = {
      location: { href: 'https://www.calculadoramaster.com/tools/financas/pro-labore.html' }
    };
    globalThis.document = {
      createElement: () => ({
        textContent: '',
        className: '',
        setAttribute: () => {},
        appendChild: () => {}
      })
    };
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: { writeText: async () => {} }
      }
    });

    const inBruto = mockRoot.querySelector('#proLaboreBruto');
    inBruto.value = '6000,00';
    const inAno = mockRoot.querySelector('#anoReferenciaPL');
    inAno.value = '2026';
    const inRegime = mockRoot.querySelector('#regimeTributarioPL');
    inRegime.value = 'simples_anexo_1_2_3_5';

    const tool = setupTool(mockRoot);
    assert.ok(tool, 'setupTool deve retornar objeto com funções de controle');

    const res = tool.executarCalculo();
    assert.equal(res.ok, true);
    assert.equal(res.data.proLaboreLiquido, 4959.98);

    const resLiqEl = mockRoot.querySelector('#resProLaboreLiquido');
    assert.equal(resLiqEl.textContent, 'R$\xa04.959,98');

    const copyText = buildCopyText(res);
    assert.match(copyText, /Simulação de Pró-labore/);
    assert.match(copyText, /Pró-labore Bruto: R\$\s*6\.000,00/);
    assert.match(copyText, /INSS do Sócio \(11%\): R\$\s*660,00/);
    assert.match(copyText, /Pró-labore Líquido Recebido: R\$\s*4\.959,98/);
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
    if (prevNavigator) {
      Object.defineProperty(globalThis, 'navigator', prevNavigator);
    } else {
      delete globalThis.navigator;
    }
  }
});

// ---------------------------------------------------------------------------
// 24. Preservação dos resultados de IRRF e do líquido do sócio nos exemplos já validados
// ---------------------------------------------------------------------------
test('24. Preservação dos resultados de IRRF e do líquido do sócio nos exemplos já validados', () => {
  // Cenário R$ 5.000,00
  const res5000 = calculate({
    proLaboreBruto: '5000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.SIMPLES_ANEXO_1_2_3_5
  });
  assert.equal(res5000.data.inssSocio, 550.0);
  assert.equal(res5000.data.irrfFinal, 0.0);
  assert.equal(res5000.data.proLaboreLiquido, 4450.0);

  // Cenário R$ 6.000,00
  const res6000 = calculate({
    proLaboreBruto: '6000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.FORA_SIMPLES
  });
  assert.equal(res6000.data.inssSocio, 660.0);
  assert.equal(res6000.data.irrfFinal, 380.02);
  assert.equal(res6000.data.proLaboreLiquido, 4959.98);

  // Cenário R$ 10.000,00
  const res10000 = calculate({
    proLaboreBruto: '10000,00',
    anoReferencia: 2026,
    regimeTributario: REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB
  });
  assert.equal(res10000.data.inssSocio, 932.31);
  assert.equal(res10000.data.irrfFinal, 1584.88);
  assert.equal(res10000.data.proLaboreLiquido, 7482.81);
  // O líquido do sócio é imutável perante a opção de regime da empresa
  assert.equal(res10000.data.proLaboreLiquido, 10000 - 932.31 - 1584.88);
});

// ---------------------------------------------------------------------------
// 25. Regressão fiscal estrita: Parâmetros e limites da Tabela Mensal do IRPF 2026
// ---------------------------------------------------------------------------
test('25. Regressão fiscal: Tabela progressiva mensal oficial de 2026 e Lei nº 15.270/2025', () => {
  // Verificação direta das faixas oficiais em PARAMETROS_2026.faixasIrrf
  const faixas = PARAMETROS_2026.faixasIrrf;
  assert.equal(faixas.length, 5);

  // 1ª faixa: até R$ 2.428,80 (isento - 0%)
  assert.equal(faixas[0].ate, 2428.8);
  assert.equal(faixas[0].aliquota, 0.0);
  assert.equal(faixas[0].deducao, 0.0);

  // 2ª faixa: até R$ 2.826,65 (7,5% - dedução R$ 182,16)
  assert.equal(faixas[1].ate, 2826.65);
  assert.equal(faixas[1].aliquota, 0.075);
  assert.equal(faixas[1].deducao, 182.16);

  // 3ª faixa: até R$ 3.751,05 (15,0% - dedução R$ 394,16)
  assert.equal(faixas[2].ate, 3751.05);
  assert.equal(faixas[2].aliquota, 0.15);
  assert.equal(faixas[2].deducao, 394.16);

  // 4ª faixa: até R$ 4.664,68 (22,5% - dedução R$ 675,49)
  assert.equal(faixas[3].ate, 4664.68);
  assert.equal(faixas[3].aliquota, 0.225);
  assert.equal(faixas[3].deducao, 675.49);

  // 5ª faixa: acima de R$ 4.664,68 (27,5% - dedução R$ 908,73)
  assert.equal(faixas[4].ate, Infinity);
  assert.equal(faixas[4].aliquota, 0.275);
  assert.equal(faixas[4].deducao, 908.73);

  // Desconto simplificado mensal: R$ 607,20 (25% de R$ 2.428,80)
  assert.equal(PARAMETROS_2026.descontoSimplificadoMensal, 607.2);
  assert.equal(roundCurrency(2428.8 * 0.25), 607.2);

  // Dedução por dependente: R$ 189,59
  assert.equal(PARAMETROS_2026.deducaoPorDependente, 189.59);

  // Parâmetros da Lei nº 15.270/2025
  assert.equal(PARAMETROS_2026.reducaoLei15270.limiteIsencaoTotal, 5000.0);
  assert.equal(PARAMETROS_2026.reducaoLei15270.reducaoMaximaAte5000, 312.89);
  assert.equal(PARAMETROS_2026.reducaoLei15270.limiteSuperiorTransicao, 7350.0);
  assert.equal(PARAMETROS_2026.reducaoLei15270.formulaConstante, 978.62);
  assert.equal(PARAMETROS_2026.reducaoLei15270.formulaFator, 0.133145);

  // Teste de cálculo nos limites de transição
  // 1) Pró-labore de R$ 5.000,00 -> Redução de R$ 312,89 cobrindo integralmente o imposto apurado
  const r5000 = calcularIrrf(5000.0, 550.0, 0, 0, 0, PARAMETROS_2026);
  assert.equal(r5000.irrfFinal, 0.0);
  assert.equal(r5000.reducaoAplicada, 312.89);

  // 2) Pró-labore de R$ 5.000,01 -> Transição linear decrescente (redução R$ 312,89)
  const r5000_01 = calcularIrrf(5000.01, 550.0, 0, 0, 0, PARAMETROS_2026);
  assert.equal(r5000_01.faixaReducao, 'transicao_5000_a_7350');
  assert.equal(r5000_01.reducaoCalculada, 312.89);

  // 3) Pró-labore de R$ 7.350,00 -> Limite superior da transição (redução zerada: 978,62 - 0,133145 * 7350 = 0,00)
  const r7350 = calcularIrrf(7350.0, 808.5, 0, 0, 0, PARAMETROS_2026);
  assert.equal(r7350.faixaReducao, 'transicao_5000_a_7350');
  assert.equal(r7350.reducaoCalculada, 0.0);
  assert.equal(r7350.reducaoAplicada, 0.0);
  assert.equal(r7350.irrfFinal, r7350.impostoAntesReducao);

  // 4) Pró-labore de R$ 7.350,01 -> Acima da transição (sem redução)
  const r7350_01 = calcularIrrf(7350.01, 808.5, 0, 0, 0, PARAMETROS_2026);
  assert.equal(r7350_01.faixaReducao, 'acima_7350_sem_reducao');
  assert.equal(r7350_01.reducaoCalculada, 0.0);
  assert.equal(r7350_01.reducaoAplicada, 0.0);
  assert.equal(r7350_01.irrfFinal, r7350_01.impostoAntesReducao);
});
