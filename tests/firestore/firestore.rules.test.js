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
  const user = testEnv.authenticatedContext("usuario-a");
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

test("usuário autenticado não pode ler documento de outro usuário", async () => {
  const userA = testEnv.authenticatedContext("usuario-a");
  const userB = testEnv.authenticatedContext("usuario-b");

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
  const authenticatedUser = testEnv.authenticatedContext("usuario-a");

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
  const userA = testEnv.authenticatedContext("usuario-a");

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
  const userA = testEnv.authenticatedContext("usuario-a");

  const carDoc = doc(
    userA.firestore(),
    "usuarios/usuario-a/carros/carro-1"
  );

  await assertSucceeds(
    setDoc(carDoc, {
      marca: "Toyota",
      modelo: "Corolla",
    })
  );

  await assertSucceeds(getDoc(carDoc));
});

test("usuário não pode acessar carro de outro usuário", async () => {
  const userA = testEnv.authenticatedContext("usuario-a");
  const userB = testEnv.authenticatedContext("usuario-b");

  const carDocB = doc(
    userB.firestore(),
    "usuarios/usuario-b/carros/carro-1"
  );

  await assertSucceeds(
    setDoc(carDocB, {
      marca: "Honda",
      modelo: "Civic",
    })
  );

  const carDocFromA = doc(
    userA.firestore(),
    "usuarios/usuario-b/carros/carro-1"
  );

  await assertFails(getDoc(carDocFromA));
});


test("usuário pode acessar seu próprio imóvel", async () => {
  const userA = testEnv.authenticatedContext("usuario-a");

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
  const userA = testEnv.authenticatedContext("usuario-a");
  const userB = testEnv.authenticatedContext("usuario-b");

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

test("usuário pode acessar seu próprio histórico", async () => {
  const userA = testEnv.authenticatedContext("usuario-a");

  const historyDoc = doc(
    userA.firestore(),
    "usuarios/usuario-a/historico/registro-1"
  );

  await assertSucceeds(
    setDoc(historyDoc, {
      tipo: "regra-de-tres",
      resultado: 25,
    })
  );

  await assertSucceeds(getDoc(historyDoc));
});

test("usuário não pode acessar histórico de outro usuário", async () => {
  const userA = testEnv.authenticatedContext("usuario-a");
  const userB = testEnv.authenticatedContext("usuario-b");

  const historyDocB = doc(
    userB.firestore(),
    "usuarios/usuario-b/historico/registro-1"
  );

  await assertSucceeds(
    setDoc(historyDocB, {
      tipo: "imovel",
      resultado: 10,
    })
  );

  const historyDocFromA = doc(
    userA.firestore(),
    "usuarios/usuario-b/historico/registro-1"
  );

  await assertFails(getDoc(historyDocFromA));
});

test("usuário pode atualizar seu documento, mas não pode alterar criadoEm", async () => {
  const userA = testEnv.authenticatedContext("usuario-a");

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
