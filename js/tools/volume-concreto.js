/**
 * Calculadora de Volume de Concreto - Calculadora Master
 *
 * Estima a quantidade de concreto em metros cúbicos (m³) e litros para
 * lajes maciças, pisos/contrapisos, vigas retangulares, pilares retangulares
 * e pilares/estacas cilíndricos com seção constante, com margem de perdas
 * configurável entre 0% e 30% e memória de cálculo descritiva.
 */

import { createResultActions } from '../core/result-actions.js';

export const ELEMENT_TYPES = Object.freeze({
  LAJE: 'laje',
  PISO: 'piso',
  VIGA: 'viga',
  PILAR_RETANGULAR: 'pilar_retangular',
  PILAR_CIRCULAR: 'pilar_circular'
});

export const DEFAULTS = Object.freeze({
  tipoElemento: ELEMENT_TYPES.LAJE,
  quantidade: 1,
  margemPerda: 5 // valor inicial sugerido, editável de 0 a 30
});

export const LIMITS = Object.freeze({
  minDimensaoMetro: 0.01,
  maxDimensaoMetro: 1000,
  minDimensaoCm: 0.1,
  maxDimensaoCm: 10000,
  minQuantidade: 1,
  maxQuantidade: 10000,
  minMargemPerda: 0,
  maxMargemPerda: 30
});

export const CANONICAL_URL = 'https://www.calculadoramaster.com/tools/utilidades/volume-concreto.html';

export function parseDecimal(valor) {
  if (typeof valor === 'number') return valor;
  const texto = String(valor ?? '').trim().replace(',', '.');
  return texto === '' ? NaN : Number(texto);
}

export function parseFlexibleNumber(valor) {
  return parseDecimal(valor);
}

export function normalizeInput(input = {}) {
  const tipo = String(input.tipoElemento ?? DEFAULTS.tipoElemento).trim().toLowerCase();
  const margem = input.margemPerda === undefined || input.margemPerda === null || String(input.margemPerda).trim() === ''
    ? DEFAULTS.margemPerda
    : parseDecimal(input.margemPerda);

  const base = {
    tipoElemento: tipo,
    margemPerda: margem
  };

  if (tipo === ELEMENT_TYPES.LAJE || tipo === ELEMENT_TYPES.PISO) {
    return {
      ...base,
      quantidade: 1,
      comprimento: parseDecimal(input.comprimento),
      largura: parseDecimal(input.largura),
      espessura: parseDecimal(input.espessura)
    };
  }

  if (tipo === ELEMENT_TYPES.VIGA) {
    const qtdRaw = input.quantidade === undefined || input.quantidade === null || String(input.quantidade).trim() === ''
      ? 1
      : parseDecimal(input.quantidade);
    return {
      ...base,
      quantidade: qtdRaw,
      comprimento: parseDecimal(input.comprimento),
      largura: parseDecimal(input.largura),
      altura: parseDecimal(input.altura)
    };
  }

  if (tipo === ELEMENT_TYPES.PILAR_RETANGULAR) {
    const qtdRaw = input.quantidade === undefined || input.quantidade === null || String(input.quantidade).trim() === ''
      ? 1
      : parseDecimal(input.quantidade);
    return {
      ...base,
      quantidade: qtdRaw,
      lado1: parseDecimal(input.lado1),
      lado2: parseDecimal(input.lado2),
      altura: parseDecimal(input.altura)
    };
  }

  if (tipo === ELEMENT_TYPES.PILAR_CIRCULAR) {
    const qtdRaw = input.quantidade === undefined || input.quantidade === null || String(input.quantidade).trim() === ''
      ? 1
      : parseDecimal(input.quantidade);
    return {
      ...base,
      quantidade: qtdRaw,
      diametro: parseDecimal(input.diametro),
      altura: parseDecimal(input.altura)
    };
  }

  return base;
}

