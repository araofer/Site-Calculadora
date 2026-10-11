import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = "calculadora-master-2f96a";

let testEnv;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(
        path.join(__dirname, "..", "..", "firestore.rules"),
        "utf8"
      ),
    },
  });
});

test.after(async () => {
  await testEnv.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
});

test("usuário autenticado pode criar e ler o próprio documento", async () => {
  const user = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });
  const userDoc = doc(user.firestore(), "usuarios/usuario-a");

  await assertSucceeds(
    setDoc(userDoc, {
      nome: "Usuário A",
      email: "usuario-a@teste.com",
      criadoEm: new Date(),
    })
  );

  await assertSucceeds(getDoc(userDoc));
});

test("usuário não pode criar perfil com e-mail diferente da autenticação", async () => {
  const user = testEnv.authenticatedContext("usuario-a", {
    email: "usuario-a@teste.com",
  });
  const userDoc = doc(user.firestore(), "usuarios/usuario-a");

  await assertFails(
    setDoc(userDoc, {
      nome: "Usuário A",
      email: "outro-email@teste.com",
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
    })
  );
});

test("usuário autenticado não pode ler documento de outro usuário", async () => {
  const userA = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });
  const userB = testEnv.authenticatedContext("usuario-b", { email: "usuario-b@teste.com" });

  const userBDoc = doc(userB.firestore(), "usuarios/usuario-b");

  await assertSucceeds(
    setDoc(userBDoc, {
      nome: "Usuário B",
      email: "usuario-b@teste.com",
      criadoEm: new Date(),
    })
  );

  const userBDocFromUserA = doc(
    userA.firestore(),
    "usuarios/usuario-b"
  );

  await assertFails(getDoc(userBDocFromUserA));
});

test("usuário não autenticado não pode ler dados de usuário", async () => {
  const authenticatedUser = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });

  const userDoc = doc(
    authenticatedUser.firestore(),
    "usuarios/usuario-a"
  );

  await assertSucceeds(
    setDoc(userDoc, {
      nome: "Usuário A",
      email: "usuario-a@teste.com",
      criadoEm: new Date(),
    })
  );

  const anonymousUser = testEnv.unauthenticatedContext();

  const anonymousDoc = doc(
    anonymousUser.firestore(),
    "usuarios/usuario-a"
  );

  await assertFails(getDoc(anonymousDoc));
});

test("usuário não pode criar documento em nome de outro usuário", async () => {
  const userA = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });

  const userBDoc = doc(
    userA.firestore(),
    "usuarios/usuario-b"
  );

  await assertFails(
    setDoc(userBDoc, {
      nome: "Tentativa",
      email: "tentativa@teste.com",
      criadoEm: new Date(),
    })
  );
});

test("usuário pode acessar seu próprio carro", async () => {
  const userA = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });

  const carDoc = doc(
    userA.firestore(),
    "usuarios/usuario-a/carros/carro-1"
  );

  await assertSucceeds(
    setDoc(carDoc, {
      marca: "Toyota",
      modelo: "Corolla",
      ano: 2022,
      combustivel: "Flex",
      quilometragem: 35000,
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
    })
  );

  await assertSucceeds(getDoc(carDoc));
});

test("usuário não pode acessar carro de outro usuário", async () => {
  const userA = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });
  const userB = testEnv.authenticatedContext("usuario-b", { email: "usuario-b@teste.com" });

  const carDocB = doc(
    userB.firestore(),
    "usuarios/usuario-b/carros/carro-1"
  );

  await assertSucceeds(
    setDoc(carDocB, {
      marca: "Honda",
      modelo: "Civic",
      ano: 2021,
      combustivel: "Flex",
      quilometragem: 48000,
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
    })
  );

  const carDocFromA = doc(
    userA.firestore(),
    "usuarios/usuario-b/carros/carro-1"
  );

  await assertFails(getDoc(carDocFromA));
});


test("usuário pode acessar seu próprio imóvel", async () => {
  const userA = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });

  const propertyDoc = doc(
    userA.firestore(),
    "usuarios/usuario-a/imoveis/imovel-1"
  );

  await assertSucceeds(
    setDoc(propertyDoc, {
      cidade: "São Paulo",
      valor: 500000,
    })
  );

  await assertSucceeds(getDoc(propertyDoc));
});

test("usuário não pode acessar imóvel de outro usuário", async () => {
  const userA = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });
  const userB = testEnv.authenticatedContext("usuario-b", { email: "usuario-b@teste.com" });

  const propertyDocB = doc(
    userB.firestore(),
    "usuarios/usuario-b/imoveis/imovel-1"
  );

  await assertSucceeds(
    setDoc(propertyDocB, {
      cidade: "Campinas",
      valor: 350000,
    })
  );

  const propertyDocFromA = doc(
    userA.firestore(),
    "usuarios/usuario-b/imoveis/imovel-1"
  );

  await assertFails(getDoc(propertyDocFromA));
});

