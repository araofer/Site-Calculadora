/**
 * Calculadora de Valor da Hora — Calculadora Master.
 * Funções puras separadas da interface.
 */

function arredondar(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function parseValorMonetario(entrada) {
  if (typeof entrada === 'number') return entrada;

  const texto = String(entrada ?? '')
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '');

  if (texto === '') return 0;

  if (texto.includes(',')) {
    return Number(texto.replace(/\./g, '').replace(',', '.'));
  }

  if (/^-?\d{1,3}(?:\.\d{3})+$/.test(texto)) {
    return Number(texto.replace(/\./g, ''));
  }

  return Number(texto);
}

function parseNumero(entrada) {
  if (
    entrada === undefined ||
    entrada === null ||
    String(entrada).trim() === ''
  ) {
    return NaN;
  }

  return Number(String(entrada).trim().replace(',', '.'));
}

export function normalizeInput(rawInput = {}) {
  const input =
    rawInput && typeof rawInput === 'object' ? rawInput : {};

  const rendaVazia =
    input.rendaDesejada == null ||
    String(input.rendaDesejada).trim() === '';

  const despesasVazias =
    input.despesasMensais == null ||
    String(input.despesasMensais).trim() === '';

  return {
    rendaDesejada: rendaVazia
      ? NaN
      : parseValorMonetario(input.rendaDesejada),

    despesasMensais: despesasVazias
      ? 0
      : parseValorMonetario(input.despesasMensais),

    reservaPercentual: parseNumero(input.reservaPercentual),
    horasFaturaveis: parseNumero(input.horasFaturaveis)
  };
}

export function validateInput(params = {}) {
  if (!Number.isFinite(params.rendaDesejada) || params.rendaDesejada < 0) {
    return {
      valido: false,
      erro: 'Informe uma renda desejada válida, igual ou maior que zero.'
    };
  }

  if (
    !Number.isFinite(params.despesasMensais) ||
    params.despesasMensais < 0
  ) {
    return {
      valido: false,
      erro: 'As despesas mensais devem ser iguais ou maiores que zero.'
    };
  }

  if (
    !Number.isFinite(params.reservaPercentual) ||
    params.reservaPercentual < 0 ||
    params.reservaPercentual >= 100
  ) {
    return {
      valido: false,
      erro: 'A reserva deve ser igual ou maior que 0% e menor que 100%.'
    };
  }

  if (
    !Number.isFinite(params.horasFaturaveis) ||
    params.horasFaturaveis <= 0
  ) {
    return {
      valido: false,
      erro: 'Informe uma quantidade de horas faturáveis maior que zero.'
    };
  }

  if (params.rendaDesejada + params.despesasMensais <= 0) {
    return {
      valido: false,
      erro: 'Informe uma renda desejada ou despesas mensais maiores que zero.'
    };
  }

  return { valido: true };
}

