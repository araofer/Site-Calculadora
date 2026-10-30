/**
 * Conversor de Unidades - Calculadora Master
 *
 * Módulo puro, de alta precisão, desacoplado e seguro para SSR.
 * Suporta conversões entre 6 categorias físicas:
 * 1. Comprimento (km, m, cm, mm, mi, yd, ft, in)
 * 2. Massa / Peso (t, kg, g, mg, lb, oz)
 * 3. Temperatura (°C, °F, K com fórmulas dedicadas e limite de zero absoluto)
 * 4. Área (km², ha, m², cm², mm², ft², ac)
 * 5. Volume (m³, L, mL, cm³, galão US, quarto US, xícara US com rotulagem inequívoca)
 * 6. Velocidade (m/s, km/h, mph, ft/s, kn)
 */

import { createResultActions, formatResultText } from '../core/result-actions.js';

export const CATEGORIES = Object.freeze({
  comprimento: {
    id: 'comprimento',
    name: 'Comprimento',
    baseUnit: 'm',
    allowNegative: false,
    units: Object.freeze({
      km: { id: 'km', name: 'Quilômetro (km)', symbol: 'km', factor: 1000 },
      m: { id: 'm', name: 'Metro (m)', symbol: 'm', factor: 1 },
      cm: { id: 'cm', name: 'Centímetro (cm)', symbol: 'cm', factor: 0.01 },
      mm: { id: 'mm', name: 'Milímetro (mm)', symbol: 'mm', factor: 0.001 },
      mi: { id: 'mi', name: 'Milha internacional (mi)', symbol: 'mi', factor: 1609.344 },
      yd: { id: 'yd', name: 'Jarda (yd)', symbol: 'yd', factor: 0.9144 },
      ft: { id: 'ft', name: 'Pé (ft)', symbol: 'ft', factor: 0.3048 },
      in: { id: 'in', name: 'Polegada (in)', symbol: 'in', factor: 0.0254 }
    })
  },
  massa: {
    id: 'massa',
    name: 'Massa (peso)',
    baseUnit: 'kg',
    allowNegative: false,
    units: Object.freeze({
      t: { id: 't', name: 'Tonelada métrica (t)', symbol: 't', factor: 1000 },
      kg: { id: 'kg', name: 'Quilograma (kg)', symbol: 'kg', factor: 1 },
      g: { id: 'g', name: 'Grama (g)', symbol: 'g', factor: 0.001 },
      mg: { id: 'mg', name: 'Miligrama (mg)', symbol: 'mg', factor: 0.000001 },
      lb: { id: 'lb', name: 'Libra internacional (lb)', symbol: 'lb', factor: 0.45359237 },
      oz: { id: 'oz', name: 'Onça internacional (oz)', symbol: 'oz', factor: 0.028349523125 }
    })
  },
  temperatura: {
    id: 'temperatura',
    name: 'Temperatura',
    baseUnit: 'c',
    allowNegative: true,
    units: Object.freeze({
      c: { id: 'c', name: 'Grau Celsius (°C)', symbol: '°C', min: -273.15 },
      f: { id: 'f', name: 'Grau Fahrenheit (°F)', symbol: '°F', min: -459.67 },
      k: { id: 'k', name: 'Kelvin (K)', symbol: 'K', min: 0 }
    })
  },
  area: {
    id: 'area',
    name: 'Área',
    baseUnit: 'm2',
    allowNegative: false,
    units: Object.freeze({
      km2: { id: 'km2', name: 'Quilômetro quadrado (km²)', symbol: 'km²', factor: 1000000 },
      ha: { id: 'ha', name: 'Hectare (ha)', symbol: 'ha', factor: 10000 },
      m2: { id: 'm2', name: 'Metro quadrado (m²)', symbol: 'm²', factor: 1 },
      cm2: { id: 'cm2', name: 'Centímetro quadrado (cm²)', symbol: 'cm²', factor: 0.0001 },
      mm2: { id: 'mm2', name: 'Milímetro quadrado (mm²)', symbol: 'mm²', factor: 0.000001 },
      ft2: { id: 'ft2', name: 'Pé quadrado (ft²)', symbol: 'ft²', factor: 0.09290304 },
      ac: { id: 'ac', name: 'Acre internacional (ac)', symbol: 'ac', factor: 4046.8564224 }
    })
  },
  volume: {
    id: 'volume',
    name: 'Volume',
    baseUnit: 'l',
    allowNegative: false,
    units: Object.freeze({
      m3: { id: 'm3', name: 'Metro cúbico (m³)', symbol: 'm³', factor: 1000 },
      l: { id: 'l', name: 'Litro (L)', symbol: 'L', factor: 1 },
      ml: { id: 'ml', name: 'Mililitro (mL)', symbol: 'mL', factor: 0.001 },
      cm3: { id: 'cm3', name: 'Centímetro cúbico (cm³)', symbol: 'cm³', factor: 0.001 },
      us_gal: { id: 'us_gal', name: 'Galão líquido americano (US gal)', symbol: 'US gal', factor: 3.785411784 },
      us_qt: { id: 'us_qt', name: 'Quarto líquido americano (US qt)', symbol: 'US qt', factor: 0.946352946 },
      us_cup: { id: 'us_cup', name: 'Xícara americana (US cup)', symbol: 'US cup', factor: 0.2365882365 }
    })
  },
  velocidade: {
    id: 'velocidade',
    name: 'Velocidade',
    baseUnit: 'm_s',
    allowNegative: false,
    units: Object.freeze({
      m_s: { id: 'm_s', name: 'Metro por segundo (m/s)', symbol: 'm/s', factor: 1 },
      km_h: { id: 'km_h', name: 'Quilômetro por hora (km/h)', symbol: 'km/h', factor: 1 / 3.6 },
      mph: { id: 'mph', name: 'Milha por hora (mph)', symbol: 'mph', factor: 0.44704 },
      ft_s: { id: 'ft_s', name: 'Pé por segundo (ft/s)', symbol: 'ft/s', factor: 0.3048 },
      kn: { id: 'kn', name: 'Nó internacional (kn)', symbol: 'kn', factor: 1852 / 3600 }
    })
  }
});