test("histórico não pode ser criado nesta versão", async () => {
  const userA = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });

  const historyDoc = doc(
    userA.firestore(),
    "usuarios/usuario-a/historico/registro-1"
  );

  await assertFails(
    setDoc(historyDoc, {
      tipo: "regra-de-tres",
      resultado: 25,
    })
  );
});

test("histórico não pode ser lido nesta versão", async () => {
  const userA = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });

  const historyDoc = doc(
    userA.firestore(),
    "usuarios/usuario-a/historico/registro-1"
  );

  await assertFails(getDoc(historyDoc));
});

test("usuário pode atualizar seu documento, mas não pode alterar criadoEm", async () => {
  const userA = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });

  const userDoc = doc(
    userA.firestore(),
    "usuarios/usuario-a"
  );

  const criadoEm = new Date("2026-01-01T00:00:00.000Z");

  await assertSucceeds(
    setDoc(userDoc, {
      nome: "Usuário A",
      email: "usuario-a@teste.com",
      criadoEm,
    })
  );

  await assertSucceeds(
    updateDoc(userDoc, {
      nome: "Usuário A Atualizado",
      criadoEm,
    })
  );

  await assertFails(
    updateDoc(userDoc, {
      criadoEm: new Date("2026-02-01T00:00:00.000Z"),
    })
  );
});


test("usuário não pode alterar o e-mail diretamente no Firestore", async () => {
  const user = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });
  const userDoc = doc(user.firestore(), "usuarios/usuario-a");

  const criadoEm = new Date("2026-01-01T00:00:00.000Z");

  await assertSucceeds(
    setDoc(userDoc, {
      nome: "Usuário A",
      email: "usuario-a@teste.com",
      criadoEm,
    })
  );

  await assertFails(
    updateDoc(userDoc, {
      email: "outro-email@teste.com",
    })
  );
});

test("usuário não pode salvar nome vazio no perfil", async () => {
  const user = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });
  const userDoc = doc(user.firestore(), "usuarios/usuario-a");

  await assertSucceeds(
    setDoc(userDoc, {
      nome: "Usuário A",
      email: "usuario-a@teste.com",
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
    })
  );

  await assertFails(
    updateDoc(userDoc, {
      nome: "",
    })
  );
});

test("Firestore rejeita perfis com dados inválidos", async () => {
  const emailValido = "usuario-a@teste.com";
  const emailLongo = `${"a".repeat(245)}@teste.com`;
  const criadoEm = new Date("2026-01-01T00:00:00.000Z");

  const casos = [
    {
      email: emailValido,
      dados: { nome: "", email: emailValido, criadoEm },
    },
    {
      email: emailValido,
      dados: { nome: "N".repeat(101), email: emailValido, criadoEm },
    },
    {
      email: "",
      dados: { nome: "Usuário A", email: "", criadoEm },
    },
    {
      email: emailLongo,
      dados: { nome: "Usuário A", email: emailLongo, criadoEm },
    },
    {
      email: emailValido,
      dados: { nome: "Usuário A", email: emailValido, criadoEm: "data inválida" },
    },
    {
      email: emailValido,
      dados: { nome: "Usuário A", email: emailValido, criadoEm, campoExtra: true },
    },
    {
      email: emailValido,
      dados: { nome: "Usuário A", criadoEm },
    },
  ];

  for (const caso of casos) {
    const user = testEnv.authenticatedContext("usuario-a", {
      email: caso.email,
    });
    const userDoc = doc(user.firestore(), "usuarios/usuario-a");

    await assertFails(setDoc(userDoc, caso.dados));
  }
});

test("Firestore rejeita veículos com dados inválidos", async () => {
  const user = testEnv.authenticatedContext("usuario-a", { email: "usuario-a@teste.com" });
  const firestore = user.firestore();

  const carroKmInvalida = doc(
    firestore,
    "usuarios/usuario-a/carros/carro-km-invalida"
  );

  await assertFails(
    setDoc(carroKmInvalida, {
      marca: "Toyota",
      modelo: "Corolla",
      ano: 2022,
      combustivel: "Flex",
      quilometragem: -1,
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
    })
  );

  const carroCombustivelInvalido = doc(
    firestore,
    "usuarios/usuario-a/carros/carro-combustivel-invalido"
  );

  await assertFails(
    setDoc(carroCombustivelInvalido, {
      marca: "Honda",
      modelo: "Civic",
      ano: 2021,
      combustivel: "Combustível inválido",
      quilometragem: 10000,
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
    })
  );
});