export function validateInput(p) {
  const tiposValidos = Object.values(ELEMENT_TYPES);
  if (!tiposValidos.includes(p.tipoElemento)) {
    return { valido: false, erro: 'Selecione um tipo de elemento estrutural válido.' };
  }

  if (!Number.isFinite(p.margemPerda) || p.margemPerda < LIMITS.minMargemPerda || p.margemPerda > LIMITS.maxMargemPerda) {
    return { valido: false, erro: 'A margem de perda deve ficar entre 0% e 30%.' };
  }

  const precisaQuantidade = [
    ELEMENT_TYPES.VIGA,
    ELEMENT_TYPES.PILAR_RETANGULAR,
    ELEMENT_TYPES.PILAR_CIRCULAR
  ].includes(p.tipoElemento);

  if (precisaQuantidade) {
    if (!Number.isFinite(p.quantidade) || !Number.isInteger(p.quantidade) || p.quantidade < LIMITS.minQuantidade) {
      return { valido: false, erro: 'A quantidade deve ser um número inteiro maior ou igual a 1.' };
    }
    if (p.quantidade > LIMITS.maxQuantidade) {
      return { valido: false, erro: 'A quantidade informada é muito grande.' };
    }
  }

  if (p.tipoElemento === ELEMENT_TYPES.LAJE || p.tipoElemento === ELEMENT_TYPES.PISO) {
    if (!Number.isFinite(p.comprimento) || p.comprimento < LIMITS.minDimensaoMetro) {
      return { valido: false, erro: 'Informe o comprimento com um valor maior que zero.' };
    }
    if (p.comprimento > LIMITS.maxDimensaoMetro) {
      return { valido: false, erro: 'O comprimento informado é excessivamente grande.' };
    }
    if (!Number.isFinite(p.largura) || p.largura < LIMITS.minDimensaoMetro) {
      return { valido: false, erro: 'Informe a largura com um valor maior que zero.' };
    }
    if (p.largura > LIMITS.maxDimensaoMetro) {
      return { valido: false, erro: 'A largura informada é excessivamente grande.' };
    }
    if (!Number.isFinite(p.espessura) || p.espessura < LIMITS.minDimensaoCm) {
      return { valido: false, erro: 'Informe a espessura com um valor maior que zero.' };
    }
    if (p.espessura > LIMITS.maxDimensaoCm) {
      return { valido: false, erro: 'A espessura informada é excessivamente grande.' };
    }
  } else if (p.tipoElemento === ELEMENT_TYPES.VIGA) {
    if (!Number.isFinite(p.comprimento) || p.comprimento < LIMITS.minDimensaoMetro) {
      return { valido: false, erro: 'Informe o comprimento com um valor maior que zero.' };
    }
    if (p.comprimento > LIMITS.maxDimensaoMetro) {
      return { valido: false, erro: 'O comprimento informado é excessivamente grande.' };
    }
    if (!Number.isFinite(p.largura) || p.largura < LIMITS.minDimensaoCm) {
      return { valido: false, erro: 'Informe a largura com um valor maior que zero.' };
    }
    if (p.largura > LIMITS.maxDimensaoCm) {
      return { valido: false, erro: 'A largura informada é excessivamente grande.' };
    }
    if (!Number.isFinite(p.altura) || p.altura < LIMITS.minDimensaoCm) {
      return { valido: false, erro: 'Informe a altura com um valor maior que zero.' };
    }
    if (p.altura > LIMITS.maxDimensaoCm) {
      return { valido: false, erro: 'A altura informada é excessivamente grande.' };
    }
  } else if (p.tipoElemento === ELEMENT_TYPES.PILAR_RETANGULAR) {
    if (!Number.isFinite(p.lado1) || p.lado1 < LIMITS.minDimensaoCm) {
      return { valido: false, erro: 'Informe o lado 1 com um valor maior que zero.' };
    }
    if (p.lado1 > LIMITS.maxDimensaoCm) {
      return { valido: false, erro: 'O lado 1 informado é excessivamente grande.' };
    }
    if (!Number.isFinite(p.lado2) || p.lado2 < LIMITS.minDimensaoCm) {
      return { valido: false, erro: 'Informe o lado 2 com um valor maior que zero.' };
    }
    if (p.lado2 > LIMITS.maxDimensaoCm) {
      return { valido: false, erro: 'O lado 2 informado é excessivamente grande.' };
    }
    if (!Number.isFinite(p.altura) || p.altura < LIMITS.minDimensaoMetro) {
      return { valido: false, erro: 'Informe a altura com um valor maior que zero.' };
    }
    if (p.altura > LIMITS.maxDimensaoMetro) {
      return { valido: false, erro: 'A altura informada é excessivamente grande.' };
    }
  } else if (p.tipoElemento === ELEMENT_TYPES.PILAR_CIRCULAR) {
    if (!Number.isFinite(p.diametro) || p.diametro < LIMITS.minDimensaoCm) {
      return { valido: false, erro: 'Informe o diâmetro com um valor maior que zero.' };
    }
    if (p.diametro > LIMITS.maxDimensaoCm) {
      return { valido: false, erro: 'O diâmetro informado é excessivamente grande.' };
    }
    if (!Number.isFinite(p.altura) || p.altura < LIMITS.minDimensaoMetro) {
      return { valido: false, erro: 'Informe a altura com um valor maior que zero.' };
    }
    if (p.altura > LIMITS.maxDimensaoMetro) {
      return { valido: false, erro: 'A altura informada é excessivamente grande.' };
    }
  }

  return { valido: true };
}

