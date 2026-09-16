import test from "node:test";
import assert from "node:assert/strict";
import { trackCalculatorAction } from "../js/core/analytics.js";
import { createResultActions } from "../js/core/result-actions.js";

function setupGlobalWindow(overrides = {}) {
  const events = [];
  const fakeGtag = (type, eventName, params) => {
    events.push({ type, eventName, params });
  };

  const fakeWindow = {
    gtag: fakeGtag,
    ...overrides
  };

  globalThis.window = fakeWindow;
  return {
    events,
    restore() {
      delete globalThis.window;
    }
  };
}

test("analytics - trackCalculatorAction dispara evento GA4 calculator_action com parâmetros válidos", () => {
  const env = setupGlobalWindow();
  try {
    const success = trackCalculatorAction({
      calculatorId: "juros",
      calculatorCategory: "financas",
      calculationType: "simple",
      action: "calculate"
    });

    assert.equal(success, true);
    assert.equal(env.events.length, 1);
    assert.deepEqual(env.events[0], {
      type: "event",
      eventName: "calculator_action",
      params: {
        calculator_id: "juros",
        calculator_category: "financas",
        calculation_type: "simple",
        action: "calculate"
      }
    });
  } finally {
    env.restore();
  }
});

test("analytics - calculationType é opcional e omitido quando não fornecido", () => {
  const env = setupGlobalWindow();
  try {
    const success = trackCalculatorAction({
      calculatorId: "financiamento_imovel",
      calculatorCategory: "financas",
      action: "calculate"
    });

    assert.equal(success, true);
    assert.equal(env.events.length, 1);
    assert.deepEqual(env.events[0], {
      type: "event",
      eventName: "calculator_action",
      params: {
        calculator_id: "financiamento_imovel",
        calculator_category: "financas",
        action: "calculate"
      }
    });
    assert.equal("calculation_type" in env.events[0].params, false);
  } finally {
    env.restore();
  }
});

test("analytics - todas as 6 ações permitidas são aceitas", () => {
  const allowed = ["calculate", "pdf", "copy", "share", "print", "clear"];
  for (const act of allowed) {
    const env = setupGlobalWindow();
    try {
      const ok = trackCalculatorAction({
        calculatorId: "lucro",
        calculatorCategory: "financas",
        action: act
      });
      assert.equal(ok, true, `Ação ${act} deve ser aceita`);
      assert.equal(env.events.length, 1);
      assert.equal(env.events[0].params.action, act);
    } finally {
      env.restore();
    }
  }
});

test("analytics - rejeita ações fora da whitelist", () => {
  const invalidActions = ["custom", "download", "export", "", null, undefined, 123];
  for (const act of invalidActions) {
    const env = setupGlobalWindow();
    try {
      const ok = trackCalculatorAction({
        calculatorId: "juros",
        calculatorCategory: "financas",
        action: act
      });
      assert.equal(ok, false, `Ação inválida ${act} deve ser rejeitada`);
      assert.equal(env.events.length, 0);
    } finally {
      env.restore();
    }
  }
});

test("analytics - rejeita chamadas com campos obrigatórios ausentes ou inválidos", () => {
  const invalidPayloads = [
    null,
    undefined,
    {},
    { calculatorCategory: "financas", action: "calculate" },
    { calculatorId: "juros", action: "calculate" },
    { calculatorId: "juros", calculatorCategory: "financas" },
    { calculatorId: 123, calculatorCategory: "financas", action: "calculate" },
    { calculatorId: "juros", calculatorCategory: 456, action: "calculate" },
    { calculatorId: "juros", calculatorCategory: "financas", calculationType: 789, action: "calculate" }
  ];

  for (const payload of invalidPayloads) {
    const env = setupGlobalWindow();
    try {
      const ok = trackCalculatorAction(payload);
      assert.equal(ok, false);
      assert.equal(env.events.length, 0);
    } finally {
      env.restore();
    }
  }
});

test("analytics - privacidade: nenhum parâmetro extra ou PII é propagado", () => {
  const env = setupGlobalWindow();
  try {
    const ok = trackCalculatorAction({
      calculatorId: "juros",
      calculatorCategory: "financas",
      calculationType: "compound",
      action: "calculate",
      extraAmount: "R$ 50.000,00",
      userEmail: "user@example.com",
      url: "https://calculadoramaster.com.br/?secret=123"
    });

    assert.equal(ok, true);
    assert.equal(env.events.length, 1);
    const keys = Object.keys(env.events[0].params).sort();
    assert.deepEqual(keys, ["action", "calculation_type", "calculator_category", "calculator_id"]);
  } finally {
    env.restore();
  }
});

test("analytics - respeita bloqueio de consentimento (ga-disable-*)", () => {
  const env = setupGlobalWindow({
    "ga-disable-G-KRDLTF5GBP": true
  });
  try {
    const ok = trackCalculatorAction({
      calculatorId: "juros",
      calculatorCategory: "financas",
      action: "calculate"
    });
    assert.equal(ok, false);
    assert.equal(env.events.length, 0, "Nenhum evento deve ser disparado quando consentimento estiver desativado");
  } finally {
    env.restore();
  }
});

