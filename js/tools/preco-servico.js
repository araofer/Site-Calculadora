function arredondar(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function parseValorMonetario(entrada) {
  if (typeof entrada === "number") return entrada;

  const texto = String(entrada ?? "").trim();
  if (texto === "") return 0;

  if (texto.includes(",")) {
    return Number(texto.replace(/\./g, "").replace(",", "."));
  }

  return Number(texto);
}

export function formatarEntradaMonetaria(valor) {
  const digitos = String(valor ?? "").replace(/\D/g, "").slice(0, 15);

  if (!digitos) return "";

  return (Number(digitos) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const CAMPOS_CUSTO = [
  { campo: "materiais", nome: "materiais" },
  { campo: "maoDeObra", nome: "mão de obra" },
  { campo: "deslocamento", nome: "deslocamento" },
  { campo: "outrasDespesas", nome: "outras despesas" }
];

export function calcularPrecoServico(params = {}) {
  if (!params || typeof params !== "object") {
    return {
      valido: false,
      erro: "Informe os dados para calcular o preço do serviço."
    };
  }

  const custos = {};

  for (const item of CAMPOS_CUSTO) {
    const entrada = params[item.campo] ?? 0;
    const valor = parseValorMonetario(entrada);

    if (!Number.isFinite(valor) || valor < 0) {
      return {
        valido: false,
        erro: `O valor de ${item.nome} deve ser um número igual ou maior que zero.`
      };
    }

    custos[item.campo] = arredondar(valor);
  }

  const entradaMargem = params.margemDesejada;

  if (
    entradaMargem === undefined ||
    entradaMargem === null ||
    String(entradaMargem).trim() === ""
  ) {
    return {
      valido: false,
      erro: "Informe a margem de lucro desejada."
    };
  }

  const margemDesejada = Number(entradaMargem);

  if (
    !Number.isFinite(margemDesejada) ||
    margemDesejada < 0 ||
    margemDesejada >= 100
  ) {
    return {
      valido: false,
      erro: "A margem desejada deve ser igual ou maior que 0% e menor que 100%."
    };
  }

  const custoTotal = arredondar(
    custos.materiais +
    custos.maoDeObra +
    custos.deslocamento +
    custos.outrasDespesas
  );

  if (custoTotal <= 0) {
    return {
      valido: false,
      erro: "Informe pelo menos um custo maior que zero."
    };
  }

  const precoSugerido = arredondar(
    custoTotal / (1 - margemDesejada / 100)
  );

  const lucroEstimado = arredondar(precoSugerido - custoTotal);

  const margemEfetiva = arredondar(
    (lucroEstimado / precoSugerido) * 100
  );

  const markup = arredondar(
    (lucroEstimado / custoTotal) * 100
  );

  return {
    valido: true,
    custos,
    custoTotal,
    precoSugerido,
    lucroEstimado,
    margemDesejada: arredondar(margemDesejada),
    margemEfetiva,
    markup
  };
}

export function setupCalculadoraPrecoServico() {
  if (typeof document === "undefined") return;

  const form = document.getElementById("formPrecoServico");
  if (!form) return;

  const erro = document.getElementById("erroPrecoServico");
  const painelResultado = document.getElementById("resultadoPrecoServico");
  const status = document.getElementById("statusPrecoServico");
  const botaoCopiar = document.getElementById("copiarPrecoServico");

  const camposMonetarios = CAMPOS_CUSTO
    .map(({ campo }) => document.getElementById(campo))
    .filter(Boolean);

  for (const campo of camposMonetarios) {
    const limparDigitos = (valor) =>
      String(valor ?? "").replace(/\D/g, "").slice(0, 15);

    campo.dataset.rawDigits = limparDigitos(campo.value);

    const renderizarValor = (digitos) => {
      const limpos = limparDigitos(digitos);

      campo.dataset.rawDigits = limpos;
      campo.dataset.replaceOnNextInput = "false";
      campo.value = formatarEntradaMonetaria(limpos);

      const cursor = campo.value.length;
      campo.setSelectionRange(cursor, cursor);
    };

    campo.addEventListener("focus", () => {
      campo.dataset.rawDigits = limparDigitos(campo.value);
      campo.dataset.replaceOnNextInput = "true";
    });

    campo.addEventListener("beforeinput", (evento) => {
      const selecionouTudo =
        campo.selectionStart === 0 &&
        campo.selectionEnd === campo.value.length;

      const substituir =
        selecionouTudo ||
        campo.dataset.replaceOnNextInput === "true";

      const atuais = substituir
        ? ""
        : (campo.dataset.rawDigits ?? limparDigitos(campo.value));

      if (evento.inputType === "insertText") {
        evento.preventDefault();

        const inseridos = String(evento.data ?? "");

        if (/^\d+$/.test(inseridos)) {
          renderizarValor(atuais + inseridos);
        }

        return;
      }

      if (
        evento.inputType === "deleteContentBackward" ||
        evento.inputType === "deleteContentForward"
      ) {
        evento.preventDefault();
        renderizarValor(substituir ? "" : atuais.slice(0, -1));
      }
    });

    campo.addEventListener("paste", (evento) => {
      evento.preventDefault();

      const texto = evento.clipboardData?.getData("text") ?? "";
      const colados = limparDigitos(texto);

      const selecionouTudo =
        campo.selectionStart === 0 &&
        campo.selectionEnd === campo.value.length;

      const substituir =
        selecionouTudo ||
        campo.dataset.replaceOnNextInput === "true";

      const atuais = substituir
        ? ""
        : (campo.dataset.rawDigits ?? limparDigitos(campo.value));

      renderizarValor(atuais + colados);
    });
  }

  const formatarMoeda = (valor) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(valor);

  const formatarPercentual = (valor) =>
    `${valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}%`;

  let ultimoResumo = "";

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const resultado = calcularPrecoServico({
      materiais: document.getElementById("materiais").value,
      maoDeObra: document.getElementById("maoDeObra").value,
      deslocamento: document.getElementById("deslocamento").value,
      outrasDespesas: document.getElementById("outrasDespesas").value,
      margemDesejada: document.getElementById("margemDesejada").value
    });

    status.textContent = "";

    if (!resultado.valido) {
      erro.textContent = resultado.erro;
      erro.hidden = false;
      painelResultado.hidden = true;
      botaoCopiar.hidden = true;
      ultimoResumo = "";
      return;
    }

    erro.textContent = "";
    erro.hidden = true;

    document.getElementById("custoTotalResultado").textContent =
      formatarMoeda(resultado.custoTotal);

    document.getElementById("precoSugeridoResultado").textContent =
      formatarMoeda(resultado.precoSugerido);

    document.getElementById("lucroEstimadoResultado").textContent =
      formatarMoeda(resultado.lucroEstimado);

    document.getElementById("margemEfetivaResultado").textContent =
      formatarPercentual(resultado.margemEfetiva);

    document.getElementById("markupResultado").textContent =
      formatarPercentual(resultado.markup);

    ultimoResumo = [
      "Calculadora de Preço de Serviço — Calculadora Master",
      `Materiais: ${formatarMoeda(resultado.custos.materiais)}`,
      `Mão de obra: ${formatarMoeda(resultado.custos.maoDeObra)}`,
      `Deslocamento: ${formatarMoeda(resultado.custos.deslocamento)}`,
      `Outras despesas: ${formatarMoeda(resultado.custos.outrasDespesas)}`,
      `Custo total: ${formatarMoeda(resultado.custoTotal)}`,
      `Preço sugerido: ${formatarMoeda(resultado.precoSugerido)}`,
      `Lucro estimado: ${formatarMoeda(resultado.lucroEstimado)}`,
      `Margem efetiva: ${formatarPercentual(resultado.margemEfetiva)}`,
      `Markup: ${formatarPercentual(resultado.markup)}`
    ].join("\n");

    painelResultado.hidden = false;
    botaoCopiar.hidden = false;
  });

  document.getElementById("limparPrecoServico").addEventListener("click", () => {
    form.reset();
    erro.textContent = "";
    erro.hidden = true;
    painelResultado.hidden = true;
    botaoCopiar.hidden = true;
    status.textContent = "";
    ultimoResumo = "";
  });

  botaoCopiar.addEventListener("click", async () => {
    if (!ultimoResumo) return;

    if (!navigator.clipboard?.writeText) {
      status.textContent =
        "Não foi possível copiar automaticamente neste navegador.";
      return;
    }

    try {
      await navigator.clipboard.writeText(ultimoResumo);
      status.textContent = "Resumo do orçamento copiado.";
    } catch {
      status.textContent =
        "Não foi possível copiar. Tente selecionar e copiar o resultado.";
    }
  });
}

if (typeof document !== "undefined") {
  setupCalculadoraPrecoServico();
}
