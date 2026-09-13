/**
 * Ferramenta: Dividir Conta - Calculadora Master
 * Módulo ES nativo para conferência e rateio de despesas individuais.
 * Zero APIs globais.
 */

/**
 * Valida a quantidade de pessoas para divisão de despesas.
 * Função pura e desacoplada do DOM.
 *
 * @param {number|string} quantidade
 * @returns {Object} { valido: boolean, pessoas?: number, erro?: string }
 */
export function validarQuantidadePessoas(quantidade) {
  const pessoas = parseInt(quantidade, 10);

  if (!Number.isInteger(pessoas) || pessoas <= 0) {
    return {
      valido: false,
      erro: "Digite um número de pessoas válido!"
    };
  }

  if (pessoas > 50) {
    return {
      valido: false,
      erro: "Limite máximo de 50 pessoas por vez."
    };
  }

  return {
    valido: true,
    pessoas
  };
}

/**
 * Calcula a soma dos gastos individuais e compara com o valor total da conta.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.total Valor total da conta
 * @param {Array<number|string>} params.valores Lista de consumos individuais
 * @returns {Object} Resultado com conferência, diferença e mensagens estruturadas
 */
export function calcularDivisaoConta(params = {}) {
  let total = NaN;
  if (typeof params.total === "number") {
    total = params.total;
  } else if (typeof params.total === "string" && params.total.trim() !== "") {
    total = parseFloat(params.total.trim().replace(/\./g, "").replace(",", "."));
  }

  if (!Number.isFinite(total) || total <= 0) {
    return {
      valido: false,
      erro: "Por favor, informe o valor total da conta."
    };
  }

  const valores = Array.isArray(params.valores) ? params.valores : [];
  if (valores.length === 0) {
    return {
      valido: false,
      erro: "Informe o número de pessoas e gere os campos primeiro."
    };
  }

  let soma = 0;
  valores.forEach(v => {
    let num = 0;
    if (typeof v === "number") {
      num = Number.isFinite(v) ? v : 0;
    } else if (typeof v === "string" && v.trim() !== "") {
      const parsed = parseFloat(v.trim().replace(/\./g, "").replace(",", "."));
      num = Number.isFinite(parsed) ? parsed : 0;
    }
    soma += num;
  });

  const diferenca = total - soma;

  if (Math.abs(diferenca) < 0.01) {
    return {
      valido: true,
      total,
      soma,
      diferenca: 0,
      status: "correto",
      cor: "green",
      mensagem: "Tudo certo! O somatório bate com o total da conta. 👍"
    };
  } else if (diferenca > 0) {
    return {
      valido: true,
      total,
      soma,
      diferenca,
      status: "falta",
      cor: "orange",
      mensagem: "Atenção: Ainda faltam R$ " + diferenca.toFixed(2) + " para fechar a conta."
    };
  } else {
    return {
      valido: true,
      total,
      soma,
      diferenca,
      status: "passou",
      cor: "red",
      mensagem: "Atenção: O total dos gastos passou em R$ " + Math.abs(diferenca).toFixed(2) + " do valor da conta."
    };
  }
}

/**
 * Inicializa a interface da ferramenta Dividir Conta no DOM.
 * Configura geração dinâmica de campos, eventos semânticos e limpeza.
 */
export function setupDividirConta() {
  if (typeof document === "undefined") return;

  const elTotal = document.getElementById("total");
  const elPessoas = document.getElementById("pessoas");
  const containerCampos = document.getElementById("camposPessoas");
  const elResultado = document.getElementById("resultado");

  const btnGerarCampos = document.querySelector('[data-action="generate-fields"]');
  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  function limparResultado() {
    if (elResultado) {
      elResultado.innerText = "";
    }
  }

  function limparCampos() {
    if (elTotal) elTotal.value = "";
    if (elPessoas) elPessoas.value = "";
    if (containerCampos) containerCampos.innerHTML = "";
    limparResultado();
  }

  function gerarCampos() {
    if (!containerCampos || !elPessoas) return;

    containerCampos.innerHTML = "";
    limparResultado();

    const validacao = validarQuantidadePessoas(elPessoas.value);
    if (!validacao.valido) {
      containerCampos.innerHTML = `<p style="color:red;">${validacao.erro}</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= validacao.pessoas; i++) {
      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "10px";

      const label = document.createElement("label");
      label.textContent = `Pessoa ${i}: `;

      const input = document.createElement("input");
      input.type = "number";
      input.className = "valores";
      input.placeholder = "Valor gasto";
      input.step = "0.01";
      input.addEventListener("input", limparResultado);
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          executarCalculo();
        }
      });

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      fragment.appendChild(wrapper);
    }

    containerCampos.appendChild(fragment);
  }

  function executarCalculo() {
    if (!elResultado) return;

    const totalStr = elTotal ? elTotal.value : "";
    const inputsValores = document.querySelectorAll(".valores");
    const valores = Array.from(inputsValores).map(input => input.value);

    const res = calcularDivisaoConta({
      total: totalStr,
      valores
    });

    if (!res.valido) {
      elResultado.style.color = "#008080";
      elResultado.innerText = res.erro;
      return;
    }

    elResultado.style.color = res.cor;
    elResultado.innerText = res.mensagem;
  }

  if (elTotal) {
    elTotal.addEventListener("input", limparResultado);
    elTotal.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        executarCalculo();
      }
    });
  }

  if (elPessoas) {
    elPessoas.addEventListener("input", limparResultado);
    elPessoas.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        gerarCampos();
      }
    });
  }

  if (btnGerarCampos) {
    btnGerarCampos.addEventListener("click", gerarCampos);
  }

  if (btnCalcular) {
    btnCalcular.addEventListener("click", executarCalculo);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", limparCampos);
  }
}

// Auto-inicialização segura em ambiente navegador
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupDividirConta);
  } else {
    setupDividirConta();
  }
}
