/**
 * Calculadora de Divisão de Aluguel e Despesas - Calculadora Master
 *
 * Módulo puro e desacoplado para conferência, rateio e liquidação de despesas
 * compartilhadas entre moradores/repúblicas/casais.
 *
 * Suporta:
 * - Divisão igualitária ou proporções personalizadas (%) com validação estrita de 100%;
 * - Cadastro dinâmico de moradores e de despesas (aluguel, condomínio, luz, água, gás, internet, etc.);
 * - Identificação de quem pagou cada despesa;
 * - Operações estritamente em centavos inteiros com distribuição determinística de restos;
 * - Apuração de saldos credores, devedores e quitados para cada morador;
 * - Estratégia gulosa determinística de liquidação de saldos ("quem deve pagar a quem") limitada a no máximo N - 1 transferências;
 * - Geração de memória de cálculo detalhada e texto estruturado de compartilhamento.
 */

import { createResultActions } from '../core/result-actions.js';

export const MODOS_DIVISAO = Object.freeze({
  IGUALITARIA: 'igualitaria',
  PERSONALIZADA: 'personalizada'
});

export const DESPESAS_PADRAO = Object.freeze([
  { id: 'aluguel', descricao: 'Aluguel mensal', valor: 0 },
  { id: 'condominio', descricao: 'Condomínio', valor: 0 },
  { id: 'energia', descricao: 'Energia elétrica', valor: 0 },
  { id: 'agua', descricao: 'Água e esgoto', valor: 0 },
  { id: 'gas', descricao: 'Gás', valor: 0 },
  { id: 'internet', descricao: 'Internet / Wi-Fi', valor: 0 }
]);

/* ==========================================================================
 * Funções Utilitárias de Conversão Monetária e Precisão
 * ========================================================================== */

/**
 * Converte qualquer entrada monetária flexível (R$ 1.500,00 ou 1500.00) diretamente em centavos inteiros
 * por meio de análise textual exata, sem depender de operações de ponto flutuante para determinação dos centavos.
 *
 * Suporta:
 * - Formato brasileiro com vírgula decimal e pontos de milhar: "R$ 1.234,56", "1.234,56", "1234,56"
 * - Formato com ponto decimal: "1234.56", "1500.75"
 * - Formato apenas inteiro: "1500"
 * - Precisão superior a duas casas: arredonda a 3ª casa decimal diretamente em inteiros (ex: "10,555" -> 1056 centavos)
 *
 * @param {string|number} raw
 * @returns {number} Centavos inteiros ou NaN se for inválido
 */
export function parseMoneyToCents(raw) {
  if (raw === null || raw === undefined) return 0;

  // Se já for número, processa via representação textual para evitar artefatos de ponto flutuante
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return NaN;
    if (Number.isInteger(raw)) return raw * 100;
    raw = raw.toString();
  }

  if (typeof raw !== 'string') return 0;

  let cleaned = raw.trim();
  if (!cleaned) return 0;

  // Remove símbolo da moeda
  cleaned = cleaned.replace(/^R\$\s*/i, '').trim();
  if (!cleaned) return 0;

  // Trata sinal negativo
  let isNegative = false;
  if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1).trim();
  } else if (cleaned.endsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(0, -1).trim();
  }

  if (!cleaned) return 0;

  let intPart = '';
  let decPart = '';

  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Padrão brasileiro: 1.234.567,89
      intPart = cleaned.slice(0, lastComma).replace(/\./g, '');
      decPart = cleaned.slice(lastComma + 1);
    } else {
      // Padrão internacional: 1,234,567.89
      intPart = cleaned.slice(0, lastDot).replace(/,/g, '');
      decPart = cleaned.slice(lastDot + 1);
    }
  } else if (cleaned.includes(',')) {
    // Apenas vírgula: 1234,56
    const parts = cleaned.split(',');
    intPart = parts[0];
    decPart = parts.slice(1).join('');
  } else if (cleaned.includes('.')) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      intPart = cleaned.replace(/\./g, '');
      decPart = '';
    } else {
      const parts = cleaned.split('.');
      intPart = parts[0];
      decPart = parts[1];
    }
  } else {
    intPart = cleaned;
    decPart = '';
  }

  intPart = intPart.replace(/\s+/g, '');
  decPart = decPart.replace(/\s+/g, '');

  if (intPart === '') intPart = '0';

  // Validação estrita de dígitos
  if (!/^\d+$/.test(intPart) || (decPart !== '' && !/^\d+$/.test(decPart))) {
    return NaN;
  }

  // Determinação de centavos inteiros sem ponto flutuante
  let cents = 0;
  if (decPart.length === 0) {
    cents = 0;
  } else if (decPart.length === 1) {
    cents = parseInt(decPart, 10) * 10;
  } else if (decPart.length === 2) {
    cents = parseInt(decPart, 10);
  } else {
    // Precisão decimal superior a duas casas: arredonda na 3ª casa (>= 5 soma 1 centavo)
    const baseCents = parseInt(decPart.slice(0, 2), 10);
    const thirdDigit = parseInt(decPart[2], 10);
    cents = baseCents + (thirdDigit >= 5 ? 1 : 0);
  }

  const intCents = parseInt(intPart, 10) * 100;
  const totalCents = intCents + cents;

  return isNegative ? -totalCents : totalCents;
}

/**
 * Converte texto de percentual ("50", "33,33%", 50) em número float de 0 a 100.
 *
 * @param {string|number} raw
 * @returns {number}
 */
export function parsePercent(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : NaN;
  }
  if (!raw || typeof raw !== 'string') return 0;

  const cleaned = raw.trim().replace('%', '').replace(',', '.').trim();
  if (!cleaned) return 0;

  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Formata um valor numérico em reais (pt-BR).
 *
 * @param {number} val
 * @returns {string} Ex: "R$ 1.250,50"
 */
