import { createResultActions } from '../core/result-actions.js';

const MODOS_VALIDOS = new Set(['analisar', 'margem', 'markup']);

function arredondar(valor) {
  if (!Number.isFinite(valor)) return valor;
  if (Math.abs(valor) >= 1e15) return valor;
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function parseValorMonetario(entrada) {
  if (typeof entrada === 'number') return entrada;

  let texto = String(entrada ?? '')
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '');

  if (!texto) return NaN;

  if (texto.includes(',')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, '');
  }

  return Number(texto);
}

export function parsePercentual(entrada) {
  if (typeof entrada === 'number') return entrada;

  const texto = String(entrada ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/%$/, '')
    .replace(',', '.');

  return texto ? Number(texto) : NaN;
}

export function normalizeInput(rawInput = {}) {
  const input = rawInput && typeof rawInput === 'object' ? rawInput : {};
  const modoInformado = input.modo ?? input.modoCalculo ?? 'analisar';

  return {
    modo: String(modoInformado).trim(),
    custo: parseValorMonetario(input.custo),
    precoVenda: parseValorMonetario(input.precoVenda),
    percentualDesejado: parsePercentual(input.percentualDesejado)
  };
}

export function validateInput(params = {}) {
  const modo = params.modo ?? 'analisar';

  if (!MODOS_VALIDOS.has(modo)) {
    return { valido: false, erro: 'Selecione um modo de cálculo válido.' };
  }

  if (!Number.isFinite(params.custo) || params.custo <= 0) {
    return {
      valido: false,
      erro: 'Informe um custo maior que zero.'
    };
  }

  if (modo === 'analisar') {
    if (!Number.isFinite(params.precoVenda) || params.precoVenda <= 0) {
      return {
        valido: false,
        erro: 'Informe um preço de venda maior que zero.'
      };
    }
  } else {
    const percentual = params.percentualDesejado;

    if (!Number.isFinite(percentual) || percentual < 0) {
      return {
        valido: false,
        erro: 'Informe um percentual válido, igual ou maior que zero.'
      };
    }

    if (modo === 'margem' && percentual >= 100) {
      return {
        valido: false,
        erro: 'A margem desejada deve ser menor que 100%.'
      };
    }
  }

  return { valido: true };
}

