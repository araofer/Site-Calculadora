/**
 * Calculadora de Custo por Quilômetro e Lucro por Corrida — Calculadora Master
 * Módulo ES nativo para apuração de custo operacional por km e rentabilidade de corridas e entregas.
 * Atende motoristas de aplicativo (Uber, 99, inDrive) e entregadores (motoboys e courier).
 * Regras puras desacopladas do DOM, seguras contra XSS e com prevenção a dupla dedução.
 */

import { createResultActions } from '../core/result-actions.js';
import { parseBRLCurrency, formatBRLCurrencyInput, formatBRL } from '../core/currency.js';

export const MODALIDADES_TAXA = new Set(['bruto', 'liquido']);

/**
 * Arredonda valor monetário para 2 casas decimais evitando -0 e imprecisões de ponto flutuante.
 *
 * @param {number} valor
 * @returns {number}
 */
export function arredondarMoeda(valor) {
  if (!Number.isFinite(valor)) return 0;
  const arredondado = Math.round((valor + Number.EPSILON) * 100) / 100;
  return Object.is(arredondado, -0) ? 0 : arredondado;
}

/**
 * Arredonda valor decimal para N casas decimais evitando -0.
 *
 * @param {number} valor
 * @param {number} [casas=2]
 * @returns {number}
 */
export function arredondarDecimal(valor, casas = 2) {
  if (!Number.isFinite(valor)) return 0;
  const fator = Math.pow(10, casas);
  const arredondado = Math.round((valor + Number.EPSILON) * fator) / fator;
  return Object.is(arredondado, -0) ? 0 : arredondado;
}

/**
 * Converte string flexível ou número para valor decimal numérico puro.
 * Trata vírgula e ponto ("12,5", "12.5", "10").
 *
 * @param {string|number} valor
 * @returns {number}
 */
export function parseDecimalPtBr(valor) {
  if (valor === undefined || valor === null) return NaN;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : NaN;
  }
  const limpo = String(valor).trim().replace(/\s+/g, '').replace('%', '');
  if (!limpo) return NaN;
  const normalizado = limpo.replace(',', '.');
  const num = Number(normalizado);
  return Number.isFinite(num) ? num : NaN;
}

/**
 * Realiza as validações das entradas fornecidas pelo usuário.
 *
 * @param {Object} params
 * @returns {{ valido: boolean, erro?: string, dadosNormalizados?: Object }}
 */