/**
 * Converte entradas de texto em número, suportando separadores do Brasil e do SI.
 *
 * @param {unknown} value
 * @returns {number|null} null se em branco, NaN se inválido
 */
export function parseFlexibleNumber(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  let str = String(value).trim();
  if (!str) return null;

  // Remove espaços extras e símbolos usuais
  str = str.replace(/\s+/g, '');

  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Padrão pt-BR: 1.000,50
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão en-US: 1,000.50
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(str)) {
    return Number.NaN;
  }

  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Formata um número no padrão pt-BR preservando a precisão útil sem ruídos de float.
 *
 * @param {number} num
 * @param {number} maxDecimals
 * @returns {string}
 */
export function formatUnitNumber(num, maxDecimals = 10) {
  if (typeof num !== 'number' || !Number.isFinite(num)) {
    return '';
  }
  if (num === 0) return '0';

  const abs = Math.abs(num);

  // Números extremamente grandes ou microscópicos utilizam notação científica clara
  if (abs >= 1e15 || (abs < 1e-7 && abs > 0)) {
    return num.toExponential(6).replace('.', ',');
  }

  // Arredonda pequenas imprecisões binárias preservando até maxDecimals
  const rounded = Number(Math.round(Number(num + 'e+' + maxDecimals)) + 'e-' + maxDecimals);

  const parts = rounded.toString().split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';

  const integerFormatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decimalPart) {
    const trimmedDecimal = decimalPart.replace(/0+$/, '');
    if (trimmedDecimal) {
      return `${integerFormatted},${trimmedDecimal}`;
    }
  }

  return integerFormatted;
}

/**
 * Realiza a conversão de temperatura com fórmulas dedicadas.
 *
 * @param {number} value
 * @param {string} fromUnit
 * @param {string} toUnit
 * @returns {{ result: number, formula: string }}
 */
