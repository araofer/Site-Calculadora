/**
 * Ferramenta: Calculadora de Regra de Três - Calculadora Master
 * Módulo ES nativo para cálculo de regra de três simples direta e inversa.
 * Funções puras desacopladas de DOM e de window.
 * Zero dependências externas.
 */

import { createResultActions } from '../core/result-actions.js';

/**
 * Converte string ou número em formato numérico puro de forma estrita.
 * Aceita números inteiros e decimais com vírgula ou ponto (ex: 10, 10.5, 10,5, 0.5, 0,5, 1.000).
 * Rejeita valores negativos, malformados ou não numéricos.
 *
 * @param {string|number} raw Entrada bruta
 * @returns {number} Número válido ou NaN
 */
export function parseRuleOfThreeNumber(raw) {
  if (raw === undefined || raw === null) return NaN;

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return NaN;
    return raw;
  }

  if (typeof raw !== 'string') return NaN;

  const str = raw.trim();
  if (!str) return NaN;

  // Aceita apenas dígitos separados por ponto ou vírgula únicos/agrupados
  if (!/^\d+(?:[.,]\d+)*$/.test(str)) {
    return NaN;
  }

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  let cleanStr = str;

  if (hasComma && hasDot) {
    // Formato brasileiro padrão: milhares com '.' e decimal com ',' (ex: 1.000,50 ou 1.234,5)
    if (/^\d{1,3}(\.\d{3})+,\d+$/.test(str)) {
      cleanStr = str.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(,\d{3})+\.\d+$/.test(str)) {
      // Formato internacional: milhares com ',' e decimal com '.' (ex: 1,234.56)
      cleanStr = str.replace(/,/g, '');
    } else {
      return NaN;
    }
  } else if (hasComma) {
    // Apenas vírgula: deve ter exatamente uma vírgula decimal (ex: 10,5 ou 0,5)
    const commaCount = (str.match(/,/g) || []).length;
    if (commaCount !== 1) return NaN;
    cleanStr = str.replace(',', '.');
  } else if (hasDot) {
    // Apenas ponto: agrupamento de milhar brasileiro (ex: 1.000) ou decimal simples (ex: 10.5)
    if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
      cleanStr = str.replace(/\./g, '');
    } else {
      const dotCount = (str.match(/\./g) || []).length;
      if (dotCount !== 1) return NaN;
      cleanStr = str;
    }
  }

  const num = Number(cleanStr);
  if (!Number.isFinite(num) || Number.isNaN(num) || num < 0) {
    return NaN;
  }

  return num === 0 ? 0 : num;
}

/**
 * Normaliza os parâmetros de entrada da regra de três.
 *
 * @param {Object} rawInput
 * @param {string|number} [rawInput.a] Primeiro valor da primeira grandeza
 * @param {string|number} [rawInput.b] Primeiro valor da segunda grandeza
 * @param {string|number} [rawInput.c] Segundo valor da primeira grandeza
 * @param {string} [rawInput.mode='direct'] Modo: 'direct' (direta) ou 'inverse' (inversa)
 * @returns {{a: number, b: number, c: number, mode: string}}
 */
export function normalizeRuleOfThreeInput(rawInput = {}) {
  const rawMode = String(rawInput.mode || 'direct').trim().toLowerCase();
  const mode = rawMode === 'inverse' ? 'inverse' : (rawMode === 'direct' ? 'direct' : rawMode);

  const hasNegative = [rawInput.a, rawInput.b, rawInput.c].some(val => {
    if (typeof val === 'number') return val < 0;
    if (typeof val === 'string') return /^\s*-\s*\d/.test(val);
    return false;
  });

  const a = parseRuleOfThreeNumber(rawInput.a);
  const b = parseRuleOfThreeNumber(rawInput.b);
  const c = parseRuleOfThreeNumber(rawInput.c);

  return {
    mode,
    a,
    b,
    c,
    hasNegative
  };
}

/**
 * Valida os dados de entrada normalizados da regra de três.
 *
 * @param {Object} params
 * @returns {{valido: boolean, erro?: string}}
 */