export function validarEntradasCorrida(params = {}) {
  const modalidadeTaxa = params.modalidadeTaxa === 'liquido' ? 'liquido' : 'bruto';

  // 1. Receita da corrida (Bruta se modalidade 'bruto', ou Líquida se 'liquido')
  const receitaEntrada = parseBRLCurrency(params.valorReceita, { allowNegative: false });
  if (receitaEntrada <= 0) {
    return {
      valido: false,
      erro: modalidadeTaxa === 'bruto'
        ? 'Informe um valor bruto de corrida maior que zero.'
        : 'Informe um valor líquido de corrida maior que zero.'
    };
  }

  // 2. Distância com passageiro/carga
  const distCorrida = parseDecimalPtBr(params.distanciaCorrida);
  if (isNaN(distCorrida) || distCorrida <= 0) {
    return {
      valido: false,
      erro: 'Informe a distância da corrida (km) maior que zero.'
    };
  }

  // 3. Distância de retorno vazio (opcional, padrão 0)
  let distRetorno = 0;
  if (params.distanciaRetorno !== undefined && params.distanciaRetorno !== null && String(params.distanciaRetorno).trim() !== '') {
    distRetorno = parseDecimalPtBr(params.distanciaRetorno);
    if (isNaN(distRetorno) || distRetorno < 0) {
      return {
        valido: false,
        erro: 'A distância de retorno vazio não pode ser negativa.'
      };
    }
  }

  // 4. Taxas do aplicativo (somente se modalidade 'bruto')
  let taxaPercentual = 0;
  let taxaFixa = 0;
  if (modalidadeTaxa === 'bruto') {
    if (params.taxaPercentual !== undefined && params.taxaPercentual !== null && String(params.taxaPercentual).trim() !== '') {
      taxaPercentual = parseDecimalPtBr(params.taxaPercentual);
      if (isNaN(taxaPercentual) || taxaPercentual < 0) {
        return {
          valido: false,
          erro: 'A taxa percentual da plataforma não pode ser negativa.'
        };
      }
      if (taxaPercentual >= 100) {
        return {
          valido: false,
          erro: 'A taxa percentual da plataforma deve ser estritamente inferior a 100%.'
        };
      }
    }

    if (params.taxaFixa !== undefined && params.taxaFixa !== null && String(params.taxaFixa).trim() !== '') {
      taxaFixa = parseBRLCurrency(params.taxaFixa, { allowNegative: false });
      if (taxaFixa < 0) {
        return {
          valido: false,
          erro: 'A taxa fixa da plataforma não pode ser negativa.'
        };
      }
    }
  }

  // 5. Combustível
  const consumo = parseDecimalPtBr(params.consumoVeiculo);
  if (isNaN(consumo) || consumo <= 0) {
    return {
      valido: false,
      erro: 'O consumo médio do veículo deve ser maior que zero (km/L).'
    };
  }

  const precoLitro = parseDecimalPtBr(params.precoCombustivel);
  if (isNaN(precoLitro) || precoLitro <= 0) {
    return {
      valido: false,
      erro: 'O preço do litro do combustível deve ser maior que zero (R$/L).'
    };
  }

  // 6. Custos de desgaste por km (opcionais, padrão 0)
  const custoManutencaoKm = params.custoManutencaoKm !== undefined && String(params.custoManutencaoKm).trim() !== ''
    ? parseDecimalPtBr(params.custoManutencaoKm)
    : 0;
  if (isNaN(custoManutencaoKm) || custoManutencaoKm < 0) {
    return {
      valido: false,
      erro: 'O custo de manutenção preventiva por km não pode ser negativo.'
    };
  }

  const custoPneusKm = params.custoPneusKm !== undefined && String(params.custoPneusKm).trim() !== ''
    ? parseDecimalPtBr(params.custoPneusKm)
    : 0;
  if (isNaN(custoPneusKm) || custoPneusKm < 0) {
    return {
      valido: false,
      erro: 'O custo de pneus por km não pode ser negativo.'
    };
  }

  const custoDepreciacaoKm = params.custoDepreciacaoKm !== undefined && String(params.custoDepreciacaoKm).trim() !== ''
    ? parseDecimalPtBr(params.custoDepreciacaoKm)
    : 0;
  if (isNaN(custoDepreciacaoKm) || custoDepreciacaoKm < 0) {
    return {
      valido: false,
      erro: 'O custo de depreciação veicular por km não pode ser negativo.'
    };
  }

  // 7. Outras despesas (opcional, padrão 0)
  let outrasDespesas = 0;
  if (params.outrasDespesas !== undefined && params.outrasDespesas !== null && String(params.outrasDespesas).trim() !== '') {
    outrasDespesas = parseBRLCurrency(params.outrasDespesas, { allowNegative: false });
    if (outrasDespesas < 0) {
      return {
        valido: false,
        erro: 'O valor de outras despesas não pode ser negativo.'
      };
    }
  }

  return {
    valido: true,
    dadosNormalizados: {
      modalidadeTaxa,
      receitaEntrada,
      distCorrida,
      distRetorno,
      taxaPercentual,
      taxaFixa,
      consumo,
      precoLitro,
      custoManutencaoKm,
      custoPneusKm,
      custoDepreciacaoKm,
      outrasDespesas
    }
  };
}

/**
 * Calcula o custo por quilômetro e o lucro líquido real por corrida.
 * Função pura e desacoplada do DOM para testes automatizados.
 *
 * @param {Object} params
 * @returns {{ ok: boolean, data?: Object, error?: string }}
 */
