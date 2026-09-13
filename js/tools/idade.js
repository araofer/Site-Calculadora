/**
 * Ferramenta: Calculadora de Idade - Calculadora Master
 * Cálculo de idade exata em anos, meses e dias considerando anos bissextos e datas locais.
 */

(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.CalculadoraIdade = factory();
    // Atalhos globais para compatibilidade
    root.calcularIdade = root.CalculadoraIdade.calcularIdade;
    root.limparCampos = root.CalculadoraIdade.limparCampos;
    root.limparResultado = root.CalculadoraIdade.limparResultado;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function () {
  /**
   * Calcula a idade exata com base em uma string YYYY-MM-DD e uma data de referência.
   * Não utiliza parsing UTC para evitar discrepâncias de fuso horário.
   *
   * @param {string} nascimentoInput Data no formato "YYYY-MM-DD"
   * @param {Date} [dataReferencia=new Date()] Data base para o cálculo
   * @returns {Object} Resultado contendo status, valores de anos, meses, dias e texto formatado
   */
  function calcularIdadePrecisa(nascimentoInput, dataReferencia) {
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

    if (isNaN(ano) || isNaN(mes) || isNaN(dia) || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      return {
        valido: false,
        erro: "Por favor, selecione uma data!"
      };
    }

    const hoje = dataReferencia ? new Date(dataReferencia.getTime()) : new Date();
    const dataNasc = new Date(ano, mes - 1, dia);

    // Zerar horas para comparação justa de calendário
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

    // Ajuste para dias negativos (mês anterior)
    if (dias < 0) {
      meses--;
      const ultimoDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
      dias += ultimoDiaMesPassado;
    }

    // Ajuste para meses negativos (ano anterior)
    if (meses < 0) {
      anos--;
      meses += 12;
    }

    const textoAnos = anos === 1 ? "1 ano" : anos + " anos";
    const textoMeses = meses === 1 ? "1 mês" : meses + " meses";
    const textoDias = dias === 1 ? "1 dia" : dias + " dias";

    return {
      valido: true,
      anos,
      meses,
      dias,
      texto: `Você tem ${textoAnos}, ${textoMeses} e ${textoDias}.`
    };
  }

  function limparResultado() {
    if (typeof document === "undefined") return;
    const resEl = document.getElementById("resultado");
    if (resEl) {
      resEl.innerText = "";
    }
  }

  function limparCampos() {
    if (typeof document === "undefined") return;
    const inputEl = document.getElementById("dataNascimento");
    if (inputEl) {
      inputEl.value = "";
    }
    limparResultado();
  }

  function calcularIdade() {
    if (typeof document === "undefined") return;
    const inputEl = document.getElementById("dataNascimento");
    const resEl = document.getElementById("resultado");

    if (!resEl) return;

    const valorInput = inputEl ? inputEl.value : "";
    const res = calcularIdadePrecisa(valorInput);

    if (!res.valido) {
      resEl.innerText = res.erro;
      return;
    }

    resEl.innerText = res.texto;
  }

  function inicializarEventos() {
    if (typeof document === "undefined") return;

    const inputEl = document.getElementById("dataNascimento");
    if (inputEl) {
      inputEl.addEventListener("input", limparResultado);
      inputEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          calcularIdade();
        }
      });
    }

    const botoes = document.querySelectorAll("button");
    botoes.forEach(btn => {
      const texto = btn.textContent.trim().toLowerCase();
      if (texto.includes("calcular idade")) {
        btn.addEventListener("click", calcularIdade);
      } else if (texto === "limpar") {
        btn.addEventListener("click", limparCampos);
      }
    });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializarEventos);
    } else {
      inicializarEventos();
    }
  }

  return {
    calcularIdadePrecisa,
    calcularIdade,
    limparCampos,
    limparResultado,
    inicializarEventos
  };
});