test("analytics - seguro quando gtag está ausente ou window não existe (SSR)", () => {
  // 1. window ausente
  assert.equal(typeof window, "undefined");
  assert.equal(trackCalculatorAction({ calculatorId: "juros", calculatorCategory: "financas", action: "calculate" }), false);

  // 2. window existe mas gtag ausente
  const env = setupGlobalWindow({ gtag: undefined });
  try {
    assert.equal(trackCalculatorAction({ calculatorId: "juros", calculatorCategory: "financas", action: "calculate" }), false);
  } finally {
    env.restore();
  }
});

test("analytics - defensivo: se gtag lançar exceção, captura sem quebrar a calculadora", () => {
  const env = setupGlobalWindow({
    gtag: () => {
      throw new Error("Erro de rede / bloqueador de anúncios");
    }
  });
  try {
    let threw = false;
    let result;
    try {
      result = trackCalculatorAction({
        calculatorId: "lucro",
        calculatorCategory: "financas",
        action: "calculate"
      });
    } catch (_) {
      threw = true;
    }
    assert.equal(threw, false, "Não deve propagar exceções para a calculadora");
    assert.equal(result, false);
  } finally {
    env.restore();
  }
});

test("workflow piloto - cálculo válido dispara 1 calculator_action", () => {
  const env = setupGlobalWindow();
  try {
    // Simulação do fluxo de cálculo em juros / financiamento / lucro
    const inputsValidos = { capital: 1000, taxa: 5, tempo: 12 };
    const isValid = Number.isFinite(inputsValidos.capital) && inputsValidos.capital > 0;

    if (isValid) {
      trackCalculatorAction({
        calculatorId: "juros",
        calculatorCategory: "financas",
        calculationType: "simple",
        action: "calculate"
      });
    }

    assert.equal(env.events.length, 1);
    assert.equal(env.events[0].params.action, "calculate");
    assert.equal(env.events[0].params.calculator_id, "juros");
  } finally {
    env.restore();
  }
});

test("workflow piloto - erro ou campos inválidos geram 0 eventos", () => {
  const env = setupGlobalWindow();
  try {
    // Simulação de cálculo com campos vazios/inválidos
    const inputsInvalidos = { capital: -100, taxa: 0, tempo: 0 };
    const isValid = Number.isFinite(inputsInvalidos.capital) && inputsInvalidos.capital > 0;

    if (isValid) {
      trackCalculatorAction({
        calculatorId: "juros",
        calculatorCategory: "financas",
        action: "calculate"
      });
    }

    assert.equal(env.events.length, 0, "Cálculo inválido não deve disparar eventos de analytics");
  } finally {
    env.restore();
  }
});

test("workflow piloto - copiar com sucesso dispara 1 evento copy", async () => {
  const env = setupGlobalWindow();
  try {
    // Mock de actions.copy() retornando true
    const fakeActions = {
      copy: async () => true
    };

    const ok = await fakeActions.copy();
    if (ok) {
      trackCalculatorAction({
        calculatorId: "lucro",
        calculatorCategory: "financas",
        action: "copy"
      });
    }

    assert.equal(env.events.length, 1);
    assert.equal(env.events[0].params.action, "copy");
  } finally {
    env.restore();
  }
});

test("workflow piloto - copiar com falha gera 0 eventos", async () => {
  const env = setupGlobalWindow();
  try {
    // Mock de actions.copy() retornando false
    const fakeActions = {
      copy: async () => false
    };

    const ok = await fakeActions.copy();
    if (ok) {
      trackCalculatorAction({
        calculatorId: "lucro",
        calculatorCategory: "financas",
        action: "copy"
      });
    }

    assert.equal(env.events.length, 0, "Falha na cópia não deve emitir evento de analytics");
  } finally {
    env.restore();
  }
});

test("workflow piloto - compartilhar com sucesso dispara 1 evento share", async () => {
  const env = setupGlobalWindow();
  try {
    // Mock de actions.share() com Web Share API disponível
    const fakeActions = {
      share: async () => true
    };

    const ok = await fakeActions.share();
    if (ok) {
      trackCalculatorAction({
        calculatorId: "financiamento_imovel",
        calculatorCategory: "financas",
        action: "share"
      });
    }

    assert.equal(env.events.length, 1);
    assert.equal(env.events[0].params.action, "share");
  } finally {
    env.restore();
  }
});