export function calcularCustoKmELucroCorrida(params = {}) {
  const validacao = validarEntradasCorrida(params);
  if (!validacao.valido) {
    return { ok: false, error: validacao.erro };
  }

  const d = validacao.dadosNormalizados;

  // 1. Distância Total Operacional
  const distanciaTotal = arredondarDecimal(d.distCorrida + d.distRetorno, 2);

  // 2. Receita Líquida do Aplicativo
  let receitaBruta = 0;
  let descontoTaxaPercentual = 0;
  let descontoTaxaFixa = 0;
  let totalDescontoApp = 0;
  let receitaLiquida = 0;

  if (d.modalidadeTaxa === 'bruto') {
    receitaBruta = arredondarMoeda(d.receitaEntrada);
    descontoTaxaPercentual = arredondarMoeda(receitaBruta * (d.taxaPercentual / 100));
    descontoTaxaFixa = arredondarMoeda(d.taxaFixa);
    totalDescontoApp = arredondarMoeda(descontoTaxaPercentual + descontoTaxaFixa);

    if (totalDescontoApp >= receitaBruta) {
      return {
        ok: false,
        error: 'As taxas da plataforma são iguais ou superiores ao valor bruto da corrida.'
      };
    }

    receitaLiquida = arredondarMoeda(receitaBruta - totalDescontoApp);
  } else {
    // Modalidade Líquido: o valor informado já é o líquido transferido pelo app
    receitaBruta = arredondarMoeda(d.receitaEntrada);
    receitaLiquida = receitaBruta;
    totalDescontoApp = 0;
  }

  // 3. Custo do Combustível
  const litrosCombustivel = distanciaTotal > 0 ? distanciaTotal / d.consumo : 0;
  const custoCombustivel = arredondarMoeda(litrosCombustivel * d.precoLitro);

  // 4. Custos Unitários e Reserva Estimada de Desgaste (Manutenção + Pneus + Depreciação)
  const custoDesgasteKm = arredondarDecimal(d.custoManutencaoKm + d.custoPneusKm + d.custoDepreciacaoKm, 4);
  const custoManutencao = arredondarMoeda(distanciaTotal * d.custoManutencaoKm);
  const custoPneus = arredondarMoeda(distanciaTotal * d.custoPneusKm);
  const custoDepreciacao = arredondarMoeda(distanciaTotal * d.custoDepreciacaoKm);
  const reservaDesgaste = arredondarMoeda(custoManutencao + custoPneus + custoDepreciacao);

  // 5. Custo Operacional Total
  // (Combustível + Reserva de Manutenção/Depreciação + Outras Despesas)
  const outrasDespesas = arredondarMoeda(d.outrasDespesas);
  const custoOperacionalTotal = arredondarMoeda(custoCombustivel + reservaDesgaste + outrasDespesas);

  // 6. Custo por Quilômetro
  const custoPorKm = distanciaTotal > 0 ? arredondarMoeda(custoOperacionalTotal / distanciaTotal) : 0;

  // 7. Lucro Real Estimado
  // REGRA DE OURO: Reserva já compõe custoOperacionalTotal, sem dupla dedução!
  const lucroReal = arredondarMoeda(receitaLiquida - custoOperacionalTotal);

  // 8. Lucro por Quilômetro
  const lucroPorKm = distanciaTotal > 0 ? arredondarMoeda(lucroReal / distanciaTotal) : 0;

  // 9. Margem de Lucro Real (%)
  let margemLucro = 0;
  if (receitaLiquida > 0) {
    margemLucro = arredondarDecimal((lucroReal / receitaLiquida) * 100, 2);
  }

  // 10. Classificação do Resultado (Lucro, Equilíbrio ou Prejuízo)
  let statusResultado = 'lucro';
  if (lucroReal === 0) {
    statusResultado = 'equilibrio';
  } else if (lucroReal < 0) {
    statusResultado = 'prejuizo';
  }

  return {
    ok: true,
    data: {
      modalidadeTaxa: d.modalidadeTaxa,
      distanciaCorrida: d.distCorrida,
      distanciaRetorno: d.distRetorno,
      distanciaTotal,
      receitaBruta,
      taxaPercentualApp: d.taxaPercentual,
      taxaFixaApp: d.taxaFixa,
      descontoTaxaPercentual,
      descontoTaxaFixa,
      totalDescontoApp,
      receitaLiquida,
      consumoVeiculo: d.consumo,
      precoCombustivel: d.precoLitro,
      litrosCombustivel: arredondarDecimal(litrosCombustivel, 2),
      custoCombustivel,
      custoManutencaoKm: d.custoManutencaoKm,
      custoPneusKm: d.custoPneusKm,
      custoDepreciacaoKm: d.custoDepreciacaoKm,
      custoDesgasteKm,
      custoManutencao,
      custoPneus,
      custoDepreciacao,
      reservaDesgaste,
      outrasDespesas,
      custoOperacionalTotal,
      custoPorKm,
      lucroReal,
      lucroPorKm,
      margemLucro,
      statusResultado
    }
  };
}