function convertTemperature(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) {
    return {
      result: value,
      formula: 'Mesma unidade selecionada (sem alteração necessária).'
    };
  }

  // 1. Converte origem para Celsius base
  let celsius;
  let formulaFrom = '';
  if (fromUnit === 'c') {
    celsius = value;
  } else if (fromUnit === 'f') {
    celsius = (value - 32) * (5 / 9);
    formulaFrom = `°C = (${value} - 32) × 5/9`;
  } else if (fromUnit === 'k') {
    celsius = value - 273.15;
    formulaFrom = `°C = ${value} - 273,15`;
  }

  // 2. Converte Celsius base para destino
  let result;
  let formulaTo = '';
  if (toUnit === 'c') {
    result = celsius;
    formulaTo = formulaFrom || '°C = T';
  } else if (toUnit === 'f') {
    result = (celsius * (9 / 5)) + 32;
    formulaTo = `°F = (${formatUnitNumber(celsius, 4)} × 9/5) + 32`;
  } else if (toUnit === 'k') {
    result = celsius + 273.15;
    formulaTo = `K = ${formatUnitNumber(celsius, 4)} + 273,15`;
  }

  return {
    result,
    formula: formulaTo
  };
}

/**
 * Executa o cálculo puro de conversão de unidades.
 *
 * @param {Object} params
 * @param {string} params.category
 * @param {string|number} params.value
 * @param {string} params.fromUnit
 * @param {string} params.toUnit
 * @returns {{ ok: boolean, data?: Object, errors: string[] }}
 */
export function convertUnits({ category, value, fromUnit, toUnit }) {
  const errors = [];

  const catConfig = CATEGORIES[category];
  if (!catConfig) {
    return {
      ok: false,
      errors: ['Categoria de medida inválida ou não selecionada.']
    };
  }

  const parsedVal = parseFlexibleNumber(value);
  if (parsedVal === null) {
    return {
      ok: false,
      errors: ['Por favor, informe o valor a ser convertido.']
    };
  }

  if (Number.isNaN(parsedVal)) {
    return {
      ok: false,
      errors: ['Informe um valor numérico válido para a conversão.']
    };
  }

  if (!Number.isFinite(parsedVal) || Math.abs(parsedVal) > 1e20) {
    return {
      ok: false,
      errors: ['O valor informado excede os limites de cálculo suportados.']
    };
  }

  const unitFromConfig = catConfig.units[fromUnit];
  const unitToConfig = catConfig.units[toUnit];

  if (!unitFromConfig || !unitToConfig) {
    return {
      ok: false,
      errors: ['Selecione unidades de origem e destino válidas para esta categoria.']
    };
  }

  // Validação de grandezas estritamente não-negativas
  if (!catConfig.allowNegative && parsedVal < 0) {
    return {
      ok: false,
      errors: [`O valor de ${catConfig.name.toLowerCase()} não pode ser negativo.`]
    };
  }

  // Validação física de zero absoluto para temperatura
  if (category === 'temperatura') {
    if (unitFromConfig.min !== undefined && parsedVal < unitFromConfig.min) {
      return {
        ok: false,
        errors: ['A temperatura informada está abaixo do zero absoluto (-273,15 °C, -459,67 °F ou 0 K).']
      };
    }
  }

  let resultValue;
  let formulaDescription = '';

  if (category === 'temperatura') {
    const tempConversion = convertTemperature(parsedVal, fromUnit, toUnit);
    resultValue = tempConversion.result;
    formulaDescription = tempConversion.formula;
  } else {
    if (fromUnit === toUnit) {
      resultValue = parsedVal;
      formulaDescription = `Mesma unidade (${unitFromConfig.symbol}): o valor não se altera.`;
    } else {
      // Conversão direta ou via unidade-base SI
      const baseValue = parsedVal * unitFromConfig.factor;
      resultValue = baseValue / unitToConfig.factor;

      if (Math.abs(resultValue - Math.round(resultValue)) < 1e-12) {
        resultValue = Math.round(resultValue);
      }

      const factorRatio = unitFromConfig.factor / unitToConfig.factor;
      formulaDescription = `1 ${unitFromConfig.symbol} = ${formatUnitNumber(factorRatio, 8)} ${unitToConfig.symbol}`;
    }
  }

  if (!Number.isFinite(resultValue) || Number.isNaN(resultValue)) {
    return {
      ok: false,
      errors: ['Erro no cálculo da conversão de unidades. Verifique os valores informados.']
    };
  }

  const formattedOrigin = formatUnitNumber(parsedVal, 10);
  const formattedResult = formatUnitNumber(resultValue, 10);

  return {
    ok: true,
    data: {
      category: catConfig.id,
      categoryName: catConfig.name,
      rawValue: parsedVal,
      resultValue,
      formattedOrigin,
      formattedResult,
      fromUnit,
      toUnit,
      fromName: unitFromConfig.name,
      toName: unitToConfig.name,
      fromSymbol: unitFromConfig.symbol,
      toSymbol: unitToConfig.symbol,
      formulaDescription,
      displaySummary: `${formattedOrigin} ${unitFromConfig.symbol} = ${formattedResult} ${unitToConfig.symbol}`
    },
    errors: []
  };
}