/**
 * Formata a memória de cálculo descritiva utilizando padrão brasileiro (pt-BR)
 * e arredondando apenas na camada de apresentação, sem resíduos de ponto flutuante.
 *
 * @param {Object} p Parâmetros normalizados de entrada
 * @param {number} volumeBase Volume nominal calculado com precisão integral
 * @returns {string} Memória de cálculo formatada
 */
export function formatMemoriaCalculo(p, volumeBase) {
  const formatoM3 = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });

  const fmtNum = (val) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
      }).format(val);
    }
    const num = parseDecimal(val);
    if (Number.isFinite(num)) {
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
      }).format(num);
    }
    return String(val ?? '');
  };

  const volumeBaseFmt = `${formatoM3.format(volumeBase)} m³`;
  const quantidade = p.quantidade ?? 1;

  if (p.tipoElemento === ELEMENT_TYPES.LAJE || p.tipoElemento === ELEMENT_TYPES.PISO) {
    const rotuloTipo = p.tipoElemento === ELEMENT_TYPES.LAJE ? 'Laje' : 'Piso/Contrapiso';
    return `${rotuloTipo}: ${fmtNum(p.comprimento)} m × ${fmtNum(p.largura)} m × (${fmtNum(p.espessura)} cm ÷ 100) = ${volumeBaseFmt}`;
  }

  if (p.tipoElemento === ELEMENT_TYPES.VIGA) {
    return quantidade > 1
      ? `${quantidade} vigas × [${fmtNum(p.comprimento)} m × (${fmtNum(p.largura)} cm ÷ 100) × (${fmtNum(p.altura)} cm ÷ 100)] = ${volumeBaseFmt}`
      : `1 viga: ${fmtNum(p.comprimento)} m × (${fmtNum(p.largura)} cm ÷ 100) × (${fmtNum(p.altura)} cm ÷ 100) = ${volumeBaseFmt}`;
  }

  if (p.tipoElemento === ELEMENT_TYPES.PILAR_RETANGULAR) {
    return quantidade > 1
      ? `${quantidade} pilares × [(${fmtNum(p.lado1)} cm ÷ 100) × (${fmtNum(p.lado2)} cm ÷ 100) × ${fmtNum(p.altura)} m] = ${volumeBaseFmt}`
      : `1 pilar: (${fmtNum(p.lado1)} cm ÷ 100) × (${fmtNum(p.lado2)} cm ÷ 100) × ${fmtNum(p.altura)} m = ${volumeBaseFmt}`;
  }

  if (p.tipoElemento === ELEMENT_TYPES.PILAR_CIRCULAR) {
    return quantidade > 1
      ? `${quantidade} peças × [π × (${fmtNum(p.diametro)} cm ÷ 200)² × ${fmtNum(p.altura)} m] = ${volumeBaseFmt}`
      : `1 peça cilíndrica: π × (${fmtNum(p.diametro)} cm ÷ 200)² × ${fmtNum(p.altura)} m = ${volumeBaseFmt}`;
  }

  return '';
}

