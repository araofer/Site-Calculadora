// Cadastro e listagem de veículos do usuário autenticado.

import { observarLogin } from "./auth.js";
import { db } from "./firebase-config.js";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const formElement = document.getElementById("carro-form");
const listElement = document.getElementById("carros-lista");
const pageMessageElement = document.getElementById("carros-message");
const formMessageElement = document.getElementById("carro-form-message");

const saveButtonElement = formElement?.querySelector(
  'button[type="submit"]'
);

let usuarioAtual = null;

const COMBUSTIVEIS_PERMITIDOS = new Set([
  "Flex",
  "Gasolina",
  "Etanol",
  "Diesel",
  "GNV",
  "Elétrico",
  "Híbrido",
  "Outro"
]);

function mostrarMensagem(elemento, mensagem, tipo = "error") {
  if (!elemento) return;

  const classeBase = elemento === pageMessageElement
    ? "account-message"
    : "account-profile-message";

  elemento.textContent = mensagem;
  elemento.className = mensagem
    ? `${classeBase} ${tipo}`
    : classeBase;
}

function mostrarListaVazia() {
  if (!listElement) return;

  listElement.textContent = "";

  const texto = document.createElement("p");
  texto.textContent = "Você ainda não cadastrou nenhum veículo.";

  listElement.appendChild(texto);
}

function renderizarCarros(carros) {
  if (!listElement) return;

  listElement.textContent = "";

  if (carros.length === 0) {
    mostrarListaVazia();
    return;
  }

  for (const carro of carros) {
    const card = document.createElement("article");
    card.className = "carro-card";

    const titulo = document.createElement("h3");
    titulo.textContent =
      `${carro.marca || "Veículo"} ${carro.modelo || ""}`.trim();

    const detalhes = document.createElement("p");
    detalhes.textContent =
      `Ano: ${carro.ano} · Combustível: ${carro.combustivel}`;

    const quilometragem = document.createElement("p");
    quilometragem.textContent =
      `Quilometragem: ${Number(carro.quilometragem).toLocaleString("pt-BR")} km`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "carro-delete-button";
    deleteButton.textContent = "Excluir";
    deleteButton.setAttribute(
      "aria-label",
      `Excluir ${titulo.textContent}`
    );

    deleteButton.addEventListener("click", async () => {
      if (!usuarioAtual) {
        mostrarMensagem(
          pageMessageElement,
          "Sua sessão não está disponível. Entre novamente."
        );
        return;
      }

      const nomeCarro =
        `${carro.marca || "Veículo"} ${carro.modelo || ""}`.trim();

      const confirmou = window.confirm(
        `Deseja realmente excluir ${nomeCarro}? Esta ação não pode ser desfeita.`
      );

      if (!confirmou) return;

      deleteButton.disabled = true;
      deleteButton.textContent = "Excluindo...";

      try {
        await deleteDoc(
          doc(db, "usuarios", usuarioAtual.uid, "carros", carro.id)
        );

        card.remove();

        if (!listElement.querySelector(".carro-card")) {
          mostrarListaVazia();
        }

        mostrarMensagem(
          pageMessageElement,
          `${nomeCarro} foi excluído com sucesso.`,
          "success"
        );
      } catch (error) {
        console.error("Erro ao excluir veículo:", error);

        mostrarMensagem(
          pageMessageElement,
          error.code === "permission-denied"
            ? "O Firestore recusou a exclusão deste veículo."
            : "Não foi possível excluir o veículo. Tente novamente."
        );

        deleteButton.disabled = false;
        deleteButton.textContent = "Excluir";
      }
    });

    card.append(titulo, detalhes, quilometragem, deleteButton);
    listElement.appendChild(card);
  }
}

async function carregarCarros(user) {
  if (!listElement) return;

  listElement.textContent = "Carregando veículos...";

  try {
    const carrosRef = collection(
      db,
      "usuarios",
      user.uid,
      "carros"
    );

    const snapshot = await getDocs(carrosRef);

    const carros = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    carros.sort((a, b) => {
      const dataA = a.criadoEm?.toMillis?.() || 0;
      const dataB = b.criadoEm?.toMillis?.() || 0;
      return dataB - dataA;
    });

    renderizarCarros(carros);
    mostrarMensagem(pageMessageElement, "");

  } catch (error) {
    console.error("Erro ao carregar veículos:", error);

    listElement.textContent =
      "Não foi possível carregar os veículos. Tente novamente.";

    mostrarMensagem(
      pageMessageElement,
      error.code === "permission-denied"
        ? "O acesso aos veículos foi recusado pelas regras de segurança."
        : "Verifique sua conexão e tente carregar os veículos novamente."
    );
  }
}

async function cadastrarCarro(event) {
  event.preventDefault();

  if (!usuarioAtual) {
    mostrarMensagem(
      formMessageElement,
      "Sua sessão não está disponível. Entre novamente."
    );
    return;
  }

  const marca = document.getElementById("carro-marca").value.trim();
  const modelo = document.getElementById("carro-modelo").value.trim();
  const anoTexto = document.getElementById("carro-ano").value.trim();
  const ano = Number(anoTexto);
  const combustivel = document.getElementById("carro-combustivel").value;
  const quilometragemTexto = document
    .getElementById("carro-quilometragem")
    .value.trim();
  const quilometragem = Number(quilometragemTexto);

  if (
    !marca ||
    marca.length > 50 ||
    !modelo ||
    modelo.length > 60 ||
    !anoTexto ||
    !Number.isInteger(ano) ||
    ano < 1900 ||
    ano > 2100 ||
    !COMBUSTIVEIS_PERMITIDOS.has(combustivel) ||
    !/^\d+$/.test(quilometragemTexto) ||
    !Number.isSafeInteger(quilometragem) ||
    quilometragem < 0
  ) {
    mostrarMensagem(
      formMessageElement,
      "Confira os dados informados antes de cadastrar o veículo."
    );
    return;
  }

  const textoOriginal =
    saveButtonElement?.textContent || "Cadastrar veículo";

  if (saveButtonElement) {
    saveButtonElement.disabled = true;
    saveButtonElement.textContent = "Cadastrando...";
  }

  mostrarMensagem(formMessageElement, "");

  try {
    const carrosRef = collection(
      db,
      "usuarios",
      usuarioAtual.uid,
      "carros"
    );

    await addDoc(carrosRef, {
      marca,
      modelo,
      ano,
      combustivel,
      quilometragem,
      criadoEm: serverTimestamp()
    });

    formElement.reset();

    mostrarMensagem(
      formMessageElement,
      "Veículo cadastrado com sucesso!",
      "success"
    );

    await carregarCarros(usuarioAtual);

  } catch (error) {
    console.error("Erro ao cadastrar veículo:", error);

    mostrarMensagem(
      formMessageElement,
      error.code === "permission-denied"
        ? "O Firestore recusou o cadastro. Verifique as regras de segurança."
        : "Não foi possível cadastrar o veículo. Tente novamente."
    );

  } finally {
    if (saveButtonElement) {
      saveButtonElement.disabled = false;
      saveButtonElement.textContent = textoOriginal;
    }
  }
}

if (formElement) {
  formElement.addEventListener("submit", cadastrarCarro);

  // Remove a confirmação anterior ao iniciar um novo cadastro.
  formElement.addEventListener("input", () => {
    if (formMessageElement?.classList.contains("success")) {
      mostrarMensagem(formMessageElement, "");
    }
  });
}

observarLogin((user) => {
  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  usuarioAtual = user;
  void carregarCarros(user);
});