/**
 * Constrói seções estruturadas para exportação via createResultActions (Copiar/Compartilhar).
 *
 * @param {Object} calc
 * @returns {Array<Object>}
 */
export function getResultSections(calc) {
  if (!calc) return [];

  const rotuloLucro = calc.statusResultado === 'prejuizo'
    ? 'Prejuízo Real Estimado'
    : (calc.statusResultado === 'equilibrio' ? 'Ponto de Equilíbrio (Lucro Zero)' : 'Lucro Líquido Real');

  const sections = [
    { label: rotuloLucro, value: formatBRL(calc.lucroReal, { includeSymbol: true }) },
    { label: 'Lucro por Quilômetro', value: `${formatBRL(calc.lucroPorKm, { includeSymbol: true })}/km` },
    { label: 'Custo por Quilômetro', value: `${formatBRL(calc.custoPorKm, { includeSymbol: true })}/km` },
    { label: 'Distância Total Operacional', value: `${calc.distanciaTotal.toLocaleString('pt-BR')} km (Corrida: ${calc.distanciaCorrida.toLocaleString('pt-BR')} km + Retorno: ${calc.distanciaRetorno.toLocaleString('pt-BR')} km)` },
    { label: 'Receita Líquida da Corrida', value: formatBRL(calc.receitaLiquida, { includeSymbol: true }) },
    { label: 'Custo Operacional Total', value: formatBRL(calc.custoOperacionalTotal, { includeSymbol: true }) },
    { label: 'Custo de Combustível', value: `${formatBRL(calc.custoCombustivel, { includeSymbol: true })} (${calc.litrosCombustivel.toLocaleString('pt-BR')} L)` },
    { label: 'Reserva Estimada (Manutenção e Depreciação)', value: formatBRL(calc.reservaDesgaste, { includeSymbol: true }) }
  ];

  if (calc.modalidadeTaxa === 'bruto') {
    sections.push({ label: 'Receita Bruta Ofertada', value: formatBRL(calc.receitaBruta, { includeSymbol: true }) });
    sections.push({ label: 'Comissão Total da Plataforma', value: formatBRL(calc.totalDescontoApp, { includeSymbol: true }) });
  }

  sections.push({ label: 'Margem de Lucro Real', value: `${calc.margemLucro.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%` });

  return sections;
}

/**
 * Inicializa os controles, escutas de eventos e integração com o DOM.
 */
