// Lógica da página Minha Conta
// Atualiza o nome no Firebase Authentication e no Firestore.

import { observarLogin, garantirPerfilUsuario } from "./auth.js";
import { db } from "./firebase-config.js";

import {
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const nomeElement = document.getElementById("conta-nome");
const emailElement = document.getElementById("conta-email");
const criadoElement = document.getElementById("conta-criado");
const messageElement = document.getElementById("conta-message");

const formElement = document.getElementById("perfil-form");
const inputNomeElement = document.getElementById("perfil-nome");
const profileMessageElement = document.getElementById("perfil-message");

const saveButtonElement = formElement?.querySelector(
  'button[type="submit"]'
);

let usuarioAutenticado = null;
let perfilCarregado = false;

if (saveButtonElement) {
  saveButtonElement.disabled = true;
}

function mostrarMensagem(mensagem, tipo = "error") {
  if (!messageElement) return;

  messageElement.textContent = mensagem;
  messageElement.className = mensagem
    ? `account-message ${tipo}`
    : "account-message";
}

function mostrarMensagemPerfil(mensagem, tipo = "error") {
  if (!profileMessageElement) return;

  profileMessageElement.textContent = mensagem;
  profileMessageElement.className = mensagem
    ? `account-profile-message ${tipo}`
    : "account-profile-message";
}

function formatarData(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "Não informado";
  }

  return timestamp.toDate().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

async function carregarDadosConta(user) {
  perfilCarregado = false;

  if (saveButtonElement) {
    saveButtonElement.disabled = true;
  }

  try {
    const usuarioRef = doc(db, "usuarios", user.uid);
    let usuarioSnapshot = await getDoc(usuarioRef);

    if (!usuarioSnapshot.exists()) {
      // Recupera o perfil somente se o documento estiver ausente.
      await garantirPerfilUsuario(user);
      usuarioSnapshot = await getDoc(usuarioRef);
    }

    if (!usuarioSnapshot.exists()) {
      throw new Error(
        "O perfil não foi encontrado após a tentativa de recuperação."
      );
    }

    const dados = usuarioSnapshot.data();

    const nome = dados.nome || user.displayName || "Usuário";

    if (nomeElement) {
      nomeElement.textContent = nome;
    }

    if (emailElement) {
      emailElement.textContent =
        dados.email || user.email || "Não informado";
    }

    if (criadoElement) {
      criadoElement.textContent = formatarData(dados.criadoEm);
    }

    if (inputNomeElement) {
      inputNomeElement.value = nome;
    }

    perfilCarregado = true;

    if (saveButtonElement) {
      saveButtonElement.disabled = false;
    }

    mostrarMensagem("");
    mostrarMensagemPerfil("");

  } catch (error) {
    perfilCarregado = false;

    if (saveButtonElement) {
      saveButtonElement.disabled = true;
    }

    console.error("Erro ao carregar dados da conta:", error);

    mostrarMensagem(
      "Não foi possível carregar os dados da sua conta. Tente novamente."
    );

    mostrarMensagemPerfil(
      "Não foi possível carregar o perfil. Atualize a página e tente novamente."
    );
  }
}

async function salvarPerfil(event) {
  event.preventDefault();

  if (!usuarioAutenticado) {
    mostrarMensagemPerfil(
      "Sua sessão não está disponível. Entre novamente na sua conta."
    );
    return;
  }

  if (!perfilCarregado) {
    mostrarMensagemPerfil(
      "Os dados do perfil não foram carregados. Atualize a página e tente novamente."
    );
    return;
  }

  const nome = inputNomeElement?.value.trim() || "";

  if (!nome) {
    mostrarMensagemPerfil("Informe seu nome.");
    inputNomeElement?.focus();
    return;
  }

  if (nome.length > 100) {
    mostrarMensagemPerfil(
      "O nome deve ter no máximo 100 caracteres."
    );
    return;
  }

  const user = usuarioAutenticado;
  const nomeAnteriorAuth = user.displayName ?? null;
  const textoOriginal =
    saveButtonElement?.textContent || "Salvar alterações";

  if (saveButtonElement) {
    saveButtonElement.disabled = true;
    saveButtonElement.textContent = "Salvando...";
  }

  mostrarMensagemPerfil("");

  try {
    const usuarioRef = doc(db, "usuarios", user.uid);

    // Atualiza o nome exibido pelo Firebase Authentication.
    await updateProfile(user, {
      displayName: nome
    });

    try {
      // Atualiza somente o nome no Firestore.
      // Os demais campos, inclusive criadoEm, são preservados.
      await updateDoc(usuarioRef, {
        nome: nome
      });
    } catch (firestoreError) {
      // Tenta restaurar o nome anterior se o Firestore recusar a alteração.
      try {
        await updateProfile(user, {
          displayName: nomeAnteriorAuth
        });
      } catch (rollbackError) {
        console.error(
          "Não foi possível restaurar o nome anterior no Authentication:",
          rollbackError
        );
      }

      throw firestoreError;
    }

    if (nomeElement) {
      nomeElement.textContent = nome;
    }

    // Atualiza a saudação do cabeçalho sem recarregar a página.
    const greetingElement = document.querySelector(".user-greeting");

    if (greetingElement) {
      greetingElement.textContent = `Olá, ${nome}`;
    }

    mostrarMensagemPerfil(
      "Seu nome foi atualizado com sucesso!",
      "success"
    );

  } catch (error) {
    console.error("Erro ao salvar perfil:", error);

    if (error.code === "auth/requires-recent-login") {
      mostrarMensagemPerfil(
        "Por segurança, saia da conta e entre novamente antes de alterar o nome."
      );
    } else if (error.code === "permission-denied") {
      mostrarMensagemPerfil(
        "O Firestore recusou a alteração. Verifique sua sessão e as regras de segurança."
      );
    } else {
      mostrarMensagemPerfil(
        "Não foi possível salvar as alterações. Verifique sua conexão e tente novamente."
      );
    }

  } finally {
    if (saveButtonElement) {
      saveButtonElement.disabled = !perfilCarregado;
      saveButtonElement.textContent = textoOriginal;
    }
  }
}

if (formElement) {
  formElement.addEventListener("submit", salvarPerfil);
}

observarLogin((user) => {
  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  usuarioAutenticado = user;
  void carregarDadosConta(user);
});