export function validateRuleOfThreeInput(params = {}) {
  if (params.mode !== 'direct' && params.mode !== 'inverse') {
    return {
      valido: false,
      erro: 'Selecione um tipo de proporcionalidade válido (direta ou inversa).'
    };
  }

  const hasNegative = params.hasNegative || [params.a, params.b, params.c].some(val => {
    if (typeof val === 'number') return val < 0;
    if (typeof val === 'string') return /^\s*-\s*\d/.test(val);
    return false;
  });

  if (hasNegative || params.a < 0 || params.b < 0 || params.c < 0) {
    return {
      valido: false,
      erro: 'Os valores de A, B e C devem ser números positivos.'
    };
  }

  if (!Number.isFinite(params.a) || !Number.isFinite(params.b) || !Number.isFinite(params.c)) {
    return {
      valido: false,
      erro: 'Preencha todos os campos (A, B e C) com números válidos.'
    };
  }

  if (params.a === 0) {
    return {
      valido: false,
      erro: params.mode === 'direct'
        ? 'Na regra de três direta, o valor de A não pode ser zero (divisão por zero).'
        : 'O valor de A deve ser maior que zero.'
    };
  }

  if (params.c === 0) {
    return {
      valido: false,
      erro: params.mode === 'inverse'
        ? 'Na regra de três inversa, o valor de C não pode ser zero (divisão por zero).'
        : 'O valor de C deve ser maior que zero.'
    };
  }

  return { valido: true };
}

/**
 * Executa o cálculo da regra de três simples (direta ou inversa).
 * Função pura e desacoplada do DOM e de window.
 *
 * @param {Object} input
 * @returns {Object}
 */
export function calculateRuleOfThree(input = {}) {
  const normalized = normalizeRuleOfThreeInput(input);
  const validation = validateRuleOfThreeInput(normalized);

  if (!validation.valido) {
    return {
      valido: false,
      erro: validation.erro
    };
  }

  const { mode, a, b, c } = normalized;
  let x = 0;
  let formula = '';
  let formulaSubstituida = '';

  if (mode === 'direct') {
    // Proporcionalidade Direta: A / B = C / X => X = (B * C) / A
    x = (b * c) / a;
    formula = 'X = (B × C) ÷ A';
    formulaSubstituida = `X = (${b} × ${c}) ÷ ${a}`;
  } else {
    // Proporcionalidade Inversa: A * B = C * X => X = (A * B) / C
    x = (a * b) / c;
    formula = 'X = (A × B) ÷ C';
    formulaSubstituida = `X = (${a} × ${b}) ÷ ${c}`;
  }

  if (!Number.isFinite(x) || Number.isNaN(x)) {
    return {
      valido: false,
      erro: 'O resultado matemático é muito grande para ser calculado.'
    };
  }

  return {
    valido: true,
    mode,
    a,
    b,
    c,
    x,
    formula,
    formulaSubstituida
  };
}

/**
 * Formata os resultados numéricos para exibição em pt-BR.
 *
 * @param {Object} res
 * @returns {Object}
 */
export function formatRuleOfThreeResult(res = {}) {
  if (!res.valido) return res;

  const formatNum = n => {
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });
  };

  const aFmt = formatNum(res.a);
  const bFmt = formatNum(res.b);
  const cFmt = formatNum(res.c);
  const xFmt = formatNum(res.x);

  const substitutionFmt = res.mode === 'direct'
    ? `X = (${bFmt} × ${cFmt}) ÷ ${aFmt}`
    : `X = (${aFmt} × ${bFmt}) ÷ ${cFmt}`;

  return {
    ...res,
    aFmt,
    bFmt,
    cFmt,
    xFmt,
    modeLabel: res.mode === 'direct' ? 'Regra de Três Direta' : 'Regra de Três Inversa',
    substitutionFmt
  };
}

/**
 * Aliases para interoperabilidade com testes de conformidade Factory.
 */
export const normalizeInput = normalizeRuleOfThreeInput;
export const validateInput = validateRuleOfThreeInput;
export const calculate = calculateRuleOfThree;
export const formatResult = formatRuleOfThreeResult;

/**
 * Inicializa a interface da Calculadora de Regra de Três no DOM.
 */