test("Firestore rejeita veículos com ano, tamanho, tipo ou campos inválidos", async () => {
  const user = testEnv.authenticatedContext("usuario-a");
  const firestore = user.firestore();

  const base = {
    marca: "Toyota",
    modelo: "Corolla",
    ano: 2022,
    combustivel: "Flex",
    quilometragem: 35000,
    criadoEm: new Date("2026-01-01T00:00:00.000Z"),
  };

  const semModelo = { ...base };
  delete semModelo.modelo;

  const casos = [
    { id: "ano-abaixo", dados: { ...base, ano: 1899 } },
    { id: "ano-acima", dados: { ...base, ano: 2101 } },
    { id: "ano-decimal", dados: { ...base, ano: 2022.5 } },
    { id: "marca-longa", dados: { ...base, marca: "M".repeat(51) } },
    { id: "modelo-longo", dados: { ...base, modelo: "M".repeat(61) } },
    { id: "km-decimal", dados: { ...base, quilometragem: 1.5 } },
    { id: "data-invalida", dados: { ...base, criadoEm: "data inválida" } },
    { id: "campo-extra", dados: { ...base, campoExtra: true } },
    { id: "sem-modelo", dados: semModelo },
  ];

  for (const caso of casos) {
    const carDoc = doc(
      firestore,
      `usuarios/usuario-a/carros/${caso.id}`
    );

    await assertFails(setDoc(carDoc, caso.dados));
  }
});

test("usuário não autenticado não pode gravar perfil ou veículo", async () => {
  const anonymous = testEnv.unauthenticatedContext();
  const firestore = anonymous.firestore();

  await assertFails(
    setDoc(doc(firestore, "usuarios/anonimo"), {
      nome: "Usuário Anônimo",
      email: "anonimo@teste.com",
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
    })
  );

  await assertFails(
    setDoc(
      doc(firestore, "usuarios/anonimo/carros/carro-1"),
      {
        marca: "Toyota",
        modelo: "Corolla",
        ano: 2022,
        combustivel: "Flex",
        quilometragem: 10000,
        criadoEm: new Date("2026-01-01T00:00:00.000Z"),
      }
    )
  );
});


test("usuário pode excluir seu próprio veículo", async () => {
  const user = testEnv.authenticatedContext("usuario-a", {
    email: "usuario-a@teste.com",
  });
  const firestore = user.firestore();
  const carDoc = doc(
    firestore,
    "usuarios/usuario-a/carros/carro-excluir"
  );

  await assertSucceeds(
    setDoc(carDoc, {
      marca: "Toyota",
      modelo: "Corolla",
      ano: 2022,
      combustivel: "Flex",
      quilometragem: 35000,
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
    })
  );

  await assertSucceeds(deleteDoc(carDoc));

  const snapshot = await assertSucceeds(getDoc(carDoc));
  assert.equal(snapshot.exists(), false);
});

test("usuário não pode excluir veículo de outro usuário", async () => {
  const userA = testEnv.authenticatedContext("usuario-a", {
    email: "usuario-a@teste.com",
  });
  const userB = testEnv.authenticatedContext("usuario-b", {
    email: "usuario-b@teste.com",
  });

  const carDocB = doc(
    userB.firestore(),
    "usuarios/usuario-b/carros/carro-protegido"
  );

  await assertSucceeds(
    setDoc(carDocB, {
      marca: "Honda",
      modelo: "Civic",
      ano: 2021,
      combustivel: "Flex",
      quilometragem: 48000,
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
    })
  );

  const carDocFromA = doc(
    userA.firestore(),
    "usuarios/usuario-b/carros/carro-protegido"
  );

  await assertFails(deleteDoc(carDocFromA));

  const snapshot = await assertSucceeds(getDoc(carDocB));
  assert.equal(snapshot.exists(), true);
});

test("usuário pode atualizar seu veículo, mas não alterar criadoEm", async () => {
  const user = testEnv.authenticatedContext("usuario-a", {
    email: "usuario-a@teste.com",
  });
  const firestore = user.firestore();
  const carDoc = doc(
    firestore,
    "usuarios/usuario-a/carros/carro-atualizar"
  );
  const criadoEm = new Date("2026-01-01T00:00:00.000Z");

  await assertSucceeds(
    setDoc(carDoc, {
      marca: "Toyota",
      modelo: "Corolla",
      ano: 2022,
      combustivel: "Flex",
      quilometragem: 35000,
      criadoEm,
    })
  );

  await assertSucceeds(
    updateDoc(carDoc, { quilometragem: 36000 })
  );

  await assertFails(
    updateDoc(carDoc, {
      criadoEm: new Date("2026-02-01T00:00:00.000Z"),
    })
  );
});