export function calculate(input = {}) {
  const p = normalizeInput(input);
  const validacao = validateInput(p);

  if (!validacao.valido) {
    return { valido: false, erro: validacao.erro };
  }

  let volumeBase = 0;
  const quantidade = p.quantidade ?? 1;

  if (p.tipoElemento === ELEMENT_TYPES.LAJE || p.tipoElemento === ELEMENT_TYPES.PISO) {
    const espessuraMetros = p.espessura / 100;
    volumeBase = p.comprimento * p.largura * espessuraMetros;
  } else if (p.tipoElemento === ELEMENT_TYPES.VIGA) {
    const larguraMetros = p.largura / 100;
    const alturaMetros = p.altura / 100;
    const volumeUnitario = p.comprimento * larguraMetros * alturaMetros;
    volumeBase = quantidade * volumeUnitario;
  } else if (p.tipoElemento === ELEMENT_TYPES.PILAR_RETANGULAR) {
    const lado1Metros = p.lado1 / 100;
    const lado2Metros = p.lado2 / 100;
    const volumeUnitario = lado1Metros * lado2Metros * p.altura;
    volumeBase = quantidade * volumeUnitario;
  } else if (p.tipoElemento === ELEMENT_TYPES.PILAR_CIRCULAR) {
    const raioMetros = p.diametro / 200;
    const volumeUnitario = Math.PI * (raioMetros ** 2) * p.altura;
    volumeBase = quantidade * volumeUnitario;
  }

  const memoriaCalculo = formatMemoriaCalculo(p, volumeBase);

  // Manter precisão total durante os cálculos:
  const volumePerda = volumeBase * (p.margemPerda / 100);
  const volumeTotal = volumeBase + volumePerda;
  const volumeLitros = volumeTotal * 1000;

  const avisos = [
    'A ferramenta calcula estimativas geométricas, não substitui projeto estrutural, especificação de fck ou dimensionamento de armaduras.',
    'A calculadora não desconta interseções ou sobreposições entre lajes, vigas e pilares.',
    'A margem inicial de 5% é apenas uma sugestão configurável, não uma recomendação técnica universal.'
  ];

  if (p.tipoElemento === ELEMENT_TYPES.PILAR_CIRCULAR) {
    avisos.push('Elementos cilíndricos são considerados de seção constante, sem bases alargadas, bulbos ou variações de diâmetro.');
  }

  return {
    valido: true,
    tipoElemento: p.tipoElemento,
    quantidade,
    dimensoes: { ...p },
    volumeBase,
    margemPerda: p.margemPerda,
    volumePerda,
    volumeTotal,
    volumeLitros,
    memoriaCalculo,
    avisos
  };
}

export function formatResult(r) {
  if (!r || !r.valido) return r?.erro || 'Não foi possível realizar o cálculo.';

  const formatoM3 = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });

  const formatoLitros = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });

  const formatoPercentual = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });

  const nomesTipos = {
    [ELEMENT_TYPES.LAJE]: 'Laje maciça',
    [ELEMENT_TYPES.PISO]: 'Piso / Contrapiso / Radier',
    [ELEMENT_TYPES.VIGA]: 'Viga retangular',
    [ELEMENT_TYPES.PILAR_RETANGULAR]: 'Pilar retangular ou quadrado',
    [ELEMENT_TYPES.PILAR_CIRCULAR]: 'Pilar circular / Estaca cilíndrica'
  };

  const linhas = [
    'Calculadora de Volume de Concreto — Calculadora Master',
    `Estrutura: ${nomesTipos[r.tipoElemento] || r.tipoElemento}`,
    `Quantidade: ${r.quantidade}`,
    `Volume base nominal: ${formatoM3.format(r.volumeBase)} m³`,
    `Margem de perdas: ${formatoPercentual.format(r.margemPerda)}% (${formatoM3.format(r.volumePerda)} m³)`,
    `Volume total estimado: ${formatoM3.format(r.volumeTotal)} m³`,
    `Volume em litros: ${formatoLitros.format(r.volumeLitros)} L`,
    '',
    `Memória de cálculo: ${r.memoriaCalculo}`,
    '',
    'Avisos importantes:'
  ];

  r.avisos.forEach(aviso => linhas.push(`- ${aviso}`));

  return linhas.join('\n');
}

/**
 * Constrói a lista de seções estruturadas para o createResultActions (Copiar e Compartilhar).
 *
 * @param {ReturnType<typeof calculate>} r
 * @returns {Array<{label: string, value: string|number}>}
 */