export function setupRuleOfThree() {
  if (typeof document === 'undefined') return;

  const elA = document.getElementById('valorA');
  const elB = document.getElementById('valorB');
  const elC = document.getElementById('valorC');
  const elResultado = document.getElementById('resultado');
  const elStatus = document.getElementById('regraDeTresStatus');

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');
  const btnCopy = document.querySelector('[data-action="copy"]');
  const btnShare = document.querySelector('[data-action="share"]');
  const btnPrint = document.querySelector('[data-action="print"]');

  let ultimoResultado = null;

  function getSelectedMode() {
    const radioSelected = document.querySelector('input[name="modoRegra"]:checked');
    return radioSelected ? radioSelected.value : 'direct';
  }

  const actions = createResultActions({
    title: 'Calculadora de Regra de Três - Calculadora Master',
    statusTarget: elStatus || elResultado,
    getSections: () => {
      if (!ultimoResultado || !ultimoResultado.valido) return null;
      const fmt = formatRuleOfThreeResult(ultimoResultado);
      return [
        { label: 'Tipo', value: fmt.modeLabel },
        { label: 'Proporção', value: `${fmt.aFmt} está para ${fmt.bFmt}, assim como ${fmt.cFmt} está para X` },
        { label: 'Fórmula', value: fmt.formula },
        { label: 'Demonstração', value: fmt.substitutionFmt },
        { label: 'Valor de X', value: fmt.xFmt }
      ];
    }
  });

  function executarCalculo() {
    const rawInput = {
      a: elA ? elA.value : '',
      b: elB ? elB.value : '',
      c: elC ? elC.value : '',
      mode: getSelectedMode()
    };

    const res = calculateRuleOfThree(rawInput);
    ultimoResultado = res;

    if (!elResultado) return;

    if (!res.valido) {
      elResultado.innerHTML = `
        <div class="result-card error-card" role="alert" style="background:#fee; color:#c00; padding:16px; border-radius:8px; border:1px solid #fcc;">
          <strong>Atenção:</strong> ${res.erro}
        </div>
      `;
      return;
    }

    const fmt = formatRuleOfThreeResult(res);

    elResultado.innerHTML = `
      <div class="result-card" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:20px;">
        <div style="text-align:center; margin-bottom:16px; padding-bottom:14px; border-bottom:1px solid #e2e8f0;">
          <span style="display:block; font-size:0.85rem; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">
            Resultado (${fmt.modeLabel})
          </span>
          <div style="margin: 8px 0;">
            <span style="font-size:1.25rem; color:#64748b; margin-right:4px;">X =</span>
            <strong style="font-size:2.25rem; color:#0284c7;">${fmt.xFmt}</strong>
          </div>
          <span style="display:block; font-size:0.875rem; color:#475569; margin-top:4px;">
            ${fmt.aFmt} está para ${fmt.bFmt}, assim como ${fmt.cFmt} está para <strong>${fmt.xFmt}</strong>
          </span>
        </div>

        <div style="background:#fff; padding:14px; border-radius:6px; border:1px solid #edf2f7; margin-bottom:12px;">
          <span style="display:block; font-size:0.8rem; color:#64748b; margin-bottom:4px;">Fórmula Aplicada:</span>
          <code style="font-size:1rem; font-family:monospace; color:#1e293b; background:#f1f5f9; padding:2px 8px; border-radius:4px;">${fmt.formula}</code>
          <div style="margin-top:8px; font-size:0.9rem; color:#334155;">
            <span>Substituição dos valores:</span>
            <strong style="display:block; margin-top:2px; font-family:monospace;">${fmt.substitutionFmt} = ${fmt.xFmt}</strong>
          </div>
        </div>

        <p style="font-size:0.825rem; color:#64748b; margin:0; line-height:1.4;">
          ${res.mode === 'direct'
            ? '💡 <strong>Proporcionalidade Direta:</strong> ao aumentar uma grandeza, a outra aumenta na mesma proporção.'
            : '💡 <strong>Proporcionalidade Inversa:</strong> ao aumentar uma grandeza, a outra diminui na proporção inversa.'}
        </p>
      </div>
    `;
  }

  function limpar() {
    if (elA) elA.value = '';
    if (elB) elB.value = '';
    if (elC) elC.value = '';
    if (elResultado) elResultado.innerHTML = '';
    ultimoResultado = null;

    const radioDirect = document.querySelector('input[name="modoRegra"][value="direct"]');
    if (radioDirect) radioDirect.checked = true;
  }

  if (btnCalcular) btnCalcular.addEventListener('click', executarCalculo);
  if (btnLimpar) btnLimpar.addEventListener('click', limpar);

  if (btnCopy) btnCopy.addEventListener('click', () => actions.copy(btnCopy));
  if (btnShare) btnShare.addEventListener('click', () => actions.share(btnShare));
  if (btnPrint) btnPrint.addEventListener('click', () => actions.print(btnPrint));

  const inputs = [elA, elB, elC].filter(Boolean);
  inputs.forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executarCalculo();
      }
    });
  });

  const radios = document.querySelectorAll('input[name="modoRegra"]');
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (ultimoResultado) {
        executarCalculo();
      }
    });
  });
}

export const setupTool = setupRuleOfThree;

// Inicialização automática se carregado em ambiente de navegador
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupRuleOfThree);
  } else {
    setupRuleOfThree();
  }
}
