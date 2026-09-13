/**
 * Ferramenta: Calculadora de Idade - Calculadora Master
 * Módulo ES nativo com cálculo preciso de anos, meses e dias locais e eventos semânticos.
 * Zero APIs globais.
 */

/**
 * Calcula a idade exata com base em uma string YYYY-MM-DD e uma data de referência.
 * Não utiliza parsing UTC para evitar discrepâncias de fuso horário.
 *
 * @param {string} nascimentoInput Data no formato "YYYY-MM-DD"
 * @param {Date} [dataReferencia=new Date()] Data base para o cálculo
 * @returns {Object} Resultado com validação, anos, meses, dias e texto amigável
 */
export function calcularIdadePrecisa(nascimentoInput, dataReferencia) {
  if (!nascimentoInput || typeof nascimentoInput !== "string") {
    return {
      valido: false,
      erro: "Por favor, selecione uma data!"
    };
  }

  const partes = nascimentoInput.trim().split("-");
  if (partes.length !== 3) {
    return {
      valido: false,
      erro: "Por favor, selecione uma data!"
    };
  }

  const ano = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);

  if (
    !Number.isInteger(ano) ||
    !Number.isInteger(mes) ||
    !Number.isInteger(dia) ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31
  ) {
    return {
      valido: false,
      erro: "Por favor, selecione uma data válida!"
    };
  }

  // Validação real de dias no mês (ex: 31 de abril, 29 de fevereiro em anos não bissextos)
  const diasNoMes = new Date(ano, mes, 0).getDate();
  if (dia > diasNoMes) {
    return {
      valido: false,
      erro: "Por favor, selecione uma data válida!"
    };
  }

  const hoje = dataReferencia ? new Date(dataReferencia.getTime()) : new Date();
  const dataNasc = new Date(ano, mes - 1, dia);

  // Zerar horas para comparação de calendário
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const nascSemHora = new Date(ano, mes - 1, dia);

  if (nascSemHora > hojeSemHora) {
    return {
      valido: false,
      erro: "A data de nascimento não pode ser no futuro!"
    };
  }

  let anos = hoje.getFullYear() - dataNasc.getFullYear();
  let meses = hoje.getMonth() - dataNasc.getMonth();
  let dias = hoje.getDate() - dataNasc.getDate();

  // Ajuste para dias negativos (recorrendo ao mês anterior)
  if (dias < 0) {
    meses--;
    const ultimoDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
    dias += ultimoDiaMesPassado;
  }

  // Ajuste para meses negativos (recorrendo ao ano anterior)
  if (meses < 0) {
    anos--;
    meses += 12;
  }

  const textoAnos = anos === 1 ? "1 ano" : `${anos} anos`;
  const textoMeses = meses === 1 ? "1 mês" : `${meses} meses`;
  const textoDias = dias === 1 ? "1 dia" : `${dias} dias`;

  return {
    valido: true,
    anos,
    meses,
    dias,
    texto: `Você tem ${textoAnos}, ${textoMeses} e ${textoDias}.`
  };
}

/**
 * Inicializa a interface da Calculadora de Idade e seus eventos semânticos.
 */
export function setupCalculadoraIdade() {
  if (typeof document === "undefined") return;

  const inputEl = document.getElementById("dataNascimento");
  const resEl = document.getElementById("resultado");

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  function limparResultado() {
    if (resEl) resEl.innerText = "";
  }

  function limparCampos() {
    if (inputEl) inputEl.value = "";
    limparResultado();
  }

  function executarCalculo() {
    if (!resEl) return;

    const valor = inputEl ? inputEl.value : "";
    const res = calcularIdadePrecisa(valor);

    if (!res.valido) {
      resEl.innerText = res.erro;
      return;
    }

    resEl.innerText = res.texto;
  }

  if (inputEl) {
    inputEl.addEventListener("input", limparResultado);
    inputEl.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        executarCalculo();
      }
    });
  }

  if (btnCalcular) {
    btnCalcular.addEventListener("click", executarCalculo);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", limparCampos);
  }
}

// Auto-inicialização em ambiente navegador
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupCalculadoraIdade);
  } else {
    setupCalculadoraIdade();
  }
}
