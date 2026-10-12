import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseValorMonetario,
  normalizeInput,
  validateInput,
  calculate,
  formatResult
} from '../js/tools/valor-hora.js';

test('interpreta valores monetários brasileiros e decimais', () => {
  assert.equal(parseValorMonetario('3000'), 3000);
  assert.equal(parseValorMonetario('3.000'), 3000);
  assert.equal(parseValorMonetario('3.000,50'), 3000.5);
  assert.equal(parseValorMonetario('3000.50'), 3000.5);
});

test('normaliza valores monetários no padrão brasileiro', () => {
  assert.deepEqual(
    normalizeInput({
      rendaDesejada: '3.000,00',
      despesasMensais: '1.000,00',
      reservaPercentual: '20',
      horasFaturaveis: '100'
    }),
    {
      rendaDesejada: 3000,
      despesasMensais: 1000,
      reservaPercentual: 20,
      horasFaturaveis: 100
    }
  );
});

test('considera despesas vazias como zero e rejeita renda vazia', () => {
  const resultado = normalizeInput({
    rendaDesejada: '',
    despesasMensais: '',
    reservaPercentual: '20',
    horasFaturaveis: '100'
  });

  assert.equal(Number.isNaN(resultado.rendaDesejada), true);
  assert.equal(resultado.despesasMensais, 0);
});

test('valida renda, despesas, reserva e horas faturáveis', () => {
  assert.equal(validateInput({
    rendaDesejada: -1,
    despesasMensais: 0,
    reservaPercentual: 20,
    horasFaturaveis: 100
  }).valido, false);

  assert.equal(validateInput({
    rendaDesejada: 3000,
    despesasMensais: -1,
    reservaPercentual: 20,
    horasFaturaveis: 100
  }).valido, false);

  assert.equal(validateInput({
    rendaDesejada: 3000,
    despesasMensais: 1000,
    reservaPercentual: 100,
    horasFaturaveis: 100
  }).valido, false);

  assert.equal(validateInput({
    rendaDesejada: 3000,
    despesasMensais: 1000,
    reservaPercentual: 20,
    horasFaturaveis: 0
  }).valido, false);
});

test('calcula R$ 50 por hora com reserva de 20%', () => {
  const resultado = calculate({
    rendaDesejada: '3.000,00',
    despesasMensais: '1.000,00',
    reservaPercentual: '20',
    horasFaturaveis: '100'
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.totalMensalNecessario, 4000);
  assert.equal(resultado.receitaMensalNecessaria, 5000);
  assert.equal(resultado.reservaMensal, 1000);
  assert.equal(resultado.valorHora, 50);
});

test('calcula corretamente quando não há reserva percentual', () => {
  const resultado = calculate({
    rendaDesejada: 3000,
    despesasMensais: 1000,
    reservaPercentual: 0,
    horasFaturaveis: 100
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.receitaMensalNecessaria, 4000);
  assert.equal(resultado.valorHora, 40);
});

test('rejeita dados inválidos e valores mensais totalmente zerados', () => {
  assert.equal(calculate({
    rendaDesejada: 'inválido',
    despesasMensais: 100,
    reservaPercentual: 20,
    horasFaturaveis: 100
  }).valido, false);

  const zerado = calculate({
    rendaDesejada: 0,
    despesasMensais: 0,
    reservaPercentual: 20,
    horasFaturaveis: 100
  });

  assert.equal(zerado.valido, false);
});

test('formata o resumo do cálculo e mensagens de erro', () => {
  const resultado = calculate({
    rendaDesejada: 3000,
    despesasMensais: 1000,
    reservaPercentual: 20,
    horasFaturaveis: 100
  });

  assert.match(formatResult(resultado), /50,00/);
  assert.match(formatResult(resultado), /5\.000,00/);
  assert.match(
    formatResult({ valido: false, erro: 'Entrada inválida' }),
    /Entrada inválida/
  );
});