export function formatCurrency(val) {
  const num = typeof val === 'number' && Number.isFinite(val) ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata percentual em pt-BR.
 *
 * @param {number} val
 * @param {number} [places=2]
 * @returns {string} Ex: "50%" ou "33,33%"
 */
export function formatPercent(val, places = 2) {
  const num = typeof val === 'number' && Number.isFinite(val) ? val : 0;
  return `${num.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : places,
    maximumFractionDigits: places
  })}%`;
}

/* ==========================================================================
 * Motor de Cálculo Puro (Rent and Shared Expenses Split Engine)
 * ========================================================================== */

/**
 * Calcula o rateio de despesas, saldos individuais e sugestão de liquidações.
 *
 * @param {object} input
 * @param {string} [input.modoDivisao='igualitaria'] 'igualitaria' | 'personalizada'
 * @param {Array<{id: string, nome: string, percentual?: number|string}>} input.moradores
 * @param {Array<{id?: string, descricao: string, valor: number|string, pagoPor?: string}>} input.despesas
 * @returns {object} Resultado estruturado ou erro de validação
 */
export function calculateRentSplit(input = {}) {
  const warnings = [];
  const memoriaCalculo = [];

  const modo = input.modoDivisao === MODOS_DIVISAO.PERSONALIZADA
    ? MODOS_DIVISAO.PERSONALIZADA
    : MODOS_DIVISAO.IGUALITARIA;

  // 1. Validação dos Moradores
  const rawMoradores = Array.isArray(input.moradores) ? input.moradores : [];
  if (rawMoradores.length < 2) {
    return {
      ok: false,
      error: 'É necessário cadastrar pelo menos 2 moradores para realizar a divisão das despesas.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  if (rawMoradores.length > 20) {
    return {
      ok: false,
      error: 'O número máximo permitido é de 20 moradores por simulação.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // Normalização dos Moradores
  const moradores = rawMoradores.map((m, index) => {
    const id = m.id && String(m.id).trim() ? String(m.id).trim() : `m_${index + 1}`;
    const rawNome = m.nome && String(m.nome).trim() ? String(m.nome).trim() : `Morador ${index + 1}`;
    const percentual = parsePercent(m.percentual);
    return {
      id,
      nome: rawNome,
      percentual: Number.isFinite(percentual) ? percentual : 0
    };
  });

  const numMoradores = moradores.length;

  // Validação de Percentuais no modo personalizado
  if (modo === MODOS_DIVISAO.PERSONALIZADA) {
    for (const m of moradores) {
      if (m.percentual < 0) {
        return {
          ok: false,
          error: `A porcentagem do morador "${m.nome}" não pode ser negativa (${m.percentual}%).`,
          data: null,
          warnings: [],
          memoriaCalculo: []
        };
      }
    }

    const somaPercentuais = moradores.reduce((acc, m) => acc + m.percentual, 0);
    // Tolerância de 0,05% para arredondamentos típicos de dízimas (ex: 33.33 + 33.33 + 33.34 = 100)
    if (Math.abs(somaPercentuais - 100) > 0.05) {
      return {
        ok: false,
        error: `A soma das porcentagens personalizadas deve ser exatamente 100%. Atualmente a soma é de ${formatPercent(somaPercentuais, 2)}. Ajuste as porcentagens para continuar.`,
        data: null,
        warnings: [
          `Soma atual das porcentagens: ${formatPercent(somaPercentuais, 2)} (diferença de ${formatPercent(Math.abs(100 - somaPercentuais), 2)}).`
        ],
        memoriaCalculo: []
      };
    }
  }

  // 2. Validação e Processamento das Despesas
  const rawDespesas = Array.isArray(input.despesas) ? input.despesas : [];
  const despesasProcessadas = [];
  let totalDespesasCentavos = 0;
  let totalPagoCentavosGeral = 0;

  for (let i = 0; i < rawDespesas.length; i++) {
    const d = rawDespesas[i];
    const desc = d.descricao && String(d.descricao).trim() ? String(d.descricao).trim() : `Despesa ${i + 1}`;
    const valorCentavos = parseMoneyToCents(d.valor);

    if (isNaN(valorCentavos)) {
      return {
        ok: false,
        error: `O valor informado para "${desc}" é inválido. Digite um valor numérico válido em reais.`,
        data: null,
        warnings: [],
        memoriaCalculo: []
      };
    }

    if (valorCentavos < 0) {
      return {
        ok: false,
        error: `O valor da despesa "${desc}" não pode ser negativo.`,
        data: null,
        warnings: [],
        memoriaCalculo: []
      };
    }

    // Identificação do morador pagador
    const pagoPor = d.pagoPor ? String(d.pagoPor).trim() : '';
    const moradorPagador = moradores.find((m) => m.id === pagoPor || m.nome === pagoPor);
    const pagadorValidoId = moradorPagador ? moradorPagador.id : null;
    const pagadorValidoNome = moradorPagador ? moradorPagador.nome : 'Ainda não pago';

    if (valorCentavos > 0) {
      totalDespesasCentavos += valorCentavos;
      if (pagadorValidoId) {
        totalPagoCentavosGeral += valorCentavos;
      }
    }

    despesasProcessadas.push({
      id: d.id || `desp_${i + 1}`,
      descricao: desc,
      valorCentavos,
      valor: valorCentavos / 100,
      valorFormatado: formatCurrency(valorCentavos / 100),
      pagoPorId: pagadorValidoId,
      pagoPorNome: pagadorValidoNome,
      foiPago: Boolean(pagadorValidoId)
    });
  }

  const totalDespesas = totalDespesasCentavos / 100;
  const totalPagoGeral = totalPagoCentavosGeral / 100;
  const totalPendenteGeral = Math.max(0, (totalDespesasCentavos - totalPagoCentavosGeral) / 100);

  // Registro na memória de cálculo inicial
  memoriaCalculo.push(`Modo de divisão selecionado: ${modo === MODOS_DIVISAO.IGUALITARIA ? 'Divisão Igualitária' : 'Divisão Proporcional Personalizada'}.`);
  memoriaCalculo.push(`Quantidade de moradores cadastrados: ${numMoradores}.`);
  memoriaCalculo.push(`Total de despesas compartilhadas cadastradas: ${formatCurrency(totalDespesas)} (${totalDespesasCentavos} centavos).`);
  memoriaCalculo.push(`Total pago antecipadamente pelos moradores: ${formatCurrency(totalPagoGeral)}.`);
  if (totalPendenteGeral > 0) {
    memoriaCalculo.push(`Despesas em aberto (sem indicação de pagador individual): ${formatCurrency(totalPendenteGeral)}.`);
    warnings.push(`Existem ${formatCurrency(totalPendenteGeral)} em despesas compartilhadas sem indicação de qual morador realizou o pagamento. Esse valor foi rateado, mas não constará como adiantamento de nenhum morador.`);
  }

  // 3. Rateio da Cota Devida (em centavos com distribuição determinística de restos)
  const cotasCentavos = new Array(numMoradores).fill(0);

  if (totalDespesasCentavos > 0) {
    if (modo === MODOS_DIVISAO.IGUALITARIA) {
      const basePorMorador = Math.floor(totalDespesasCentavos / numMoradores);
      const restoCentavos = totalDespesasCentavos % numMoradores;

      for (let i = 0; i < numMoradores; i++) {
        // Distribui 1 centavo residual aos primeiros moradores de forma determinística
        cotasCentavos[i] = basePorMorador + (i < restoCentavos ? 1 : 0);
      }
    } else {
      // Modo Proporcional Personalizado (Método dos Maiores Restos / Hare-Niemeyer)
      let somaPisos = 0;
      const fracoes = [];

      for (let i = 0; i < numMoradores; i++) {
        const proporcao = moradores[i].percentual / 100;
        const exato = totalDespesasCentavos * proporcao;
        const piso = Math.floor(exato);
        cotasCentavos[i] = piso;
        somaPisos += piso;
        fracoes.push({ index: i, fracao: exato - piso });
      }

      let sobra = totalDespesasCentavos - somaPisos;
      // Ordena por maior fração para distribuir os centavos restantes
      fracoes.sort((a, b) => b.fracao - a.fracao);
      for (let i = 0; i < sobra; i++) {
        cotasCentavos[fracoes[i].index] += 1;
      }
    }
  }

  // 4. Apuração dos Pagamentos Efetivos por Morador
  const pagamentosPorMoradorCentavos = new Array(numMoradores).fill(0);
  for (const desp of despesasProcessadas) {
    if (desp.pagoPorId && desp.valorCentavos > 0) {
      const idx = moradores.findIndex((m) => m.id === desp.pagoPorId);
      if (idx !== -1) {
        pagamentosPorMoradorCentavos[idx] += desp.valorCentavos;
      }
    }
  }

  // 5. Apuração dos Saldos e Situações
  const moradoresResultados = [];
  let somaCotasCentavos = 0;

  for (let i = 0; i < numMoradores; i++) {
    const cotaCentavos = cotasCentavos[i];
    somaCotasCentavos += cotaCentavos;
    const pagoCentavos = pagamentosPorMoradorCentavos[i];
    const saldoCentavos = pagoCentavos - cotaCentavos;

    let situacao = 'quitado';
    let situacaoTexto = 'Quitado';

    if (saldoCentavos > 0) {
      situacao = 'credor';
      situacaoTexto = `A receber ${formatCurrency(saldoCentavos / 100)}`;
    } else if (saldoCentavos < 0) {
      situacao = 'devedor';
      situacaoTexto = `A pagar ${formatCurrency(Math.abs(saldoCentavos) / 100)}`;
    }

    const percentualEfetivo = totalDespesasCentavos > 0
      ? (cotaCentavos / totalDespesasCentavos) * 100
      : (modo === MODOS_DIVISAO.IGUALITARIA ? 100 / numMoradores : moradores[i].percentual);

    moradoresResultados.push({
      id: moradores[i].id,
      nome: moradores[i].nome,
      percentualDefinido: moradores[i].percentual,
      percentualEfetivo: Math.round((percentualEfetivo + Number.EPSILON) * 100) / 100,
      percentualFormatado: formatPercent(percentualEfetivo, 2),
      cotaCentavos,
      cota: cotaCentavos / 100,
      cotaFormatada: formatCurrency(cotaCentavos / 100),
      totalPagoCentavos: pagoCentavos,
      totalPago: pagoCentavos / 100,
      totalPagoFormatado: formatCurrency(pagoCentavos / 100),
      saldoCentavos,
      saldo: saldoCentavos / 100,
      saldoFormatado: formatCurrency(saldoCentavos / 100),
      saldoAbsolutoFormatado: formatCurrency(Math.abs(saldoCentavos) / 100),
      situacao,
      situacaoTexto
    });

    memoriaCalculo.push(
      `• ${moradores[i].nome}: Cota devida = ${formatCurrency(cotaCentavos / 100)} (${formatPercent(percentualEfetivo, 2)}) | Já pago = ${formatCurrency(pagoCentavos / 100)} | Saldo = ${formatCurrency(saldoCentavos / 100)} (${situacaoTexto}).`
    );
  }

  // Garantia matemática de invariante de soma
  if (somaCotasCentavos !== totalDespesasCentavos) {
    // Ajuste de segurança em centavos residuais caso ocorra divergência
    const diff = totalDespesasCentavos - somaCotasCentavos;
    moradoresResultados[0].cotaCentavos += diff;
    moradoresResultados[0].cota = moradoresResultados[0].cotaCentavos / 100;
    moradoresResultados[0].cotaFormatada = formatCurrency(moradoresResultados[0].cota);
    moradoresResultados[0].saldoCentavos -= diff;
    moradoresResultados[0].saldo = moradoresResultados[0].saldoCentavos / 100;
    moradoresResultados[0].saldoFormatado = formatCurrency(moradoresResultados[0].saldo);
  }

  // 6. Algoritmo Guloso de Liquidação de Saldos (Sugestão de Transferências)
  // Monta filas de devedores e credores com valores estritamente positivos em centavos
  const devedoresFila = moradoresResultados
    .filter((m) => m.saldoCentavos < 0)
    .map((m) => ({ id: m.id, nome: m.nome, dividaRestanteCentavos: -m.saldoCentavos }));

  const credoresFila = moradoresResultados
    .filter((m) => m.saldoCentavos > 0)
    .map((m) => ({ id: m.id, nome: m.nome, creditoRestanteCentavos: m.saldoCentavos }));

  // Ordena por maior saldo para minimizar o número total de transferências
  devedoresFila.sort((a, b) => b.dividaRestanteCentavos - a.dividaRestanteCentavos);
  credoresFila.sort((a, b) => b.creditoRestanteCentavos - a.creditoRestanteCentavos);

  const transferenciasSugeridas = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < devedoresFila.length && cIdx < credoresFila.length) {
    const dev = devedoresFila[dIdx];
    const cred = credoresFila[cIdx];

    const quantiaCentavos = Math.min(dev.dividaRestanteCentavos, cred.creditoRestanteCentavos);

    if (quantiaCentavos > 0) {
      const valor = quantiaCentavos / 100;
      const valorFormatado = formatCurrency(valor);
      const texto = `${dev.nome} deve pagar ${valorFormatado} para ${cred.nome}`;

      transferenciasSugeridas.push({
        deId: dev.id,
        deNome: dev.nome,
        paraId: cred.id,
        paraNome: cred.nome,
        valorCentavos: quantiaCentavos,
        valor,
        valorFormatado,
        texto
      });

      dev.dividaRestanteCentavos -= quantiaCentavos;
      cred.creditoRestanteCentavos -= quantiaCentavos;
    }

    if (dev.dividaRestanteCentavos === 0) dIdx++;
    if (cred.creditoRestanteCentavos === 0) cIdx++;
  }

  if (transferenciasSugeridas.length > 0) {
    memoriaCalculo.push('Sugestão de acertos diretos entre moradores para liquidar as despesas:');
    transferenciasSugeridas.forEach((t) => {
      memoriaCalculo.push(`➔ ${t.texto}.`);
    });
  } else if (totalDespesasCentavos > 0 && totalPendenteGeral === 0) {
    memoriaCalculo.push('Todos os moradores gastaram exatamente o equivalente às suas cotas devidas. Nenhuma transferência necessária!');
  }

  const todosQuitados = transferenciasSugeridas.length === 0;

  return {
    ok: true,
    error: null,
    data: {
      modoDivisao: modo,
      nomeModoDivisao: modo === MODOS_DIVISAO.IGUALITARIA ? 'Divisão Igualitária' : 'Divisão Proporcional Personalizada',
      numMoradores,
      totalDespesasCentavos,
      totalDespesas,
      totalDespesasFormatado: formatCurrency(totalDespesas),
      totalPagoGeral,
      totalPagoGeralFormatado: formatCurrency(totalPagoGeral),
      totalPendenteGeral,
      totalPendenteGeralFormatado: formatCurrency(totalPendenteGeral),
      moradores: moradoresResultados,
      despesas: despesasProcessadas,
      transferenciasSugeridas,
      todosQuitados
    },
    warnings,
    memoriaCalculo
  };
}

/* ==========================================================================
 * Funções de Formatação e Geração de Texto de Cópia / Compartilhamento
 * ========================================================================== */

/**
 * Prepara o resumo visual e textual para a interface.
 *
 * @param {object} data
 * @returns {object}
 */
export function formatResult(data) {
  if (!data) return {};

  const {
    totalDespesas,
    totalPagoGeral,
    totalPendenteGeral,
    moradores,
    despesas,
    transferenciasSugeridas,
    todosQuitados,
    nomeModoDivisao
  } = data;

  const totalMoradores = moradores ? moradores.length : 0;
  const totalDespesasQtd = despesas ? despesas.length : 0;
  const cotaMedia = totalMoradores > 0 ? totalDespesas / totalMoradores : 0;
  let resumoAcertos = '';

  if (totalDespesas === 0) {
    resumoAcertos = 'Nenhuma despesa cadastrada no momento.';
  } else if (todosQuitados) {
    resumoAcertos = 'Tudo quitado! Cada morador pagou exatamente a sua parte devida.';
  } else {
    resumoAcertos = `${transferenciasSugeridas.length} transferência(s) sugerida(s) para equilibrar as contas entre os moradores.`;
  }

  const situacaoQuitacao = totalDespesas === 0
    ? 'Sem despesas'
    : (todosQuitados ? 'Tudo quitado' : `Pendente de acertos (${transferenciasSugeridas.length} transferência(s))`);

  return {
    totalDespesasFormatado: formatCurrency(totalDespesas),
    totalPagoGeralFormatado: formatCurrency(totalPagoGeral),
    totalPendenteGeralFormatado: formatCurrency(totalPendenteGeral),
    cotaMediaFormatada: formatCurrency(cotaMedia),
    totalMoradoresTexto: `${totalMoradores} morador(es)`,
    totalMoradoresNumero: totalMoradores,
    totalDespesasQtd,
    situacaoQuitacao,
    nomeModoDivisao,
    resumoAcertos,
    temTransferencias: transferenciasSugeridas.length > 0
  };
}

/**
 * Gera texto estruturado com formatação ideal para copiar e enviar em aplicativos de mensagens.
 *
 * @param {object} calculationResult
 * @returns {string}
 */
export function buildCopyText(calculationResult) {
  if (!calculationResult || !calculationResult.data) return '';

  const { data, memoriaCalculo, warnings } = calculationResult;

  const lines = [
    'Resumo de Divisão de Aluguel e Despesas — Calculadora Master',
    '--------------------------------------------------',
    `Modo: ${data.nomeModoDivisao}`,
    `Total de Despesas: ${data.totalDespesasFormatado}`,
    `Total Pago Antecipadamente: ${data.totalPagoGeralFormatado}`,
    data.totalPendenteGeral > 0 ? `Despesas Não Pagas / Em Aberto: ${data.totalPendenteGeralFormatado}` : null,
    '--------------------------------------------------',
    'Saldos Individuais por Morador:'
  ].filter(Boolean);

  data.moradores.forEach((m) => {
    lines.push(`• ${m.nome}: Cota ${m.cotaFormatada} (${m.percentualFormatado}) | Pagou ${m.totalPagoFormatado} | Saldo: ${m.situacaoTexto}`);
  });

  lines.push('--------------------------------------------------');

  if (data.transferenciasSugeridas.length > 0) {
    lines.push('Sugestão de Pagamentos para Acerto de Contas:');
    data.transferenciasSugeridas.forEach((t) => {
      lines.push(`➔ ${t.texto}`);
    });
  } else if (data.totalDespesas > 0) {
    lines.push('Acerto de Contas: Todos os moradores estão quitados!');
  }

  if (warnings && warnings.length > 0) {
    lines.push('--------------------------------------------------');
    lines.push('Avisos:');
    warnings.forEach((w) => lines.push(`* ${w}`));
  }

  lines.push('--------------------------------------------------');
  lines.push('https://www.calculadoramaster.com/tools/financas/divisao-aluguel.html');

  return lines.join('\n');
}

/* ==========================================================================
 * Conexão com o DOM (Interface do Usuário)
 * ========================================================================== */

export function setupTool(root = document) {
  if (!root) return null;

  const form = root.querySelector('#formDivisaoAluguel');
  if (!form) return null;

  // Elementos do Formulário
  const selModo = root.querySelector('#modoDivisaoAluguel');
  const containerMoradores = root.querySelector('#listaMoradoresAluguel');
  const btnAdicionarMorador = root.querySelector('#adicionarMoradorAluguel');
  const containerDespesas = root.querySelector('#listaDespesasAluguel');
  const btnAdicionarDespesa = root.querySelector('#adicionarDespesaAluguel');
  const alertaPercentuais = root.querySelector('#alertaPercentualAluguel');

  // Elementos de Resultado
  const painelResultado = root.querySelector('#resultadoDivisaoAluguel');
  const painelErro = root.querySelector('#erroDivisaoAluguel');
  const elTotalDespesas = root.querySelector('#resTotalDespesasAluguel');
  const elCotaMedia = root.querySelector('#resCotaMediaAluguel');
  const elBadgeCotaMedia = root.querySelector('#badgeCotaMediaAluguel');
  const elQtdMoradores = root.querySelector('#resQtdMoradoresAluguel');
  const elQtdDespesas = root.querySelector('#resQtdDespesasAluguel');
  const elModoDivisao = root.querySelector('#resModoDivisaoAluguel');
  const elStatusQuitacao = root.querySelector('#resStatusQuitacaoAluguel');
  const elResumoMensagem = root.querySelector('#resumoMensagemAluguel');
  const tableMoradores = root.querySelector('#tabelaSaldosMoradoresAluguel');
  const containerTransferencias = root.querySelector('#listaTransferenciasAluguel');
  const listaMemoria = root.querySelector('#memoriaCalculoAluguel');
  const containerWarnings = root.querySelector('#avisosAluguel');
  const painelStatus = root.querySelector('#statusAcoesAluguel');

  // Botões de Ação
  const btnLimpar = root.querySelector('#btnLimparAluguel');
  const btnCopiar = root.querySelector('#btnCopiarAluguel');
  const btnCompartilhar = root.querySelector('#btnCompartilharAluguel');
  const btnImprimir = root.querySelector('#btnImprimirAluguel');

  let moradorSequence = 0;
  let despesaSequence = 0;
  let currentCalculation = null;

  // Atualiza os seletores de pagador em todas as linhas de despesa
  function atualizarSelectsPagadores() {
    const moradoresAtuais = [];
    const moradorRows = containerMoradores ? containerMoradores.querySelectorAll('.morador-row') : [];

    moradorRows.forEach((row) => {
      const id = row.getAttribute('data-morador-id');
      const inputNome = row.querySelector('.morador-nome-input');
      const nome = inputNome && inputNome.value.trim() ? inputNome.value.trim() : `Morador ${row.getAttribute('data-index') || ''}`;
      moradoresAtuais.push({ id, nome });
    });

    const despesaRows = containerDespesas ? containerDespesas.querySelectorAll('.despesa-row') : [];
    despesaRows.forEach((row) => {
      const select = row.querySelector('.despesa-pagador-select');
      if (!select) return;

      const valorSelecionado = select.value;
      select.innerHTML = '';

      const optNenhum = document.createElement('option');
      optNenhum.value = '';
      optNenhum.textContent = 'Ainda não pago / A ratear';
      select.appendChild(optNenhum);

      moradoresAtuais.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.nome;
        select.appendChild(opt);
      });

      // Restaura seleção prévia se ainda existir
      if (moradoresAtuais.some((m) => m.id === valorSelecionado)) {
        select.value = valorSelecionado;
      } else {
        select.value = '';
      }
    });
  }

  // Verifica e atualiza o aviso visual da soma dos percentuais
  function verificarSomaPercentuais() {
    if (!alertaPercentuais) return;
    const modo = selModo ? selModo.value : MODOS_DIVISAO.IGUALITARIA;

    if (modo !== MODOS_DIVISAO.PERSONALIZADA) {
      alertaPercentuais.hidden = true;
      alertaPercentuais.textContent = '';
      return;
    }

    let soma = 0;
    const inputs = containerMoradores ? containerMoradores.querySelectorAll('.morador-percentual-input') : [];
    inputs.forEach((inp) => {
      const val = parsePercent(inp.value);
      if (Number.isFinite(val)) soma += val;
    });

    soma = Math.round((soma + Number.EPSILON) * 100) / 100;
    alertaPercentuais.hidden = false;

    if (Math.abs(soma - 100) <= 0.05) {
      alertaPercentuais.style.borderLeftColor = '#16a34a';
      alertaPercentuais.style.backgroundColor = '#f0fdf4';
      alertaPercentuais.style.color = '#166534';
      alertaPercentuais.textContent = `Soma das proporções: ${formatPercent(soma, 1)} (Correto: 100%).`;
    } else {
      alertaPercentuais.style.borderLeftColor = '#eab308';
      alertaPercentuais.style.backgroundColor = '#fefce8';
      alertaPercentuais.style.color = '#854d0e';
      alertaPercentuais.textContent = `Atenção: A soma das proporções é ${formatPercent(soma, 1)}. A soma de todos os moradores deve totalizar exatamente 100%.`;
    }
  }

  // Alterna a visibilidade dos campos de porcentagem conforme o modo
  function atualizarModoDivisao() {
    const modo = selModo ? selModo.value : MODOS_DIVISAO.IGUALITARIA;
    const percentualContainers = containerMoradores ? containerMoradores.querySelectorAll('.morador-percentual-container') : [];

    percentualContainers.forEach((el) => {
      el.hidden = modo !== MODOS_DIVISAO.PERSONALIZADA;
    });

    verificarSomaPercentuais();
  }

  // Cria uma linha de morador no DOM
  function criarLinhaMorador(nomeInicial = '', percentualInicial = 0) {
    if (!containerMoradores) return;

    moradorSequence++;
    const rowId = `morador_${moradorSequence}`;
    const indexAtual = containerMoradores.querySelectorAll('.morador-row').length + 1;

    const row = document.createElement('div');
    row.className = 'morador-row dynamic-item-row';
    row.setAttribute('data-morador-id', rowId);
    row.setAttribute('data-index', String(indexAtual));

    // Campo Nome
    const nomeGroup = document.createElement('div');
    nomeGroup.className = 'form-group morador-nome-group';
    const nomeLabel = document.createElement('label');
    nomeLabel.setAttribute('for', `nome_${rowId}`);
    nomeLabel.textContent = `Nome do Morador ${indexAtual}`;
    const nomeInput = document.createElement('input');
    nomeInput.type = 'text';
    nomeInput.id = `nome_${rowId}`;
    nomeInput.name = 'moradorNome';
    nomeInput.className = 'morador-nome-input';
    nomeInput.placeholder = `Ex: Morador ${indexAtual}`;
    nomeInput.value = nomeInicial || `Morador ${indexAtual}`;
    nomeInput.autocomplete = 'off';
    nomeInput.addEventListener('input', () => {
      atualizarSelectsPagadores();
    });
    nomeGroup.append(nomeLabel, nomeInput);

    // Campo Percentual
    const percGroup = document.createElement('div');
    percGroup.className = 'form-group morador-percentual-container';
    const percLabel = document.createElement('label');
    percLabel.setAttribute('for', `perc_${rowId}`);
    percLabel.textContent = 'Proporção (%)';
    const percInput = document.createElement('input');
    percInput.type = 'number';
    percInput.id = `perc_${rowId}`;
    percInput.name = 'moradorPercentual';
    percInput.className = 'morador-percentual-input';
    percInput.min = '0';
    percInput.max = '100';
    percInput.step = '0.01';
    percInput.placeholder = '50';
    percInput.value = percentualInicial > 0 ? String(percentualInicial) : '';
    percInput.autocomplete = 'off';
    percInput.addEventListener('input', () => {
      verificarSomaPercentuais();
    });
    percGroup.append(percLabel, percInput);

    // Botão Remover
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'tool-btn tool-btn-secondary btn-remover-morador';
    removeBtn.textContent = 'Remover';
    removeBtn.setAttribute('aria-label', `Remover Morador ${indexAtual}`);
    removeBtn.addEventListener('click', () => {
      const rows = containerMoradores.querySelectorAll('.morador-row');
      if (rows.length <= 2) {
        if (painelErro) {
          painelErro.textContent = 'A calculadora necessita de no mínimo 2 moradores cadastrados.';
          painelErro.hidden = false;
        }
        return;
      }
      row.remove();
      atualizarSelectsPagadores();
      verificarSomaPercentuais();
    });

    row.append(nomeGroup, percGroup, removeBtn);
    containerMoradores.appendChild(row);

    atualizarModoDivisao();
    atualizarSelectsPagadores();
  }

  // Cria uma linha de despesa no DOM
  function criarLinhaDespesa(descInicial = '', valorInicial = '', pagadorInicial = '') {
    if (!containerDespesas) return;

    despesaSequence++;
    const rowId = `desp_${despesaSequence}`;
    const indexAtual = containerDespesas.querySelectorAll('.despesa-row').length + 1;

    const row = document.createElement('div');
    row.className = 'despesa-row dynamic-item-row';
    row.setAttribute('data-despesa-id', rowId);

    // Campo Descrição
    const descGroup = document.createElement('div');
    descGroup.className = 'form-group despesa-desc-group';
    const descLabel = document.createElement('label');
    descLabel.setAttribute('for', `desc_${rowId}`);
    descLabel.textContent = 'Descrição da despesa';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.id = `desc_${rowId}`;
    descInput.name = 'despesaDescricao';
    descInput.className = 'despesa-desc-input';
    descInput.placeholder = 'Ex: Aluguel, Luz, Internet...';
    descInput.value = descInicial || '';
    descInput.autocomplete = 'off';
    descGroup.append(descLabel, descInput);

    // Campo Valor
    const valGroup = document.createElement('div');
    valGroup.className = 'form-group despesa-valor-group';
    const valLabel = document.createElement('label');
    valLabel.setAttribute('for', `val_${rowId}`);
    valLabel.textContent = 'Valor (R$)';
    const valInput = document.createElement('input');
    valInput.type = 'text';
    valInput.id = `val_${rowId}`;
    valInput.name = 'despesaValor';
    valInput.className = 'despesa-valor-input';
    valInput.inputMode = 'decimal';
    valInput.placeholder = '0,00';
    valInput.value = valorInicial || '';
    valInput.autocomplete = 'off';
    valGroup.append(valLabel, valInput);

    // Campo Pagador
    const pagGroup = document.createElement('div');
    pagGroup.className = 'form-group despesa-pagador-group';
    const pagLabel = document.createElement('label');
    pagLabel.setAttribute('for', `pag_${rowId}`);
    pagLabel.textContent = 'Quem pagou?';
    const pagSelect = document.createElement('select');
    pagSelect.id = `pag_${rowId}`;
    pagSelect.name = 'despesaPagador';
    pagSelect.className = 'despesa-pagador-select';
    pagGroup.append(pagLabel, pagSelect);

    // Botão Remover
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'tool-btn tool-btn-secondary btn-remover-despesa';
    removeBtn.textContent = 'Remover';
    removeBtn.setAttribute('aria-label', `Remover despesa ${descInicial || indexAtual}`);
    removeBtn.addEventListener('click', () => {
      row.remove();
    });

    row.append(descGroup, valGroup, pagGroup, removeBtn);
    containerDespesas.appendChild(row);

    atualizarSelectsPagadores();
    if (pagadorInicial) {
      pagSelect.value = pagadorInicial;
    }
  }

  // Inicialização com 2 moradores e despesas padrão se o formulário estiver vazio
  function inicializarFormularioPadrao() {
    if (containerMoradores && containerMoradores.children.length === 0) {
      criarLinhaMorador('Morador 1', 50);
      criarLinhaMorador('Morador 2', 50);
    }

    if (containerDespesas && containerDespesas.children.length === 0) {
      DESPESAS_PADRAO.forEach((d) => {
        criarLinhaDespesa(d.descricao, '', '');
      });
    }
  }

  // Coleta dados dos inputs do formulário
  function coletarDadosFormulario() {
    const modoDivisao = selModo ? selModo.value : MODOS_DIVISAO.IGUALITARIA;

    const moradores = [];
    const moradorRows = containerMoradores ? containerMoradores.querySelectorAll('.morador-row') : [];
    moradorRows.forEach((row, idx) => {
      const id = row.getAttribute('data-morador-id') || `m_${idx + 1}`;
      const nomeInput = row.querySelector('.morador-nome-input');
      const percInput = row.querySelector('.morador-percentual-input');
      moradores.push({
        id,
        nome: nomeInput ? nomeInput.value : '',
        percentual: percInput ? percInput.value : 0
      });
    });

    const despesas = [];
    const despesaRows = containerDespesas ? containerDespesas.querySelectorAll('.despesa-row') : [];
    despesaRows.forEach((row, idx) => {
      const id = row.getAttribute('data-despesa-id') || `d_${idx + 1}`;
      const descInput = row.querySelector('.despesa-desc-input');
      const valInput = row.querySelector('.despesa-valor-input');
      const pagSelect = row.querySelector('.despesa-pagador-select');
      despesas.push({
        id,
        descricao: descInput ? descInput.value : '',
        valor: valInput ? valInput.value : '0',
        pagoPor: pagSelect ? pagSelect.value : ''
      });
    });

    return { modoDivisao, moradores, despesas };
  }

  function executarCalculo() {
    if (painelErro) {
      painelErro.hidden = true;
      painelErro.textContent = '';
    }

    const payload = coletarDadosFormulario();
    const result = calculateRentSplit(payload);

    if (!result.ok) {
      if (painelErro) {
        painelErro.textContent = result.error || 'Erro ao processar a divisão.';
        painelErro.hidden = false;
        painelErro.focus();
      }
      if (painelResultado) painelResultado.hidden = true;
      return result;
    }

    currentCalculation = result;
    const formatted = formatResult(result.data);

    if (elTotalDespesas) elTotalDespesas.textContent = formatted.totalDespesasFormatado;
    if (elCotaMedia) elCotaMedia.textContent = formatted.cotaMediaFormatada;
    if (elBadgeCotaMedia) elBadgeCotaMedia.textContent = result.data.modoDivisao === MODOS_DIVISAO.IGUALITARIA ? 'Cota Igualitária' : 'Cota Média (Referência)';
    if (elQtdMoradores) elQtdMoradores.textContent = String(formatted.totalMoradoresNumero);
    if (elQtdDespesas) elQtdDespesas.textContent = String(formatted.totalDespesasQtd);
    if (elModoDivisao) elModoDivisao.textContent = formatted.nomeModoDivisao;
    if (elStatusQuitacao) elStatusQuitacao.textContent = formatted.situacaoQuitacao;
    if (elResumoMensagem) elResumoMensagem.textContent = formatted.resumoAcertos;

    // Renderiza Tabela de Saldos por Morador
    if (tableMoradores) {
      let tbody = tableMoradores.querySelector('tbody');
      if (!tbody) {
        tbody = document.createElement('tbody');
        tableMoradores.appendChild(tbody);
      }
      tbody.innerHTML = '';

      result.data.moradores.forEach((m) => {
        const tr = document.createElement('tr');

        const tdNome = document.createElement('td');
        tdNome.textContent = m.nome;

        const tdPerc = document.createElement('td');
        tdPerc.textContent = m.percentualFormatado;

        const tdCota = document.createElement('td');
        tdCota.textContent = m.cotaFormatada;

        const tdPago = document.createElement('td');
        tdPago.textContent = m.totalPagoFormatado;

        const tdSaldo = document.createElement('td');
        tdSaldo.textContent = m.saldoFormatado;

        const tdSit = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `status-badge status-${m.situacao}`;
        badge.textContent = m.situacaoTexto;
        tdSit.appendChild(badge);

        tr.append(tdNome, tdPerc, tdCota, tdPago, tdSaldo, tdSit);
        tbody.appendChild(tr);
      });
    }

    // Renderiza Lista de Transferências Sugeridas
    if (containerTransferencias) {
      containerTransferencias.innerHTML = '';
      if (result.data.transferenciasSugeridas.length === 0) {
        const li = document.createElement('li');
        li.className = 'transferencias-vazia-nota';
        li.textContent = result.data.totalDespesas > 0
          ? 'Nenhum acerto financeiro é necessário: todos os moradores arcaram exatamente com as suas parcelas devidas.'
          : 'Cadastre as despesas e valores para gerar a sugestão de acertos.';
        containerTransferencias.appendChild(li);
      } else {
        result.data.transferenciasSugeridas.forEach((t) => {
          const li = document.createElement('li');
          li.className = 'transferencia-item';
          li.textContent = `➔ ${t.texto}`;
          containerTransferencias.appendChild(li);
        });
      }
    }

    // Renderiza Memória de Cálculo
    if (listaMemoria) {
      listaMemoria.innerHTML = '';
      result.memoriaCalculo.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        listaMemoria.appendChild(li);
      });
    }

    // Renderiza Avisos
    if (containerWarnings) {
      containerWarnings.innerHTML = '';
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((aviso) => {
          const div = document.createElement('div');
          div.className = 'tool-alert tool-alert-warning';
          div.setAttribute('role', 'note');
          div.textContent = aviso;
          containerWarnings.appendChild(div);
        });
      }
    }

    if (painelResultado) painelResultado.hidden = false;

    // Configura botões de copiar, compartilhar e imprimir
    createResultActions({
      container: root.querySelector('.result-actions') || painelResultado,
      copyBtn: btnCopiar,
      shareBtn: btnCompartilhar,
      printBtn: btnImprimir,
      statusEl: painelStatus,
      onCopy: () => buildCopyText(currentCalculation),
      shareData: () => ({
        title: 'Divisão de Aluguel e Despesas',
        text: `Total de despesas de ${formatted.totalDespesasFormatado} dividido entre ${formatted.totalMoradoresTexto}.`,
        url: window.location.href
      }),
      printOptions: {
        title: 'Divisão de Aluguel e Despesas Compartilhadas'
      }
    });

    return result;
  }

  // Event Listeners
  if (selModo) {
    selModo.addEventListener('change', () => {
      atualizarModoDivisao();
    });
  }

  if (btnAdicionarMorador) {
    btnAdicionarMorador.addEventListener('click', () => {
      criarLinhaMorador();
    });
  }

  if (btnAdicionarDespesa) {
    btnAdicionarDespesa.addEventListener('click', () => {
      criarLinhaDespesa();
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    executarCalculo();
  });

  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      form.reset();
      if (containerMoradores) containerMoradores.innerHTML = '';
      if (containerDespesas) containerDespesas.innerHTML = '';
      inicializarFormularioPadrao();
      if (painelResultado) painelResultado.hidden = true;
      if (painelErro) {
        painelErro.hidden = true;
        painelErro.textContent = '';
      }
      if (tableMoradores) {
        const tbody = tableMoradores.querySelector('tbody');
        if (tbody) tbody.innerHTML = '';
      }
      if (containerTransferencias) containerTransferencias.innerHTML = '';
      if (listaMemoria) listaMemoria.innerHTML = '';
      if (containerWarnings) containerWarnings.innerHTML = '';
      if (selModo) selModo.value = MODOS_DIVISAO.IGUALITARIA;
      atualizarModoDivisao();
    });
  }

  // Inicialização padrão
  inicializarFormularioPadrao();

  return {
    executarCalculo,
    getCurrentCalculation: () => currentCalculation
  };
}

if (typeof document !== 'undefined') {
  setupTool(document);
}