export function getResultSections(r) {
  if (!r || !r.valido) return [];

  const formatoM3 = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });

  const formatoLitros = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });

  const formatoPercentual = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });

  const nomesTipos = {
    [ELEMENT_TYPES.LAJE]: 'Laje maciça',
    [ELEMENT_TYPES.PISO]: 'Piso / Contrapiso / Radier',
    [ELEMENT_TYPES.VIGA]: 'Viga retangular',
    [ELEMENT_TYPES.PILAR_RETANGULAR]: 'Pilar retangular ou quadrado',
    [ELEMENT_TYPES.PILAR_CIRCULAR]: 'Pilar circular / Estaca cilíndrica'
  };

  const sections = [
    { label: 'Estrutura', value: nomesTipos[r.tipoElemento] || r.tipoElemento },
    { label: 'Quantidade', value: String(r.quantidade) },
    { label: 'Volume base nominal', value: `${formatoM3.format(r.volumeBase)} m³` },
    { label: 'Margem de perdas', value: `${formatoPercentual.format(r.margemPerda)}% (${formatoM3.format(r.volumePerda)} m³)` },
    { label: 'Volume total estimado', value: `${formatoM3.format(r.volumeTotal)} m³` },
    { label: 'Volume em litros', value: `${formatoLitros.format(r.volumeLitros)} L` },
    { label: 'Memória de cálculo', value: r.memoriaCalculo }
  ];

  if (Array.isArray(r.avisos) && r.avisos.length > 0) {
    r.avisos.forEach(aviso => {
      sections.push({ label: 'Aviso importante', value: aviso });
    });
  }

  return sections;
}