/**
 * Conecta os eventos da interface com os módulos de cálculo e ações compartilhadas.
 *
 * @param {Document} doc
 */
export function setupTool(doc) {
  if (!doc) return null;

  const form = doc.getElementById('formConversorUnidades');
  if (!form) return null;

  const selectCategoria = doc.getElementById('categoriaConversor');
  const inputValor = doc.getElementById('valorOrigem');
  const selectOrigem = doc.getElementById('unidadeOrigem');
  const selectDestino = doc.getElementById('unidadeDestino');
  const btnInverter = doc.getElementById('btnInverter');
  const btnLimpar = doc.getElementById('btnLimpar');

  const erroEl = doc.getElementById('erroConversor');
  const resultadoSection = doc.getElementById('resultadoConversor');
  const valorConvertidoEl = doc.getElementById('valorConvertidoResultado');
  const detalheConversaoEl = doc.getElementById('detalheConversaoResultado');
  const formulaConversaoEl = doc.getElementById('formulaConversaoResultado');

  const btnCopiar = doc.getElementById('btnCopiar');
  const btnCompartilhar = doc.getElementById('btnCompartilhar');
  const btnImprimir = doc.getElementById('btnImprimir');
  const statusEl = doc.getElementById('statusConversor');

  let ultimoResultado = null;

  const actions = createResultActions({
    title: 'Conversor de Unidades',
    statusElement: statusEl,
    formatSummary: () => {
      if (!ultimoResultado) return '';
      return formatResultText('Conversor de Unidades - Calculadora Master', [
        { label: 'Categoria', value: ultimoResultado.categoryName },
        { label: 'Conversão', value: ultimoResultado.displaySummary },
        { label: 'Relação/Fórmula', value: ultimoResultado.formulaDescription }
      ]);
    }
  });

  function showError(msg) {
    if (erroEl) {
      erroEl.textContent = msg;
      erroEl.hidden = false;
    }
    if (resultadoSection) {
      resultadoSection.hidden = true;
    }
    setActionButtonsVisibility(false);
  }

  function clearError() {
    if (erroEl) {
      erroEl.textContent = '';
      erroEl.hidden = true;
    }
  }

  function setActionButtonsVisibility(visible) {
    if (btnCopiar) btnCopiar.hidden = !visible;
    if (btnCompartilhar) btnCompartilhar.hidden = !visible;
    if (btnImprimir) btnImprimir.hidden = !visible;
  }

  function populateUnitSelects(categoryId, preferFrom = null, preferTo = null) {
    const cat = CATEGORIES[categoryId];
    if (!cat || !selectOrigem || !selectDestino) return;

    selectOrigem.innerHTML = '';
    selectDestino.innerHTML = '';

    const unitKeys = Object.keys(cat.units);

    unitKeys.forEach((key) => {
      const u = cat.units[key];
      const optFrom = doc.createElement('option');
      optFrom.value = u.id;
      optFrom.textContent = u.name;
      selectOrigem.appendChild(optFrom);

      const optTo = doc.createElement('option');
      optTo.value = u.id;
      optTo.textContent = u.name;
      selectDestino.appendChild(optTo);
    });

    if (preferFrom && cat.units[preferFrom]) {
      selectOrigem.value = preferFrom;
    } else {
      selectOrigem.value = unitKeys[0] || '';
    }

    if (preferTo && cat.units[preferTo]) {
      selectDestino.value = preferTo;
    } else {
      selectDestino.value = unitKeys.length > 1 ? unitKeys[1] : unitKeys[0];
    }
  }

  function renderResult(calcData) {
    ultimoResultado = calcData;
    clearError();

    if (valorConvertidoEl) {
      valorConvertidoEl.textContent = `${calcData.formattedResult} ${calcData.toSymbol}`;
    }

    if (detalheConversaoEl) {
      detalheConversaoEl.textContent = `${calcData.formattedOrigin} ${calcData.fromName} é igual a:`;
    }

    if (formulaConversaoEl) {
      formulaConversaoEl.textContent = calcData.formulaDescription;
    }

    if (resultadoSection) {
      resultadoSection.hidden = false;
    }

    setActionButtonsVisibility(true);
  }

  function executeCalculation() {
    const rawCategory = (selectCategoria && selectCategoria.value) ? selectCategoria.value : 'comprimento';
    const rawValue = inputValor ? inputValor.value : '';
    const rawFrom = selectOrigem ? selectOrigem.value : '';
    const rawTo = selectDestino ? selectDestino.value : '';

    const calculation = convertUnits({
      category: rawCategory,
      value: rawValue,
      fromUnit: rawFrom,
      toUnit: rawTo
    });

    if (!calculation.ok) {
      showError(calculation.errors[0]);
      return false;
    }

    renderResult(calculation.data);
    return true;
  }

  // Eventos de alteração de categoria
  if (selectCategoria) {
    selectCategoria.addEventListener('change', () => {
      clearError();
      populateUnitSelects(selectCategoria.value);
      if (resultadoSection) {
        resultadoSection.hidden = true;
      }
      setActionButtonsVisibility(false);
      ultimoResultado = null;
    });
  }

  // Evento do botão inverter
  if (btnInverter) {
    btnInverter.addEventListener('click', () => {
      if (!selectOrigem || !selectDestino) return;
      const currentFrom = selectOrigem.value;
      const currentTo = selectDestino.value;

      selectOrigem.value = currentTo;
      selectDestino.value = currentFrom;

      if (ultimoResultado) {
        executeCalculation();
      }
    });
  }

  // Submit do formulário
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    executeCalculation();
  });

  // Limpar formulário
  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      form.reset();
      clearError();
      if (selectCategoria) {
        selectCategoria.value = 'comprimento';
        populateUnitSelects('comprimento');
      }
      ultimoResultado = null;
      if (resultadoSection) {
        resultadoSection.hidden = true;
      }
      setActionButtonsVisibility(false);
      if (statusEl) {
        statusEl.textContent = '';
      }
    });
  }

  // Ações de resultado
  if (btnCopiar) {
    btnCopiar.addEventListener('click', async () => {
      if (!ultimoResultado) return;
      await actions.copy();
    });
  }

  if (btnCompartilhar) {
    btnCompartilhar.addEventListener('click', async () => {
      if (!ultimoResultado) return;
      const shareUrl =
        typeof window !== 'undefined' && window.location?.origin
          ? `${window.location.origin}/tools/utilidades/conversor-unidades.html`
          : 'https://www.calculadoramaster.com/tools/utilidades/conversor-unidades.html';
      await actions.share(shareUrl);
    });
  }

  if (btnImprimir) {
    btnImprimir.addEventListener('click', () => {
      if (!ultimoResultado) return;
      actions.print();
    });
  }

  // Inicializa selects de unidade com a categoria atual
  const initialCategory = (selectCategoria && selectCategoria.value) ? selectCategoria.value : 'comprimento';
  populateUnitSelects(initialCategory);

  return { form, actions, executeCalculation };
}

if (typeof document !== 'undefined') {
  if (docReady(document)) {
    setupTool(document);
  } else {
    document.addEventListener('DOMContentLoaded', () => setupTool(document));
  }
}

function docReady(d) {
  return d.readyState === 'complete' || d.readyState === 'interactive';
}