export function calculate(input = {}) {
  const params = normalizeInput(input);
  const validacao = validateInput(params);

  if (!validacao.valido) {
    return { valido: false, erro: validacao.erro };
  }

  const custo = arredondar(params.custo);
  let precoBruto;

  if (params.modo === 'analisar') {
    precoBruto = params.precoVenda;
  } else if (params.modo === 'margem') {
    precoBruto = custo / (1 - params.percentualDesejado / 100);
  } else {
    precoBruto = custo * (1 + params.percentualDesejado / 100);
  }

  if (!Number.isFinite(precoBruto) || precoBruto <= 0) {
    return {
      valido: false,
      erro: 'Os valores informados geram um preço de venda inválido.'
    };
  }

  const precoVenda = arredondar(precoBruto);

  if (!Number.isFinite(precoVenda) || precoVenda <= 0) {
    return {
      valido: false,
      erro: 'Não foi possível calcular um preço de venda válido.'
    };
  }

  const lucro = arredondar(precoVenda - custo);

  return {
    valido: true,
    modo: params.modo,
    custo,
    precoVenda,
    lucro,
    margemPercentual: arredondar((lucro / precoVenda) * 100),
    markupPercentual: arredondar((lucro / custo) * 100),
    percentualDesejado: params.modo === 'analisar'
      ? null
      : params.percentualDesejado
  };
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

function formatarPercentual(valor) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor)}%`;
}

export function formatResult(resultado) {
  if (!resultado || !resultado.valido) {
    return resultado?.erro || 'Não foi possível realizar o cálculo.';
  }

  const titulo = resultado.modo === 'analisar'
    ? 'Análise do preço de venda'
    : resultado.modo === 'margem'
      ? 'Preço sugerido por margem desejada'
      : 'Preço sugerido por markup desejado';

  const linhas = [
    `Calculadora de Margem e Markup — Calculadora Master`,
    titulo,
    `Custo: ${formatarMoeda(resultado.custo)}`,
    `Preço de venda: ${formatarMoeda(resultado.precoVenda)}`,
    `${resultado.lucro >= 0 ? 'Lucro' : 'Prejuízo'}: ${formatarMoeda(Math.abs(resultado.lucro))}`,
    `Margem sobre a venda: ${formatarPercentual(resultado.margemPercentual)}`,
    `Markup sobre o custo: ${formatarPercentual(resultado.markupPercentual)}`
  ];

  if (resultado.percentualDesejado !== null) {
    linhas.push(`Percentual desejado: ${formatarPercentual(resultado.percentualDesejado)}`);
  }

  return linhas.join('\n');
}

export function setupTool() {
  if (typeof document === 'undefined') return;

  const form = document.getElementById('formMargemMarkup');
  if (!form) return;

  const modo = document.getElementById('modoCalculo');
  const custo = document.getElementById('custo');
  const precoVenda = document.getElementById('precoVenda');
  const percentual = document.getElementById('percentualDesejado');

  const grupoPreco = document.getElementById('grupoPrecoVenda');
  const grupoPercentual = document.getElementById('grupoPercentual');
  const labelPercentual = document.getElementById('labelPercentual');
  const ajudaPercentual = document.getElementById('ajudaPercentual');
  const botaoCalcular = document.getElementById('botaoCalcularMargemMarkup');
  const botaoLimpar = document.getElementById('limparMargemMarkup');

  const erro = document.getElementById('erroMargemMarkup');
  const painel = document.getElementById('resultadoMargemMarkup');
  const status = document.getElementById('statusMargemMarkup');

  const saidaTitulo = document.getElementById('tituloResultadoMargemMarkup');
  const saidaDescricao = document.getElementById('descricaoResultadoMargemMarkup');
  const saidaCusto = document.getElementById('custoResultadoMargemMarkup');
  const saidaPreco = document.getElementById('precoResultadoMargemMarkup');
  const saidaLucro = document.getElementById('lucroResultadoMargemMarkup');
  const saidaMargem = document.getElementById('margemResultadoMargemMarkup');
  const saidaMarkup = document.getElementById('markupResultadoMargemMarkup');
  const labelPreco = document.getElementById('labelPrecoResultadoMargemMarkup');

  const botaoCopiar = document.getElementById('copiarMargemMarkup');
  const botaoCompartilhar = document.getElementById('compartilharMargemMarkup');
  const botaoImprimir = document.getElementById('imprimirMargemMarkup');

  const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);

  const formatarPercentualUI = (valor) => `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor)}%`;

  let ultimoResultado = null;

  const acoes = createResultActions({
    title: 'Calculadora de Margem e Markup — Calculadora Master',
    statusElement: status,
    getSections: () => {
      if (!ultimoResultado) return [];

      return [
        { label: 'Custo', value: formatarMoeda(ultimoResultado.custo) },
        { label: 'Preço de venda', value: formatarMoeda(ultimoResultado.precoVenda) },
        {
          label: ultimoResultado.lucro >= 0 ? 'Lucro' : 'Prejuízo',
          value: formatarMoeda(Math.abs(ultimoResultado.lucro))
        },
        { label: 'Margem sobre a venda', value: formatarPercentualUI(ultimoResultado.margemPercentual) },
        { label: 'Markup sobre o custo', value: formatarPercentualUI(ultimoResultado.markupPercentual) }
      ];
    }
  });

  function atualizarModo() {
    const selecionado = modo?.value || 'analisar';
    const analisar = selecionado === 'analisar';

    if (grupoPreco) grupoPreco.hidden = !analisar;
    if (grupoPercentual) grupoPercentual.hidden = analisar;

    if (precoVenda) precoVenda.required = analisar;
    if (percentual) percentual.required = !analisar;

    if (labelPercentual) {
      labelPercentual.textContent = selecionado === 'margem'
        ? 'Margem de lucro desejada (%):'
        : 'Markup desejado (%):';
    }

    if (ajudaPercentual) {
      ajudaPercentual.textContent = selecionado === 'margem'
        ? 'A margem é calculada sobre o preço final. Use um valor de 0% até menos de 100%.'
        : 'O markup é calculado sobre o custo. Exemplo: 50 significa acrescentar 50% ao custo.';
    }

    if (botaoCalcular) {
      botaoCalcular.textContent = analisar
        ? 'Analisar preço'
        : 'Calcular preço sugerido';
    }
  }

  function formatarCampoAoFocar(campo) {
    campo.addEventListener('focus', () => {
      const texto = campo.value.trim();
      if (!texto) return;

      const valor = parseValorMonetario(texto);
      if (Number.isFinite(valor)) {
        campo.value = String(valor).replace('.', ',');
      }
    });

    campo.addEventListener('blur', () => {
      const texto = campo.value.trim();
      if (!texto) return;

      const valor = parseValorMonetario(texto);
      if (Number.isFinite(valor) && valor >= 0) {
        campo.value = new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(valor);
      }
    });
  }

  [custo, precoVenda].filter(Boolean).forEach(formatarCampoAoFocar);

  if (modo) modo.addEventListener('change', atualizarModo);
  atualizarModo();

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const resultado = calculate({
      modo: modo?.value,
      custo: custo?.value,
      precoVenda: precoVenda?.value,
      percentualDesejado: percentual?.value
    });

    if (status) status.textContent = '';

    if (!resultado.valido) {
      if (erro) {
        erro.textContent = resultado.erro;
        erro.hidden = false;
      }
      if (painel) painel.hidden = true;
      if (botaoCopiar) botaoCopiar.hidden = true;
      if (botaoCompartilhar) botaoCompartilhar.hidden = true;
      if (botaoImprimir) botaoImprimir.hidden = true;

      ultimoResultado = null;
      return;
    }

    if (erro) {
      erro.textContent = '';
      erro.hidden = true;
    }

    if (saidaTitulo) {
      saidaTitulo.textContent = resultado.modo === 'analisar'
        ? 'Análise do preço informado'
        : 'Preço de venda sugerido';
    }

    if (saidaDescricao) {
      saidaDescricao.textContent = resultado.modo === 'analisar'
        ? 'Indicadores calculados com base no custo e no preço de venda que você informou.'
        : resultado.modo === 'margem'
          ? `Preço calculado para alcançar uma margem desejada de ${formatarPercentualUI(resultado.percentualDesejado)}.`
          : `Preço calculado a partir de um markup desejado de ${formatarPercentualUI(resultado.percentualDesejado)}.`;
    }

    if (saidaCusto) saidaCusto.textContent = formatarMoeda(resultado.custo);
    if (saidaPreco) saidaPreco.textContent = formatarMoeda(resultado.precoVenda);
    if (saidaLucro) {
      saidaLucro.textContent = `${resultado.lucro < 0 ? 'Prejuízo de ' : 'Lucro de '}${formatarMoeda(Math.abs(resultado.lucro))}`;
    }
    if (saidaMargem) saidaMargem.textContent = formatarPercentualUI(resultado.margemPercentual);
    if (saidaMarkup) saidaMarkup.textContent = formatarPercentualUI(resultado.markupPercentual);

    if (labelPreco) {
      labelPreco.textContent = resultado.modo === 'analisar'
        ? 'Preço de venda informado:'
        : 'Preço de venda sugerido:';
    }

    ultimoResultado = resultado;
    if (painel) painel.hidden = false;
    if (botaoCopiar) botaoCopiar.hidden = false;
    if (botaoCompartilhar) botaoCompartilhar.hidden = false;
    if (botaoImprimir) botaoImprimir.hidden = false;
  });

  if (botaoLimpar) {
    botaoLimpar.addEventListener('click', () => {
      form.reset();
      atualizarModo();

      if (erro) {
        erro.textContent = '';
        erro.hidden = true;
      }
      if (painel) painel.hidden = true;
      if (botaoCopiar) botaoCopiar.hidden = true;
      if (botaoCompartilhar) botaoCompartilhar.hidden = true;
      if (botaoImprimir) botaoImprimir.hidden = true;
      if (status) status.textContent = '';

      ultimoResultado = null;
    });
  }

  if (botaoCopiar) {
    botaoCopiar.addEventListener('click', async () => {
      if (ultimoResultado) await acoes.copy();
    });
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.addEventListener('click', async () => {
      if (ultimoResultado) await acoes.share();
    });
  }

  if (botaoImprimir) {
    botaoImprimir.addEventListener('click', () => {
      if (ultimoResultado) acoes.print();
    });
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', setupTool);
}