export function setupTool(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root) return null;

  const getEl = (id) => (root.getElementById ? root.getElementById(id) : (root.querySelector ? root.querySelector(`#${id}`) : null));

  const form = getEl('formCorrida');
  if (!form) return null;

  // Botões de Presets
  const btnPresetCarro = getEl('presetCarro');
  const btnPresetMoto = getEl('presetMoto');

  // Modalidade de taxa
  const radioTaxaBruto = getEl('modTaxaBruto');
  const radioTaxaLiquido = getEl('modTaxaLiquido');
  const grupoTaxasApp = getEl('grupoTaxasApp');
  const labelValorReceita = getEl('labelValorReceita');
  const ajudaValorReceita = getEl('ajudaValorReceita');

  // Inputs
  const inputValorReceita = getEl('valorReceita');
  const inputTaxaPercentual = getEl('taxaPercentual');
  const inputTaxaFixa = getEl('taxaFixa');
  const inputDistanciaCorrida = getEl('distanciaCorrida');
  const inputDistanciaRetorno = getEl('distanciaRetorno');
  const inputConsumoVeiculo = getEl('consumoVeiculo');
  const inputPrecoCombustivel = getEl('precoCombustivel');
  const inputCustoManutencaoKm = getEl('custoManutencaoKm');
  const inputCustoPneusKm = getEl('custoPneusKm');
  const inputCustoDepreciacaoKm = getEl('custoDepreciacaoKm');
  const inputOutrasDespesas = getEl('outrasDespesas');

  // Containers
  const erroContainer = getEl('erroCorrida');
  const resultadoContainer = getEl('resultadoCorrida');

  // Elementos do resultado
  const cardLucroPrincipal = getEl('cardLucroPrincipal');
  const rotuloLucroPrincipal = getEl('rotuloLucroPrincipal');
  const resLucroReal = getEl('resLucroReal');
  const resBadgeStatus = getEl('resBadgeStatus');

  const resDistanciaTotal = getEl('resDistanciaTotal');
  const resCustoOperacional = getEl('resCustoOperacional');
  const resCustoKm = getEl('resCustoKm');
  const resLucroKm = getEl('resLucroKm');
  const resReceitaLiquida = getEl('resReceitaLiquida');
  const resMargemLucro = getEl('resMargemLucro');
  const resReservaDesgaste = getEl('resReservaDesgaste');

  const resDetCombustivel = getEl('resDetCombustivel');
  const resDetManutencao = getEl('resDetManutencao');
  const resDetPneus = getEl('resDetPneus');
  const resDetDepreciacao = getEl('resDetDepreciacao');
  const resDetOutrasDespesas = getEl('resDetOutrasDespesas');
  const linhaDetDescontoApp = getEl('linhaDetDescontoApp');
  const resDetDescontoApp = getEl('resDetDescontoApp');

  // Botões de ação
  const btnCopiar = getEl('btnCopiar');
  const btnCompartilhar = getEl('btnCompartilhar');
  const btnImprimir = getEl('btnImprimir');
  const statusAcoes = getEl('statusAcoes');
  const btnLimpar = getEl('btnLimpar');

  let ultimoResultado = null;

  // Máscaras monetárias em tempo real
  if (inputValorReceita) {
    inputValorReceita.addEventListener('input', () => formatBRLCurrencyInput(inputValorReceita));
  }
  if (inputTaxaFixa) {
    inputTaxaFixa.addEventListener('input', () => formatBRLCurrencyInput(inputTaxaFixa));
  }
  if (inputPrecoCombustivel) {
    inputPrecoCombustivel.addEventListener('input', () => formatBRLCurrencyInput(inputPrecoCombustivel));
  }
  if (inputOutrasDespesas) {
    inputOutrasDespesas.addEventListener('input', () => formatBRLCurrencyInput(inputOutrasDespesas));
  }

  // Alternância da modalidade de taxa
  function atualizarModalidadeTaxa() {
    const ehLiquido = radioTaxaLiquido ? radioTaxaLiquido.checked : false;

    if (grupoTaxasApp) {
      grupoTaxasApp.hidden = ehLiquido;
    }

    if (inputTaxaPercentual) {
      inputTaxaPercentual.disabled = ehLiquido;
    }

    if (inputTaxaFixa) {
      inputTaxaFixa.disabled = ehLiquido;
    }

    if (labelValorReceita) {
      labelValorReceita.textContent = ehLiquido
        ? 'Valor líquido a receber da corrida (R$):'
        : 'Valor bruto da corrida no app (R$):';
    }

    if (ajudaValorReceita) {
      ajudaValorReceita.textContent = ehLiquido
        ? 'Informe quanto você realmente vai receber após os descontos da plataforma.'
        : 'Informe o valor total pago pelo passageiro ou ofertado pelo aplicativo.';
    }
  }

  if (radioTaxaBruto) radioTaxaBruto.addEventListener('change', atualizarModalidadeTaxa);
  if (radioTaxaLiquido) radioTaxaLiquido.addEventListener('change', atualizarModalidadeTaxa);

  // Presets Ilustrativos de Veículo (definem somente o consumo estimado, sem inventar custos de desgaste)
  if (btnPresetCarro) {
    btnPresetCarro.addEventListener('click', () => {
      if (inputConsumoVeiculo) inputConsumoVeiculo.value = '10,0';
      if (erroContainer) {
        erroContainer.hidden = true;
        erroContainer.textContent = '';
      }
    });
  }

  if (btnPresetMoto) {
    btnPresetMoto.addEventListener('click', () => {
      if (inputConsumoVeiculo) inputConsumoVeiculo.value = '35,0';
      if (erroContainer) {
        erroContainer.hidden = true;
        erroContainer.textContent = '';
      }
    });
  }

  // Inicializa fábrica de ações de resultado
  const resultActions = createResultActions({
    title: 'Custo por Quilômetro e Lucro por Corrida — Calculadora Master',
    statusElement: statusAcoes,
    getSections: () => getResultSections(ultimoResultado)
  });

  if (btnCopiar) {
    btnCopiar.addEventListener('click', () => resultActions.copy());
  }
  if (btnCompartilhar) {
    btnCompartilhar.addEventListener('click', () => resultActions.share());
  }
  if (btnImprimir) {
    btnImprimir.addEventListener('click', () => resultActions.print());
  }

  // Submissão do formulário
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const params = {
      modalidadeTaxa: radioTaxaLiquido && radioTaxaLiquido.checked ? 'liquido' : 'bruto',
      valorReceita: inputValorReceita ? inputValorReceita.value : '',
      taxaPercentual: inputTaxaPercentual ? inputTaxaPercentual.value : '',
      taxaFixa: inputTaxaFixa ? inputTaxaFixa.value : '',
      distanciaCorrida: inputDistanciaCorrida ? inputDistanciaCorrida.value : '',
      distanciaRetorno: inputDistanciaRetorno ? inputDistanciaRetorno.value : '',
      consumoVeiculo: inputConsumoVeiculo ? inputConsumoVeiculo.value : '',
      precoCombustivel: inputPrecoCombustivel ? inputPrecoCombustivel.value : '',
      custoManutencaoKm: inputCustoManutencaoKm ? inputCustoManutencaoKm.value : '',
      custoPneusKm: inputCustoPneusKm ? inputCustoPneusKm.value : '',
      custoDepreciacaoKm: inputCustoDepreciacaoKm ? inputCustoDepreciacaoKm.value : '',
      outrasDespesas: inputOutrasDespesas ? inputOutrasDespesas.value : ''
    };

    const res = calcularCustoKmELucroCorrida(params);

    if (!res.ok) {
      if (erroContainer) {
        erroContainer.textContent = res.error;
        erroContainer.hidden = false;
        erroContainer.focus();
      }
      if (resultadoContainer) {
        resultadoContainer.hidden = true;
      }
      ultimoResultado = null;
      return;
    }

    if (erroContainer) {
      erroContainer.hidden = true;
      erroContainer.textContent = '';
    }

    const data = res.data;
    ultimoResultado = data;

    // Atualização visual do Card Principal de Lucro
    if (cardLucroPrincipal) {
      cardLucroPrincipal.classList.remove('status-lucro', 'status-equilibrio', 'status-prejuizo');
      cardLucroPrincipal.classList.add(`status-${data.statusResultado}`);
      if (data.statusResultado === 'prejuizo') {
        cardLucroPrincipal.style.borderLeftColor = '#c53030';
      } else if (data.statusResultado === 'equilibrio') {
        cardLucroPrincipal.style.borderLeftColor = '#718096';
      } else {
        cardLucroPrincipal.style.borderLeftColor = '#2f855a';
      }
    }

    if (rotuloLucroPrincipal) {
      if (data.statusResultado === 'prejuizo') {
        rotuloLucroPrincipal.textContent = 'Prejuízo Real Estimado da Corrida:';
      } else if (data.statusResultado === 'equilibrio') {
        rotuloLucroPrincipal.textContent = 'Ponto de Equilíbrio (Lucro Zero):';
      } else {
        rotuloLucroPrincipal.textContent = 'Lucro Líquido Real da Corrida:';
      }
    }

    if (resLucroReal) {
      resLucroReal.textContent = formatBRL(data.lucroReal, { includeSymbol: true });
      if (data.statusResultado === 'prejuizo') {
        resLucroReal.style.color = '#c53030';
      } else if (data.statusResultado === 'equilibrio') {
        resLucroReal.style.color = '#4a5568';
      } else {
        resLucroReal.style.color = '#2f855a';
      }
    }

    if (resBadgeStatus) {
      resBadgeStatus.className = `status-badge status-${data.statusResultado}`;
      if (data.statusResultado === 'prejuizo') {
        resBadgeStatus.textContent = 'Corrida com Prejuízo';
      } else if (data.statusResultado === 'equilibrio') {
        resBadgeStatus.textContent = 'Ponto de Equilíbrio (Zero a Zero)';
      } else {
        resBadgeStatus.textContent = 'Corrida Lucrativa';
      }
      resBadgeStatus.hidden = false;
    }

    // Métricas principais
    if (resDistanciaTotal) {
      resDistanciaTotal.textContent = `${data.distanciaTotal.toLocaleString('pt-BR')} km`;
    }
    if (resCustoOperacional) {
      resCustoOperacional.textContent = formatBRL(data.custoOperacionalTotal, { includeSymbol: true });
    }
    if (resCustoKm) {
      resCustoKm.textContent = `${formatBRL(data.custoPorKm, { includeSymbol: true })}/km`;
    }
    if (resLucroKm) {
      resLucroKm.textContent = `${formatBRL(data.lucroPorKm, { includeSymbol: true })}/km`;
      if (data.statusResultado === 'prejuizo') {
        resLucroKm.style.color = '#c53030';
      } else {
        resLucroKm.style.color = '';
      }
    }
    if (resReceitaLiquida) {
      resReceitaLiquida.textContent = formatBRL(data.receitaLiquida, { includeSymbol: true });
    }
    if (resMargemLucro) {
      resMargemLucro.textContent = `${data.margemLucro.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
    }

    // Card Educativo: Reserva estimada de manutenção e depreciação
    if (resReservaDesgaste) {
      resReservaDesgaste.textContent = formatBRL(data.reservaDesgaste, { includeSymbol: true });
    }

    // Detalhamento dos custos
    if (resDetCombustivel) {
      resDetCombustivel.textContent = `${formatBRL(data.custoCombustivel, { includeSymbol: true })} (${data.litrosCombustivel.toLocaleString('pt-BR')} L)`;
    }
    if (resDetManutencao) {
      resDetManutencao.textContent = formatBRL(data.custoManutencao, { includeSymbol: true });
    }
    if (resDetPneus) {
      resDetPneus.textContent = formatBRL(data.custoPneus, { includeSymbol: true });
    }
    if (resDetDepreciacao) {
      resDetDepreciacao.textContent = formatBRL(data.custoDepreciacao, { includeSymbol: true });
    }
    if (resDetOutrasDespesas) {
      resDetOutrasDespesas.textContent = formatBRL(data.outrasDespesas, { includeSymbol: true });
    }

    if (linhaDetDescontoApp) {
      if (data.modalidadeTaxa === 'bruto' && data.totalDescontoApp > 0) {
        linhaDetDescontoApp.hidden = false;
        if (resDetDescontoApp) {
          resDetDescontoApp.textContent = formatBRL(data.totalDescontoApp, { includeSymbol: true });
        }
      } else {
        linhaDetDescontoApp.hidden = true;
      }
    }

    if (resultadoContainer) {
      resultadoContainer.hidden = false;
    }
  });

  // Limpeza do formulário
  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      form.reset();
      atualizarModalidadeTaxa();
      if (cardLucroPrincipal) {
        cardLucroPrincipal.classList.remove('status-equilibrio', 'status-prejuizo');
        cardLucroPrincipal.classList.add('status-lucro');
        cardLucroPrincipal.style.borderLeftColor = '#2f855a';
      }
      if (resBadgeStatus) {
        resBadgeStatus.hidden = true;
      }
      if (erroContainer) {
        erroContainer.hidden = true;
        erroContainer.textContent = '';
      }
      if (resultadoContainer) {
        resultadoContainer.hidden = true;
      }
      if (statusAcoes) {
        statusAcoes.textContent = '';
      }
      ultimoResultado = null;
      if (inputValorReceita) inputValorReceita.focus();
    });
  }

  // Inicialização inicial do estado da interface
  atualizarModalidadeTaxa();

  return {
    atualizarModalidadeTaxa,
    calcular: () => form.dispatchEvent(new Event('submit', { cancelable: true })),
    limpar: () => btnLimpar && btnLimpar.click(),
    getUltimoResultado: () => ultimoResultado
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTool);
  } else {
    setupTool();
  }
}
