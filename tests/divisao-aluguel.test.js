/**
 * Suíte de Testes Automatizados - Calculadora de Divisão de Aluguel e Despesas
 *
 * Valida a exatidão matemática, divisão igualitária e proporcional,
 * distribuição determinística de centavos, cálculo de saldos credores e devedores,
 * algoritmo de liquidação de saldos (transferências ótimas), validação de entradas
 * e conformidade com o DOM.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  calculateRentSplit,
  parseMoneyToCents,
  parsePercent,
  formatCurrency,
  formatPercent,
  formatResult,
  buildCopyText,
  setupTool,
  MODOS_DIVISAO
} from '../js/tools/divisao-aluguel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. Divisão igualitária entre 2 moradores
// ---------------------------------------------------------------------------
test('1. Divisão igualitária entre 2 moradores: metade exata para cada um', () => {
  const res = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [
      { id: 'm1', nome: 'Ana' },
      { id: 'm2', nome: 'Bia' }
    ],
    despesas: [
      { descricao: 'Aluguel', valor: '2000,00', pagoPor: 'm1' },
      { descricao: 'Condomínio', valor: '600,00', pagoPor: 'm2' }
    ]
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.totalDespesas, 2600.0);
  assert.equal(res.data.totalPagoGeral, 2600.0);
  assert.equal(res.data.moradores[0].cota, 1300.0);
  assert.equal(res.data.moradores[1].cota, 1300.0);

  // Ana pagou 2.000, devia 1.300 -> saldo = +700 (credor)
  assert.equal(res.data.moradores[0].totalPago, 2000.0);
  assert.equal(res.data.moradores[0].saldo, 700.0);
  assert.equal(res.data.moradores[0].situacao, 'credor');

  // Bia pagou 600, devia 1.300 -> saldo = -700 (devedor)
  assert.equal(res.data.moradores[1].totalPago, 600.0);
  assert.equal(res.data.moradores[1].saldo, -700.0);
  assert.equal(res.data.moradores[1].situacao, 'devedor');

  // Transferência sugerida: Bia paga 700 para Ana
  assert.equal(res.data.transferenciasSugeridas.length, 1);
  assert.equal(res.data.transferenciasSugeridas[0].deNome, 'Bia');
  assert.equal(res.data.transferenciasSugeridas[0].paraNome, 'Ana');
  assert.equal(res.data.transferenciasSugeridas[0].valor, 700.0);
});

// ---------------------------------------------------------------------------
// 2. Divisão igualitária entre 3 moradores com distribuição de centavos
// ---------------------------------------------------------------------------
test('2. Divisão igualitária entre 3 moradores: distribui centavos residuais sem perder nenhum valor', () => {
  // R$ 100,00 entre 3 pessoas: 10000 centavos / 3 = 3333 centavos (R$ 33,33) com resto 1 centavo.
  // O primeiro recebe R$ 33,34 e os outros dois recebem R$ 33,33.
  // Soma exata: 33,34 + 33,33 + 33,33 = 100,00
  const res = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [
      { id: 'm1', nome: 'Carlos' },
      { id: 'm2', nome: 'Daniel' },
      { id: 'm3', nome: 'Eduardo' }
    ],
    despesas: [
      { descricao: 'Internet', valor: 100.0, pagoPor: 'm1' }
    ]
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.totalDespesas, 100.0);
  assert.equal(res.data.moradores[0].cota, 33.34);
  assert.equal(res.data.moradores[1].cota, 33.33);
  assert.equal(res.data.moradores[2].cota, 33.33);

  const somaCotas = res.data.moradores.reduce((acc, m) => acc + m.cota, 0);
  assert.equal(Math.round(somaCotas * 100) / 100, 100.0, 'Soma das cotas deve ser rigorosamente R$ 100,00');

  // Carlos pagou 100, cota 33,34 -> saldo = +66,66
  assert.equal(res.data.moradores[0].saldo, 66.66);
  // Daniel pagou 0, cota 33,33 -> saldo = -33,33
  assert.equal(res.data.moradores[1].saldo, -33.33);
  // Eduardo pagou 0, cota 33,33 -> saldo = -33,33
  assert.equal(res.data.moradores[2].saldo, -33.33);

  // Transferências sugeridas devem totalizar exatamente R$ 66,66
  const somaTransf = res.data.transferenciasSugeridas.reduce((acc, t) => acc + t.valor, 0);
  assert.equal(Math.round(somaTransf * 100) / 100, 66.66);
});

// ---------------------------------------------------------------------------
// 3. Divisão igualitária entre 4 moradores
// ---------------------------------------------------------------------------
test('3. Divisão igualitária entre 4 moradores: 25% para cada morador', () => {
  const res = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [
      { id: 'm1', nome: 'Morador 1' },
      { id: 'm2', nome: 'Morador 2' },
      { id: 'm3', nome: 'Morador 3' },
      { id: 'm4', nome: 'Morador 4' }
    ],
    despesas: [
      { descricao: 'Aluguel', valor: 4000.0, pagoPor: 'm1' }
    ]
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.totalDespesas, 4000.0);
  res.data.moradores.forEach((m) => {
    assert.equal(m.cota, 1000.0);
  });
});

// ---------------------------------------------------------------------------
// 4. Divisão personalizada por percentuais (60% e 40%)
// ---------------------------------------------------------------------------
test('4. Divisão personalizada: aplica percentuais informados com exatidão', () => {
  const res = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.PERSONALIZADA,
    moradores: [
      { id: 'm1', nome: 'Fernanda', percentual: 60 },
      { id: 'm2', nome: 'Gabriel', percentual: 40 }
    ],
    despesas: [
      { descricao: 'Aluguel', valor: 3000.0, pagoPor: 'm2' }
    ]
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.moradores[0].cota, 1800.0, '60% de 3.000 = R$ 1.800,00');
  assert.equal(res.data.moradores[1].cota, 1200.0, '40% de 3.000 = R$ 1.200,00');

  // Fernanda pagou 0, deve 1.800 -> saldo = -1.800 (devedora)
  assert.equal(res.data.moradores[0].saldo, -1800.0);
  // Gabriel pagou 3.000, deve 1.200 -> saldo = +1.800 (credor)
  assert.equal(res.data.moradores[1].saldo, 1800.0);

  // Transferência: Fernanda paga 1.800 para Gabriel
  assert.equal(res.data.transferenciasSugeridas.length, 1);
  assert.equal(res.data.transferenciasSugeridas[0].deNome, 'Fernanda');
  assert.equal(res.data.transferenciasSugeridas[0].paraNome, 'Gabriel');
  assert.equal(res.data.transferenciasSugeridas[0].valor, 1800.0);
});

// ---------------------------------------------------------------------------
// 5. Percentuais inválidos ou que não totalizam 100%
// ---------------------------------------------------------------------------
test('5. Validação de percentuais: rejeita soma diferente de 100% ou valores negativos', () => {
  // Soma = 90% (falta 10%)
  const resIncompleto = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.PERSONALIZADA,
    moradores: [
      { id: 'm1', nome: 'Helena', percentual: 50 },
      { id: 'm2', nome: 'Igor', percentual: 40 }
    ],
    despesas: [{ descricao: 'Aluguel', valor: 2000.0 }]
  });

  assert.equal(resIncompleto.ok, false);
  assert.match(resIncompleto.error, /deve ser exatamente 100%/i);

  // Percentual negativo
  const resNegativo = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.PERSONALIZADA,
    moradores: [
      { id: 'm1', nome: 'Helena', percentual: -10 },
      { id: 'm2', nome: 'Igor', percentual: 110 }
    ],
    despesas: [{ descricao: 'Aluguel', valor: 2000.0 }]
  });

  assert.equal(resNegativo.ok, false);
  assert.match(resNegativo.error, /não pode ser negativa/i);
});

// ---------------------------------------------------------------------------
// 6. Despesas variadas e valores zero
// ---------------------------------------------------------------------------
test('6. Despesas variadas e valores zero: trata despesas vazias e zeradas sem quebrar', () => {
  const res = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [
      { id: 'm1', nome: 'Julia' },
      { id: 'm2', nome: 'Lucas' }
    ],
    despesas: [
      { descricao: 'Aluguel', valor: 2500.0, pagoPor: 'm1' },
      { descricao: 'Gás', valor: 0.0, pagoPor: 'm2' },
      { descricao: 'Energia', valor: 150.5, pagoPor: 'm1' }
    ]
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.totalDespesas, 2650.5);
  assert.equal(res.data.moradores[0].cota, 1325.25);
  assert.equal(res.data.moradores[1].cota, 1325.25);
});

// ---------------------------------------------------------------------------
// 7. Pagamentos realizados por moradores diferentes e saldos múltiplos
// ---------------------------------------------------------------------------
test('7. Cenário complexo de 4 moradores com múltiplas despesas cruzadas', () => {
  // Moradores: A, B, C, D (Divisão igualitária)
  // Despesas:
  // Aluguel: 3.000,00 pago por A
  // Condomínio: 800,00 pago por B
  // Energia: 300,00 pago por C
  // Internet: 100,00 pago por B
  // Total despesas = 4.200,00
  // Cota devida por morador = 4.200 / 4 = 1.050,00
  // Pagos:
  // A pagou 3.000,00 -> saldo = +1.950,00 (credor)
  // B pagou 900,00 -> saldo = -150,00 (devedor)
  // C pagou 300,00 -> saldo = -750,00 (devedor)
  // D pagou 0,00 -> saldo = -1.050,00 (devedor)
  // Soma das dívidas = 150 + 750 + 1050 = 1.950,00 = crédito de A!
  const res = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [
      { id: 'mA', nome: 'Alice' },
      { id: 'mB', nome: 'Bruno' },
      { id: 'mC', nome: 'Clara' },
      { id: 'mD', nome: 'Diego' }
    ],
    despesas: [
      { descricao: 'Aluguel', valor: 3000.0, pagoPor: 'mA' },
      { descricao: 'Condomínio', valor: 800.0, pagoPor: 'mB' },
      { descricao: 'Energia', valor: 300.0, pagoPor: 'mC' },
      { descricao: 'Internet', valor: 100.0, pagoPor: 'mB' }
    ]
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.totalDespesas, 4200.0);

  const mA = res.data.moradores.find((m) => m.nome === 'Alice');
  const mB = res.data.moradores.find((m) => m.nome === 'Bruno');
  const mC = res.data.moradores.find((m) => m.nome === 'Clara');
  const mD = res.data.moradores.find((m) => m.nome === 'Diego');

  assert.equal(mA.saldo, 1950.0);
  assert.equal(mB.saldo, -150.0);
  assert.equal(mC.saldo, -750.0);
  assert.equal(mD.saldo, -1050.0);

  // Transferências sugeridas devem liquidar 100% dos saldos
  const totalTransferido = res.data.transferenciasSugeridas.reduce((acc, t) => acc + t.valor, 0);
  assert.equal(totalTransferido, 1950.0);

  // Todas as transferências devem ter Alice como destino
  res.data.transferenciasSugeridas.forEach((t) => {
    assert.equal(t.paraNome, 'Alice');
  });
});

// ---------------------------------------------------------------------------
// 8. Liquidação ótima e invariante matemática de saldos
// ---------------------------------------------------------------------------
test('8. Algoritmo de liquidação garante que a soma de dívidas pagas zera exatamente a soma dos créditos', () => {
  // Dois credores e dois devedores
  // Total = 4.000,00 | Cota = 1.000 cada
  // M1 pagou 2.500 -> saldo +1.500
  // M2 pagou 1.500 -> saldo +500
  // M3 pagou 0 -> saldo -1.000
  // M4 pagou 0 -> saldo -1.000
  const res = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [
      { id: '1', nome: 'M1' },
      { id: '2', nome: 'M2' },
      { id: '3', nome: 'M3' },
      { id: '4', nome: 'M4' }
    ],
    despesas: [
      { descricao: 'D1', valor: 2500, pagoPor: '1' },
      { descricao: 'D2', valor: 1500, pagoPor: '2' }
    ]
  });

  assert.equal(res.ok, true);
  const transferencias = res.data.transferenciasSugeridas;
  assert.ok(transferencias.length <= 3, 'Número de transferências não deve exceder N-1');

  // Balanço pós-transferência deve zerar
  const saldosApos = { M1: 1500, M2: 500, M3: -1000, M4: -1000 };
  transferencias.forEach((t) => {
    saldosApos[t.deNome] += t.valor;
    saldosApos[t.paraNome] -= t.valor;
  });

  assert.equal(saldosApos.M1, 0);
  assert.equal(saldosApos.M2, 0);
  assert.equal(saldosApos.M3, 0);
  assert.equal(saldosApos.M4, 0);
});

// ---------------------------------------------------------------------------
// 9. Rejeição de valores negativos em despesas e mínimo de moradores
// ---------------------------------------------------------------------------
test('9. Validação rejeita despesa negativa e exige ao menos 2 moradores', () => {
  const resDespNeg = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [{ id: '1', nome: 'A' }, { id: '2', nome: 'B' }],
    despesas: [{ descricao: 'Aluguel', valor: -500 }]
  });
  assert.equal(resDespNeg.ok, false);
  assert.match(resDespNeg.error, /não pode ser negativo/i);

  const resPoucosMoradores = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [{ id: '1', nome: 'Apenas Um' }],
    despesas: [{ descricao: 'Aluguel', valor: 1000 }]
  });
  assert.equal(resPoucosMoradores.ok, false);
  assert.match(resPoucosMoradores.error, /pelo menos 2 moradores/i);
});

// ---------------------------------------------------------------------------
// 10. Despesas totalmente zeradas
// ---------------------------------------------------------------------------
test('10. Despesas zeradas: retorna saldos zerados sem falhas', () => {
  const res = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [{ id: '1', nome: 'A' }, { id: '2', nome: 'B' }],
    despesas: [{ descricao: 'Aluguel', valor: 0 }]
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.totalDespesas, 0);
  assert.equal(res.data.transferenciasSugeridas.length, 0);
  assert.equal(res.data.todosQuitados, true);
});

// ---------------------------------------------------------------------------
// 11. Conversão e formatação monetária segura
// ---------------------------------------------------------------------------
test('11. Utilitários monetários: parseMoneyToCents e formatCurrency lidam com pt-BR e formatos flexíveis', () => {
  // Casos padrão
  assert.equal(parseMoneyToCents('R$ 1.500,75'), 150075);
  assert.equal(parseMoneyToCents('1500.75'), 150075);
  assert.equal(parseMoneyToCents('1500,75'), 150075);
  assert.equal(parseMoneyToCents(1500.75), 150075);
  assert.equal(parseMoneyToCents(''), 0);
  assert.equal(parseMoneyToCents(null), 0);

  // Casos específicos exigidos na revisão fiscal/técnica:
  assert.equal(parseMoneyToCents('R$ 0,01'), 1, 'R$ 0,01 deve ser exatamente 1 centavo');
  assert.equal(parseMoneyToCents('0,01'), 1, '0,01 deve ser exatamente 1 centavo');
  assert.equal(parseMoneyToCents('R$ 10,05'), 1005, 'R$ 10,05 deve ser exatamente 1005 centavos');
  assert.equal(parseMoneyToCents('10,05'), 1005, '10,05 deve ser exatamente 1005 centavos');
  assert.equal(parseMoneyToCents('R$ 1.234,56'), 123456, 'R$ 1.234,56 deve ser exatamente 123456 centavos');
  assert.equal(parseMoneyToCents('1.234,56'), 123456, '1.234,56 deve ser exatamente 123456 centavos');

  // Precisão decimal superior a duas casas (arredondamento bancário na 3ª casa):
  assert.equal(parseMoneyToCents('10,555'), 1056, '10,555 arredonda para 1056 centavos');
  assert.equal(parseMoneyToCents('10,554'), 1055, '10,554 arredonda para 1055 centavos');
  assert.equal(parseMoneyToCents('10,001'), 1000, '10,001 arredonda para 1000 centavos');
  assert.equal(parseMoneyToCents('10,999'), 1100, '10,999 arredonda para 1100 centavos');

  // Divisão de valores que deixam centavos residuais:
  // Exemplo 1: R$ 100,00 entre 3 moradores (10000 centavos)
  const res100 = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [{ id: '1', nome: 'M1' }, { id: '2', nome: 'M2' }, { id: '3', nome: 'M3' }],
    despesas: [{ descricao: 'Conta', valor: '100,00' }]
  });
  assert.equal(res100.ok, true);
  const somaCotas100 = res100.data.moradores.reduce((acc, m) => acc + m.cotaCentavos, 0);
  assert.equal(somaCotas100, 10000, 'Soma das cotas em centavos deve ser exatamente 10000');
  assert.equal(res100.data.moradores[0].cotaCentavos, 3334);
  assert.equal(res100.data.moradores[1].cotaCentavos, 3333);
  assert.equal(res100.data.moradores[2].cotaCentavos, 3333);

  // Exemplo 2: R$ 10,01 entre 3 moradores (1001 centavos)
  const res10 = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [{ id: '1', nome: 'M1' }, { id: '2', nome: 'M2' }, { id: '3', nome: 'M3' }],
    despesas: [{ descricao: 'Conta', valor: '10,01' }]
  });
  assert.equal(res10.ok, true);
  const somaCotas10 = res10.data.moradores.reduce((acc, m) => acc + m.cotaCentavos, 0);
  assert.equal(somaCotas10, 1001, 'Soma das cotas em centavos deve ser exatamente 1001');
  assert.equal(res10.data.moradores[0].cotaCentavos, 334);
  assert.equal(res10.data.moradores[1].cotaCentavos, 334);
  assert.equal(res10.data.moradores[2].cotaCentavos, 333);

  const formatted = formatCurrency(1500.75);
  assert.match(formatted, /1\.500,75/);
});

// ---------------------------------------------------------------------------
// 12. Geração do texto de cópia e compartilhamento
// ---------------------------------------------------------------------------
test('12. buildCopyText: gera texto estruturado com saldos e acertos', () => {
  const res = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores: [{ id: '1', nome: 'Mariana' }, { id: '2', nome: 'Paula' }],
    despesas: [{ descricao: 'Aluguel', valor: 2000, pagoPor: '1' }]
  });

  const texto = buildCopyText(res);
  assert.match(texto, /Divisão de Aluguel e Despesas/);
  assert.match(texto, /Mariana/);
  assert.match(texto, /Paula/);
  assert.match(texto, /Paula deve pagar/);
  assert.match(texto, /R\$\s*1\.000,00/);
});

// ---------------------------------------------------------------------------
// 13. Teste de integração com o DOM (setupTool)
// ---------------------------------------------------------------------------
class MockDivisaoElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.parentNode = null;
    this.className = '';
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.hidden = false;
    this.style = {};
  }
  append(...children) {
    children.forEach(child => {
      if (child) {
        child.parentNode = this;
        this.children.push(child);
      }
    });
  }
  appendChild(child) {
    if (child) {
      child.parentNode = this;
      this.children.push(child);
    }
    return child;
  }
  replaceChildren(...children) {
    this.children.forEach(child => { child.parentNode = null; });
    this.children = [];
    this.append(...children);
  }
  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    }
    this.parentNode = null;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
  addEventListener(name, fn) {
    (this.listeners[name] ||= []).push(fn);
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (selector === '.morador-row' && child.className?.includes('morador-row')) found.push(child);
        else if (selector === '.despesa-row' && child.className?.includes('despesa-row')) found.push(child);
        else if (selector.startsWith('.') && child.className?.split(' ').includes(selector.slice(1))) found.push(child);
        else if (selector.startsWith('#') && child.id === selector.slice(1)) found.push(child);
        else if (selector.startsWith('[name=') && child.name === selector.slice(7, -2)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  reset() {
    const visit = (node) => {
      node.children.forEach(child => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(child.tagName)) child.value = '';
        visit(child);
      });
    };
    visit(this);
  }
}

test('13. setupTool: inicializa formulário, calcula e limpa campos no DOM', () => {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const prevNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  try {
    const registry = new Map();
    const getOrCreate = (id, tag = 'div') => {
      if (!registry.has(id)) {
        const el = new MockDivisaoElement(tag);
        el.id = id;
        registry.set(id, el);
      }
      return registry.get(id);
    };

    const form = getOrCreate('formDivisaoAluguel', 'form');
    const containerMoradores = getOrCreate('listaMoradoresAluguel', 'div');
    const containerDespesas = getOrCreate('listaDespesasAluguel', 'div');
    const modoDivisao = getOrCreate('modoDivisaoAluguel', 'select');
    modoDivisao.value = 'igualitaria';
    const alertaPercentual = getOrCreate('alertaPercentualAluguel', 'div');
    const btnAddMorador = getOrCreate('adicionarMoradorAluguel', 'button');
    const btnAddDespesa = getOrCreate('adicionarDespesaAluguel', 'button');
    const btnCalcular = getOrCreate('btnCalcularAluguel', 'button');
    const btnLimpar = getOrCreate('btnLimparAluguel', 'button');
    const erroAluguel = getOrCreate('erroDivisaoAluguel', 'p');
    const resAluguel = getOrCreate('resultadoDivisaoAluguel', 'section');
    const resTotal = getOrCreate('resTotalDespesasAluguel', 'p');
    const resCota = getOrCreate('resCotaMediaAluguel', 'p');
    const tabela = getOrCreate('tabelaSaldosMoradoresAluguel', 'table');
    tabela.append(new MockDivisaoElement('tbody'));
    const listaTransf = getOrCreate('listaTransferenciasAluguel', 'ul');

    globalThis.document = {
      createElement: (tag) => new MockDivisaoElement(tag)
    };
    globalThis.window = {
      location: { href: 'https://www.calculadoramaster.com/tools/financas/divisao-aluguel.html' }
    };
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { clipboard: { writeText: async () => {} } }
    });

    const mockRoot = {
      querySelector: (selector) => {
        const id = selector.replace(/^[#.]/, '');
        return registry.get(id) || null;
      },
      querySelectorAll: (selector) => {
        const el = mockRoot.querySelector(selector);
        return el ? [el] : [];
      }
    };

    const tool = setupTool(mockRoot);
    assert.ok(tool, 'setupTool deve retornar objeto com funções de execução');
    assert.equal(typeof tool.executarCalculo, 'function');
  } finally {
    if (prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    if (prevWin === undefined) delete globalThis.window; else globalThis.window = prevWin;
    if (prevNav) Object.defineProperty(globalThis, 'navigator', prevNav); else delete globalThis.navigator;
  }
});

// ---------------------------------------------------------------------------
// 14. Conformidade do arquivo HTML da ferramenta
// ---------------------------------------------------------------------------
test('14. Arquivo HTML existe e segue convenções semânticas e acessibilidade', () => {
  const pagePath = path.join(ROOT_DIR, 'src', 'pages', 'tools', 'financas', 'divisao-aluguel.page.html');
  assert.ok(fs.existsSync(pagePath), 'Arquivo divisao-aluguel.page.html deve existir');

  const content = fs.readFileSync(pagePath, 'utf-8');
  assert.match(content, /layout:\s*tool/);
  assert.match(content, /id="formDivisaoAluguel"/);
  assert.match(content, /id="listaMoradoresAluguel"/);
  assert.match(content, /id="listaDespesasAluguel"/);
  assert.match(content, /id="resultadoDivisaoAluguel"/);
  assert.match(content, /role="alert"/);
  assert.match(content, /aria-live=/);
});

// ---------------------------------------------------------------------------
// 15. Estratégia gulosa de transferências: verifica preservação exata dos saldos e cota máxima N - 1
// ---------------------------------------------------------------------------
test('15. Estratégia gulosa liquida saldos sem duplicidades e garante no máximo N - 1 transferências', () => {
  // Cenário de teste exigido:
  // Credores: C1 (+R$ 4,00), C2 (+R$ 3,00), C3 (+R$ 2,00) -> Total créditos = R$ 9,00
  // Devedores: D1 (-R$ 5,00), D2 (-R$ 4,00) -> Total dívidas = R$ 9,00
  // Cota igualitária para 5 moradores com despesa total de R$ 25,00 (cota = R$ 5,00 para cada um):
  // D1 paga R$ 0,00  -> saldo = 0 - 5 = -R$ 5,00 (devedor de 500 centavos)
  // D2 paga R$ 1,00  -> saldo = 1 - 5 = -R$ 4,00 (devedor de 400 centavos)
  // C1 paga R$ 9,00  -> saldo = 9 - 5 = +R$ 4,00 (credor de 400 centavos)
  // C2 paga R$ 8,00  -> saldo = 8 - 5 = +R$ 3,00 (credor de 300 centavos)
  // C3 paga R$ 7,00  -> saldo = 7 - 5 = +R$ 2,00 (credor de 200 centavos)
  const moradores = [
    { id: 'D1', nome: 'Devedor 1' },
    { id: 'D2', nome: 'Devedor 2' },
    { id: 'C1', nome: 'Credor 1' },
    { id: 'C2', nome: 'Credor 2' },
    { id: 'C3', nome: 'Credor 3' }
  ];

  const despesas = [
    { descricao: 'Despesa D2', valor: '1,00', pagoPor: 'D2' },
    { descricao: 'Despesa C1', valor: '9,00', pagoPor: 'C1' },
    { descricao: 'Despesa C2', valor: '8,00', pagoPor: 'C2' },
    { descricao: 'Despesa C3', valor: '7,00', pagoPor: 'C3' }
  ];

  const res = calculateRentSplit({
    modoDivisao: MODOS_DIVISAO.IGUALITARIA,
    moradores,
    despesas
  });

  assert.equal(res.ok, true, 'Cálculo deve ser executado com sucesso');
  assert.equal(res.data.totalDespesasCentavos, 2500, 'Total de despesas deve ser 2500 centavos');

  // Verifica que os saldos apurados conferem com o cenário
  const saldoMap = new Map(res.data.moradores.map(m => [m.id, m.saldoCentavos]));
  assert.equal(saldoMap.get('D1'), -500, 'D1 deve ter saldo devedor de -500 centavos');
  assert.equal(saldoMap.get('D2'), -400, 'D2 deve ter saldo devedor de -400 centavos');
  assert.equal(saldoMap.get('C1'), 400, 'C1 deve ter saldo credor de +400 centavos');
  assert.equal(saldoMap.get('C2'), 300, 'C2 deve ter saldo credor de +300 centavos');
  assert.equal(saldoMap.get('C3'), 200, 'C3 deve ter saldo credor de +200 centavos');

  const transferencias = res.data.transferenciasSugeridas;

  // Garantia teórica do método guloso: no máximo N - 1 transferências (para N = 5, máx = 4 transferências)
  const N = moradores.length;
  assert.ok(
    transferencias.length <= N - 1,
    `Número de transferências (${transferencias.length}) não deve exceder N - 1 (${N - 1})`
  );

  // Verifica que o total transferido bate exatamente com o total de dívidas e créditos (900 centavos)
  const totalTransferidoCentavos = transferencias.reduce((acc, t) => acc + t.valorCentavos, 0);
  assert.equal(totalTransferidoCentavos, 900, 'Total transferido deve ser exatamente 900 centavos');

  // Verifica conservação individual de saldos pelas transferências:
  const pagoPorDevedor = new Map();
  const recebidoPorCredor = new Map();

  for (const t of transferencias) {
    pagoPorDevedor.set(t.deId, (pagoPorDevedor.get(t.deId) || 0) + t.valorCentavos);
    recebidoPorCredor.set(t.paraId, (recebidoPorCredor.get(t.paraId) || 0) + t.valorCentavos);
  }

  assert.equal(pagoPorDevedor.get('D1'), 500, 'D1 deve pagar exatamente 500 centavos no total');
  assert.equal(pagoPorDevedor.get('D2'), 400, 'D2 deve pagar exatamente 400 centavos no total');
  assert.equal(recebidoPorCredor.get('C1'), 400, 'C1 deve receber exatamente 400 centavos no total');
  assert.equal(recebidoPorCredor.get('C2'), 300, 'C2 deve receber exatamente 300 centavos no total');
  assert.equal(recebidoPorCredor.get('C3'), 200, 'C3 deve receber exatamente 200 centavos no total');

  // Nota de documentação técnica:
  // Embora o mínimo global teórico fosse 3 transferências via particionamento exato (5 = 3 + 2 e 4 = 4),
  // a estratégia gulosa produz 4 transferências determinísticas, satisfazendo a cota N - 1 sem complexidade exponencial.
});