export function calculate(input = {}) {
  const normalized = normalizeInput(input);
  const validation = validateInput(normalized);

  if (!validation.valido) {
    return {
      valido: false,
      erro: validation.erro
    };
  }

  const totalMensalNecessario =
    normalized.rendaDesejada + normalized.despesasMensais;

  const fatorAposReserva =
    1 - normalized.reservaPercentual / 100;

  const receitaMensalNecessaria =
    totalMensalNecessario / fatorAposReserva;

  const reservaMensal =
    receitaMensalNecessaria * normalized.reservaPercentual / 100;

  const valorHora =
    receitaMensalNecessaria / normalized.horasFaturaveis;

  return {
    valido: true,
    rendaDesejada: arredondar(normalized.rendaDesejada),
    despesasMensais: arredondar(normalized.despesasMensais),
    reservaPercentual: arredondar(normalized.reservaPercentual),
    horasFaturaveis: normalized.horasFaturaveis,
    totalMensalNecessario: arredondar(totalMensalNecessario),
    receitaMensalNecessaria: arredondar(receitaMensalNecessaria),
    reservaMensal: arredondar(reservaMensal),
    valorHora: arredondar(valorHora)
  };
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

export function formatResult(resultado) {
  if (!resultado || !resultado.valido) {
    return resultado?.erro || 'Não foi possível realizar o cálculo.';
  }

  return [
    'Calculadora de Valor da Hora — Calculadora Master',
    `Renda mensal desejada: ${formatarMoeda(resultado.rendaDesejada)}`,
    `Despesas mensais: ${formatarMoeda(resultado.despesasMensais)}`,
    `Reserva mensal estimada: ${formatarMoeda(resultado.reservaMensal)}`,
    `Faturamento mensal necessário: ${formatarMoeda(resultado.receitaMensalNecessaria)}`,
    `Horas faturáveis por mês: ${resultado.horasFaturaveis}`,
    `Valor mínimo recomendado por hora: ${formatarMoeda(resultado.valorHora)}`
  ].join('\n');
}

/**
 * Conecta os cálculos à interface HTML.
 */
export function setupTool() {
  if (typeof document === 'undefined') return;

  const form = document.getElementById('formValorHora');
  if (!form) return;

  const erro = document.getElementById('erroValorHora');
  const painelResultado = document.getElementById('resultadoValorHora');
  const status = document.getElementById('statusValorHora');
  const botaoCopiar = document.getElementById('copiarValorHora');
  const botaoLimpar = document.getElementById('limparValorHora');

  const camposMonetarios = [
    document.getElementById('rendaDesejada'),
    document.getElementById('despesasMensais')
  ].filter(Boolean);

  const formatarEntradaMonetaria = (valor) =>
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);

  for (const campo of camposMonetarios) {
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
        campo.value = formatarEntradaMonetaria(valor);
      }
    });
  }

  let ultimoResumo = '';

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const resultado = calculate({
      rendaDesejada: document.getElementById('rendaDesejada')?.value,
      despesasMensais: document.getElementById('despesasMensais')?.value,
      reservaPercentual: document.getElementById('reservaPercentual')?.value,
      horasFaturaveis: document.getElementById('horasFaturaveis')?.value
    });

    if (status) status.textContent = '';

    if (!resultado.valido) {
      if (erro) {
        erro.textContent = resultado.erro;
        erro.hidden = false;
      }

      if (painelResultado) painelResultado.hidden = true;
      if (botaoCopiar) botaoCopiar.hidden = true;

      ultimoResumo = '';
      return;
    }

    if (erro) {
      erro.textContent = '';
      erro.hidden = true;
    }

    const saidaHora = document.getElementById('valorHoraResultado');
    const saidaReceita = document.getElementById('receitaMensalResultado');
    const saidaReserva = document.getElementById('reservaMensalResultado');

    if (saidaHora) saidaHora.textContent = formatarMoeda(resultado.valorHora);
    if (saidaReceita) {
      saidaReceita.textContent =
        formatarMoeda(resultado.receitaMensalNecessaria);
    }
    if (saidaReserva) {
      saidaReserva.textContent = formatarMoeda(resultado.reservaMensal);
    }

    ultimoResumo = formatResult(resultado);

    if (painelResultado) painelResultado.hidden = false;
    if (botaoCopiar) botaoCopiar.hidden = false;
  });

  if (botaoLimpar) {
    botaoLimpar.addEventListener('click', () => {
      form.reset();

      if (erro) {
        erro.textContent = '';
        erro.hidden = true;
      }

      if (painelResultado) painelResultado.hidden = true;
      if (botaoCopiar) botaoCopiar.hidden = true;
      if (status) status.textContent = '';

      ultimoResumo = '';
    });
  }

  if (botaoCopiar) {
    botaoCopiar.addEventListener('click', async () => {
      if (!ultimoResumo) return;

      try {
        if (
          typeof navigator === 'undefined' ||
          !navigator.clipboard?.writeText
        ) {
          throw new Error('Área de transferência indisponível.');
        }

        await navigator.clipboard.writeText(ultimoResumo);

        if (status) status.textContent = 'Resultado copiado com sucesso.';
      } catch {
        if (status) {
          status.textContent =
            'Não foi possível copiar automaticamente. Selecione e copie o resultado.';
        }
      }
    });
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', setupTool);
}