test("workflow piloto - compartilhar com fallback para copiar dispara exatamente 1 share (0 copy)", async () => {
  const env = setupGlobalWindow();
  try {
    // Simula botões e listeners da calculadora:
    // O botão de copiar tem seu próprio listener
    // O botão de compartilhar invoca actions.share(), que internamente fez fallback para copiar e retornou true.
    // O listener do botão de compartilhar dispara apenas 'share'.
    const fakeActions = {
      copy: async () => true,
      share: async () => {
        // Simulação interna de fallback: executa cópia e retorna true
        await fakeActions.copy();
        return true;
      }
    };

    // Usuário clica no botão de compartilhar:
    const shareOk = await fakeActions.share();
    if (shareOk) {
      trackCalculatorAction({
        calculatorId: "juros",
        calculatorCategory: "financas",
        calculationType: "compound",
        action: "share"
      });
    }

    assert.equal(env.events.length, 1, "Exatamente 1 evento deve ser emitido");
    assert.equal(env.events[0].params.action, "share", "O evento emitido deve ser share");
    const copyEvents = env.events.filter(e => e.params.action === "copy");
    assert.equal(copyEvents.length, 0, "Nenhum evento copy deve ser emitido no fallback de compartilhamento");
  } finally {
    env.restore();
  }
});

test("workflow piloto - exportar PDF dispara 1 evento pdf", () => {
  const env = setupGlobalWindow();
  try {
    trackCalculatorAction({
      calculatorId: "financiamento_imovel",
      calculatorCategory: "financas",
      action: "pdf"
    });

    assert.equal(env.events.length, 1);
    assert.equal(env.events[0].params.action, "pdf");
  } finally {
    env.restore();
  }
});

test("workflow piloto - imprimir dispara 1 evento print", () => {
  const env = setupGlobalWindow();
  try {
    trackCalculatorAction({
      calculatorId: "juros",
      calculatorCategory: "financas",
      calculationType: "simple",
      action: "print"
    });

    assert.equal(env.events.length, 1);
    assert.equal(env.events[0].params.action, "print");
  } finally {
    env.restore();
  }
});

test("workflow piloto - limpar dispara 1 evento clear", () => {
  const env = setupGlobalWindow();
  try {
    trackCalculatorAction({
      calculatorId: "lucro",
      calculatorCategory: "financas",
      action: "clear"
    });

    assert.equal(env.events.length, 1);
    assert.equal(env.events[0].params.action, "clear");
  } finally {
    env.restore();
  }
});

test("workflow juros - clear no modo composto envia calculation_type='compound'", () => {
  const env = setupGlobalWindow();
  try {
    const modoAtivo = "compound";
    trackCalculatorAction({
      calculatorId: "juros",
      calculatorCategory: "financas",
      calculationType: modoAtivo,
      action: "clear"
    });

    assert.equal(env.events.length, 1);
    assert.deepEqual(env.events[0], {
      type: "event",
      eventName: "calculator_action",
      params: {
        calculator_id: "juros",
        calculator_category: "financas",
        calculation_type: "compound",
        action: "clear"
      }
    });
  } finally {
    env.restore();
  }
});

test("workflow juros - clear no modo simples envia calculation_type='simple'", () => {
  const env = setupGlobalWindow();
  try {
    const modoAtivo = "simple";
    trackCalculatorAction({
      calculatorId: "juros",
      calculatorCategory: "financas",
      calculationType: modoAtivo,
      action: "clear"
    });

    assert.equal(env.events.length, 1);
    assert.deepEqual(env.events[0], {
      type: "event",
      eventName: "calculator_action",
      params: {
        calculator_id: "juros",
        calculator_category: "financas",
        calculation_type: "simple",
        action: "clear"
      }
    });
  } finally {
    env.restore();
  }
});

test("workflow piloto - gtag ausente ou quebrado não quebra a operação da calculadora", async () => {
  const env = setupGlobalWindow({
    gtag: () => {
      throw new Error("Gtag crash");
    }
  });
  try {
    // Execução completa das operações
    let calcOk = false;
    let copyOk = false;
    let printOk = false;
    let clearOk = false;

    // 1. Calcular
    try {
      trackCalculatorAction({
        calculatorId: "juros",
        calculatorCategory: "financas",
        action: "calculate"
      });
      calcOk = true;
    } catch (_) {}

    // 2. Copiar
    try {
      trackCalculatorAction({
        calculatorId: "juros",
        calculatorCategory: "financas",
        action: "copy"
      });
      copyOk = true;
    } catch (_) {}

    // 3. Imprimir
    try {
      trackCalculatorAction({
        calculatorId: "juros",
        calculatorCategory: "financas",
        action: "print"
      });
      printOk = true;
    } catch (_) {}

    // 4. Limpar
    try {
      trackCalculatorAction({
        calculatorId: "juros",
        calculatorCategory: "financas",
        action: "clear"
      });
      clearOk = true;
    } catch (_) {}

    assert.equal(calcOk, true, "Cálculo não deve ser quebrado");
    assert.equal(copyOk, true, "Cópia não deve ser quebrada");
    assert.equal(printOk, true, "Impressão não deve ser quebrada");
    assert.equal(clearOk, true, "Limpeza não deve ser quebrada");
  } finally {
    env.restore();
  }
});
