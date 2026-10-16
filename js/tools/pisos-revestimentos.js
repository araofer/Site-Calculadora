import { createResultActions } from "../core/result-actions.js";
const SUPERFICIES_VALIDAS = new Set(['piso', 'parede']);

export function parseDecimal(valor) {
  if (typeof valor === 'number') return valor;

  const texto = String(valor ?? '').trim().replace(',', '.');
  return texto === '' ? NaN : Number(texto);
}

function arredondar(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function arredondarParaCima(valor) {
  return Math.ceil(valor - 1e-10);
}

export function normalizeInput(input = {}) {
  return {
    superficie: String(input.superficie ?? 'piso').trim().toLowerCase(),
    medidaPrincipal: parseDecimal(input.medidaPrincipal),
    largura: parseDecimal(input.largura),
    comprimentoPeca: parseDecimal(input.comprimentoPeca),
    larguraPeca: parseDecimal(input.larguraPeca),
    desperdicio: input.desperdicio === undefined || input.desperdicio === null
      ? 10
      : parseDecimal(input.desperdicio),
    rendimentoCaixa: parseDecimal(input.rendimentoCaixa),
    precoCaixa: input.precoCaixa == null || String(input.precoCaixa).trim() === ''
      ? null
      : parseDecimal(input.precoCaixa)
  };
}

export function validateInput(p) {
  if (!SUPERFICIES_VALIDAS.has(p.superficie)) {
    return { valido: false, erro: 'Selecione piso ou parede.' };
  }

  const campos = [
    ['a primeira dimensão', p.medidaPrincipal],
    ['a largura da superfície', p.largura],
    ['o comprimento da peça', p.comprimentoPeca],
    ['a largura da peça', p.larguraPeca],
    ['o rendimento por caixa', p.rendimentoCaixa]
  ];

  for (const [nome, valor] of campos) {
    if (!Number.isFinite(valor) || valor <= 0) {
      return {
        valido: false,
        erro: `Informe ${nome} com um valor maior que zero.`
      };
    }
  }

  if (!Number.isFinite(p.desperdicio) || p.desperdicio < 0 || p.desperdicio > 100) {
    return { valido: false, erro: 'O desperdício deve ficar entre 0% e 100%.' };
  }

  if (p.precoCaixa !== null &&
      (!Number.isFinite(p.precoCaixa) || p.precoCaixa <= 0)) {
    return {
      valido: false,
      erro: 'O preço por caixa deve ser maior que zero ou ficar em branco.'
    };
  }

  const area = p.medidaPrincipal * p.largura;
  const areaPeca = p.comprimentoPeca * p.larguraPeca / 10000;
  const areaComDesperdicio = area * (1 + p.desperdicio / 100);

  if (
    !Number.isFinite(area) ||
    !Number.isFinite(areaPeca) ||
    areaPeca <= 0 ||
    !Number.isFinite(areaComDesperdicio) ||
    areaComDesperdicio / areaPeca > Number.MAX_SAFE_INTEGER ||
    areaComDesperdicio / p.rendimentoCaixa > Number.MAX_SAFE_INTEGER
  ) {
    return { valido: false, erro: 'Os valores informados são muito grandes.' };
  }

  if (p.precoCaixa !== null &&
      !Number.isFinite(areaComDesperdicio / p.rendimentoCaixa * p.precoCaixa)) {
    return { valido: false, erro: 'Não foi possível calcular o custo informado.' };
  }

  return { valido: true };
}

export function calculate(input = {}) {
  const p = normalizeInput(input);
  const validacao = validateInput(p);

  if (!validacao.valido) {
    return { valido: false, erro: validacao.erro };
  }

  const area = p.medidaPrincipal * p.largura;
  const areaPeca = p.comprimentoPeca * p.larguraPeca / 10000;
  const areaComDesperdicio = area * (1 + p.desperdicio / 100);
  const quantidadePecas = arredondarParaCima(areaComDesperdicio / areaPeca);
  const quantidadeCaixas = arredondarParaCima(
    areaComDesperdicio / p.rendimentoCaixa
  );

  return {
    valido: true,
    superficie: p.superficie,
    area: arredondar(area),
    desperdicio: p.desperdicio,
    areaComDesperdicio: arredondar(areaComDesperdicio),
    areaPorPeca: arredondar(areaPeca),
    quantidadePecas,
    rendimentoCaixa: p.rendimentoCaixa,
    quantidadeCaixas,
    precoCaixa: p.precoCaixa,
    custoEstimado: p.precoCaixa === null
      ? null
      : arredondar(quantidadeCaixas * p.precoCaixa)
  };
}

export function formatResult(r) {
  if (!r || !r.valido) return r?.erro || 'Não foi possível realizar o cálculo.';

  const numero = (v) => new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(v);

  const linhas = [
    'Calculadora de Pisos e Revestimentos — Calculadora Master',
    `Superfície: ${r.superficie === 'parede' ? 'Parede' : 'Piso'}`,
    `Área: ${numero(r.area)} m²`,
    `Desperdício: ${numero(r.desperdicio)}%`,
    `Área com desperdício: ${numero(r.areaComDesperdicio)} m²`,
    `Área por peça: ${numero(r.areaPorPeca)} m²`,
    `Quantidade de peças: ${r.quantidadePecas}`,
    `Rendimento por caixa: ${numero(r.rendimentoCaixa)} m²`,
    `Quantidade de caixas: ${r.quantidadeCaixas}`
  ];

  if (r.precoCaixa !== null) {
    linhas.push(`Preço por caixa: R$ ${numero(r.precoCaixa)}`);
    linhas.push(`Custo estimado: R$ ${numero(r.custoEstimado)}`);
  }

  linhas.push(
    'A quantidade real pode variar conforme cortes, paginação e instalação.'
  );

  return linhas.join('\n');
}

function setupTool() {
  if (typeof document === 'undefined') return;

  const form = document.getElementById('formPisosRevestimentos');
  if (!form) return;

  const campo = (id) => document.getElementById(id);
  const superficie = campo('superficie');
  const medidaPrincipal = campo('medidaPrincipal');
  const largura = campo('largura');
  const comprimentoPeca = campo('comprimentoPeca');
  const larguraPeca = campo('larguraPeca');
  const desperdicio = campo('desperdicio');
  const rendimentoCaixa = campo('rendimentoCaixa');
  const precoCaixa = campo('precoCaixa');
  const labelMedida = campo('labelMedidaPrincipal');
  const erro = campo('erroPisosRevestimentos');
  const painel = campo('resultadoPisosRevestimentos');
  const status = campo('statusPisosRevestimentos');
  const botaoLimpar = campo('limparPisosRevestimentos');
  const botaoCopiar = campo('copiarPisosRevestimentos');
  const botaoCompartilhar = campo('compartilharPisosRevestimentos');
  const botaoImprimir = campo('imprimirPisosRevestimentos');

  const numero = (valor) => new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);

  const moeda = (valor) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);

  let ultimoResultado = null;

  const acoes = createResultActions({
    title: 'Calculadora de Pisos e Revestimentos — Calculadora Master',
    statusElement: status,
    getSections: () => {
      if (!ultimoResultado) return [];

      const r = ultimoResultado;
      const secoes = [
        { label: 'Superfície', value: r.superficie === 'parede' ? 'Parede' : 'Piso' },
        { label: 'Área original', value: `${numero(r.area)} m²` },
        { label: 'Desperdício', value: `${numero(r.desperdicio)}%` },
        { label: 'Área com desperdício', value: `${numero(r.areaComDesperdicio)} m²` },
        { label: 'Área por peça', value: `${numero(r.areaPorPeca)} m²` },
        { label: 'Quantidade de peças', value: r.quantidadePecas },
        { label: 'Rendimento por caixa', value: `${numero(r.rendimentoCaixa)} m²` },
        { label: 'Quantidade de caixas', value: r.quantidadeCaixas }
      ];

      if (r.precoCaixa !== null) {
        secoes.push(
          { label: 'Preço por caixa', value: moeda(r.precoCaixa) },
          { label: 'Custo estimado', value: moeda(r.custoEstimado) }
        );
      }

      secoes.push({
        label: 'Observação',
        value: 'A quantidade real pode variar conforme cortes, paginação e instalação.'
      });

      return secoes;
    }
  });

  function esconderAcoes() {
    [botaoCopiar, botaoCompartilhar, botaoImprimir]
      .filter(Boolean)
      .forEach((botao) => { botao.hidden = true; });
  }

  function atualizarRotulo() {
    if (labelMedida) {
      labelMedida.textContent = superficie.value === 'parede'
        ? 'Altura da parede (m):'
        : 'Comprimento do piso (m):';
    }
  }

  superficie.addEventListener('change', atualizarRotulo);
  atualizarRotulo();

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    if (status) status.textContent = '';

    const resultado = calculate({
      superficie: superficie.value,
      medidaPrincipal: medidaPrincipal.value,
      largura: largura.value,
      comprimentoPeca: comprimentoPeca.value,
      larguraPeca: larguraPeca.value,
      desperdicio: desperdicio.value,
      rendimentoCaixa: rendimentoCaixa.value,
      precoCaixa: precoCaixa.value
    });

    if (!resultado.valido) {
      if (erro) {
        erro.textContent = resultado.erro;
        erro.hidden = false;
      }
      if (painel) painel.hidden = true;
      esconderAcoes();
      ultimoResultado = null;
      return;
    }

    if (erro) {
      erro.textContent = '';
      erro.hidden = true;
    }

    campo('saidaArea').textContent = `${numero(resultado.area)} m²`;
    campo('saidaAreaComDesperdicio').textContent =
      `${numero(resultado.areaComDesperdicio)} m²`;
    campo('saidaAreaPeca').textContent = `${numero(resultado.areaPorPeca)} m²`;
    campo('saidaQuantidadePecas').textContent =
      String(resultado.quantidadePecas);
    campo('saidaQuantidadeCaixas').textContent =
      String(resultado.quantidadeCaixas);

    campo('linhaPrecoCaixa').hidden = resultado.precoCaixa === null;
    campo('linhaCusto').hidden = resultado.precoCaixa === null;

    if (resultado.precoCaixa !== null) {
      campo('saidaPrecoCaixa').textContent = moeda(resultado.precoCaixa);
      campo('saidaCusto').textContent = moeda(resultado.custoEstimado);
    }

    ultimoResultado = resultado;
    if (painel) painel.hidden = false;

    [botaoCopiar, botaoCompartilhar, botaoImprimir]
      .filter(Boolean)
      .forEach((botao) => { botao.hidden = false; });
  });

  if (botaoLimpar) {
    botaoLimpar.addEventListener('click', () => {
      form.reset();
      atualizarRotulo();

      if (erro) {
        erro.textContent = '';
        erro.hidden = true;
      }
      if (painel) painel.hidden = true;
      if (status) status.textContent = '';

      esconderAcoes();
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