export function setupTool(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root) return null;

  const campo = (id) => (root.getElementById ? root.getElementById(id) : root.querySelector?.(`#${id}`));

  const form = campo('formVolumeConcreto');
  if (!form) return null;

  if (form.dataset?.toolInitialized === 'true' || form._toolInitialized) {
    return form._toolInstance || null;
  }
  if (form.dataset) {
    form.dataset.toolInitialized = 'true';
  }
  form._toolInitialized = true;

  const selectTipo = campo('tipoElemento');
  const inputMargem = campo('margemPerda');

  const containerLaje = campo('camposLajePiso');
  const containerViga = campo('camposViga');
  const containerPilarRet = campo('camposPilarRetangular');
  const containerPilarCirc = campo('camposPilarCircular');

  const painelResultado = campo('resultadoVolumeConcreto');
  const containerErro = campo('erroVolumeConcreto');
  const statusAcoes = campo('statusVolumeConcreto');

  const btnLimpar = campo('limparVolumeConcreto');
  const btnCopiar = campo('copiarVolumeConcreto');
  const btnCompartilhar = campo('compartilharVolumeConcreto');
  const btnImprimir = campo('imprimirVolumeConcreto');

  const saidaVolumeTotal = campo('saidaVolumeTotal');
  const saidaVolumeLitros = campo('saidaVolumeLitros');
  const saidaVolumeBase = campo('saidaVolumeBase');
  const saidaVolumePerda = campo('saidaVolumePerda');
  const saidaMemoria = campo('saidaMemoriaCalculo');
  const listaAvisos = campo('listaAvisosTecnicos');

  let ultimoResultado = null;

  function invalidarResultado() {
    ultimoResultado = null;
    if (painelResultado) painelResultado.hidden = true;
    if (containerErro) {
      containerErro.hidden = true;
      containerErro.textContent = '';
    }
    if (statusAcoes) {
      statusAcoes.textContent = '';
    }
  }

  function atualizarVisibilidadeCampos() {
    const tipo = selectTipo ? selectTipo.value : DEFAULTS.tipoElemento;

    const mostrar = (el, cond) => {
      if (!el) return;
      el.hidden = !cond;
    };

    mostrar(containerLaje, tipo === ELEMENT_TYPES.LAJE || tipo === ELEMENT_TYPES.PISO);
    mostrar(containerViga, tipo === ELEMENT_TYPES.VIGA);
    mostrar(containerPilarRet, tipo === ELEMENT_TYPES.PILAR_RETANGULAR);
    mostrar(containerPilarCirc, tipo === ELEMENT_TYPES.PILAR_CIRCULAR);
  }

  selectTipo?.addEventListener('change', () => {
    atualizarVisibilidadeCampos();
    invalidarResultado();
  });

  function onFormInput(e) {
    if (e && e.target && (e.target.tagName === 'BUTTON' || e.target.type === 'button' || e.target.type === 'submit')) {
      return;
    }
    invalidarResultado();
  }

  if (typeof form.addEventListener === 'function') {
    form.addEventListener('input', onFormInput);
    form.addEventListener('change', onFormInput);
  }

  const actions = createResultActions({
    title: 'Calculadora de Volume de Concreto — Calculadora Master',
    statusElement: statusAcoes,
    getSections: () => (ultimoResultado && ultimoResultado.valido ? getResultSections(ultimoResultado) : [])
  });

  if (btnCopiar) {
    btnCopiar.addEventListener('click', async () => {
      if (!ultimoResultado || !ultimoResultado.valido) return;
      await actions.copy();
    });
  }

  if (btnCompartilhar) {
    btnCompartilhar.addEventListener('click', async () => {
      if (!ultimoResultado || !ultimoResultado.valido) return;
      await actions.share(CANONICAL_URL);
    });
  }

  if (btnImprimir) {
    btnImprimir.addEventListener('click', () => {
      if (!ultimoResultado || !ultimoResultado.valido) return;
      actions.print();
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (statusAcoes) {
      statusAcoes.textContent = '';
    }

    const tipo = selectTipo.value;
    const margem = inputMargem.value;

    let payload = {
      tipoElemento: tipo,
      margemPerda: margem
    };

    if (tipo === ELEMENT_TYPES.LAJE || tipo === ELEMENT_TYPES.PISO) {
      payload.comprimento = campo('comprimentoLaje')?.value;
      payload.largura = campo('larguraLaje')?.value;
      payload.espessura = campo('espessuraLaje')?.value;
    } else if (tipo === ELEMENT_TYPES.VIGA) {
      payload.quantidade = campo('quantidadeViga')?.value;
      payload.comprimento = campo('comprimentoViga')?.value;
      payload.largura = campo('larguraViga')?.value;
      payload.altura = campo('alturaViga')?.value;
    } else if (tipo === ELEMENT_TYPES.PILAR_RETANGULAR) {
      payload.quantidade = campo('quantidadePilarRet')?.value;
      payload.lado1 = campo('lado1PilarRet')?.value;
      payload.lado2 = campo('lado2PilarRet')?.value;
      payload.altura = campo('alturaPilarRet')?.value;
    } else if (tipo === ELEMENT_TYPES.PILAR_CIRCULAR) {
      payload.quantidade = campo('quantidadePilarCirc')?.value;
      payload.diametro = campo('diametroPilarCirc')?.value;
      payload.altura = campo('alturaPilarCirc')?.value;
    }

    const resultado = calculate(payload);
    ultimoResultado = resultado;

    if (!resultado.valido) {
      if (painelResultado) painelResultado.hidden = true;
      if (containerErro) {
        containerErro.textContent = resultado.erro;
        containerErro.hidden = false;
      }
      return;
    }

    if (containerErro) {
      containerErro.hidden = true;
      containerErro.textContent = '';
    }

    const formatoM3 = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    });

    const formatoLitros = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    });

    const formatoPercentual = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    });

    if (saidaVolumeTotal) saidaVolumeTotal.textContent = `${formatoM3.format(resultado.volumeTotal)} m³`;
    if (saidaVolumeLitros) saidaVolumeLitros.textContent = `${formatoLitros.format(resultado.volumeLitros)} L`;
    if (saidaVolumeBase) saidaVolumeBase.textContent = `${formatoM3.format(resultado.volumeBase)} m³`;
    if (saidaVolumePerda) saidaVolumePerda.textContent = `${formatoM3.format(resultado.volumePerda)} m³ (${formatoPercentual.format(resultado.margemPerda)}%)`;
    if (saidaMemoria) saidaMemoria.textContent = resultado.memoriaCalculo;

    if (listaAvisos) {
      listaAvisos.textContent = '';
      resultado.avisos.forEach(aviso => {
        const li = root.createElement ? root.createElement('li') : document.createElement('li');
        li.textContent = aviso;
        listaAvisos.appendChild(li);
      });
    }

    if (painelResultado) {
      painelResultado.hidden = false;
      if (typeof painelResultado.scrollIntoView === 'function') {
        painelResultado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });

  btnLimpar?.addEventListener('click', () => {
    form.reset();
    if (selectTipo) selectTipo.value = DEFAULTS.tipoElemento;
    if (inputMargem) inputMargem.value = String(DEFAULTS.margemPerda);
    atualizarVisibilidadeCampos();
    invalidarResultado();
  });

  atualizarVisibilidadeCampos();

  const instance = {
    form,
    actions,
    getUltimoResultado: () => ultimoResultado,
    invalidarResultado
  };
  form._toolInstance = instance;
  return instance;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupTool());
  } else {
    setupTool();
  }
}
