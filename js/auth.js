// Funções de autenticação (cadastro, login, logout) usando Firebase Auth + Firestore

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Cadastra um novo usuário com nome, e-mail e senha.
 * Salva também um documento na coleção "usuarios" do Firestore.
 */
export async function cadastrarUsuario(nome, email, senha) {
  const nomeNormalizado =
    typeof nome === "string" ? nome.trim() : "";

  const emailNormalizado =
    typeof email === "string" ? email.trim() : "";

  if (!nomeNormalizado) {
    const erro = new Error("Informe seu nome.");
    erro.code = "validation/name-required";
    throw erro;
  }

  if (nomeNormalizado.length > 100) {
    const erro = new Error(
      "O nome deve ter no máximo 100 caracteres."
    );
    erro.code = "validation/name-too-long";
    throw erro;
  }

  if (!emailNormalizado) {
    const erro = new Error("Informe seu e-mail.");
    erro.code = "auth/invalid-email";
    throw erro;
  }

  if (typeof senha !== "string" || senha.length < 6) {
    const erro = new Error(
      "A senha deve ter no mínimo 6 caracteres."
    );
    erro.code = "auth/weak-password";
    throw erro;
  }

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    emailNormalizado,
    senha
  );

  const user = userCredential.user;

  await updateProfile(user, {
    displayName: nomeNormalizado
  });

  await setDoc(doc(db, "usuarios", user.uid), {
    nome: nomeNormalizado,
    email: emailNormalizado,
    criadoEm: serverTimestamp()
  });

  return user;
}

/**
 * Garante que o usuário autenticado tenha um documento de perfil.
 * Cria o documento apenas quando ele não existe.
 */
export async function garantirPerfilUsuario(user) {
  if (!user || !user.uid) {
    const erro = new Error("Usuário não autenticado.");
    erro.code = "auth/user-not-found";
    throw erro;
  }

  const email =
    typeof user.email === "string" ? user.email.trim() : "";

  if (!email || email.length > 254) {
    const erro = new Error(
      "Não foi possível recuperar o perfil porque o e-mail da conta é inválido."
    );
    erro.code = "profile/invalid-email";
    throw erro;
  }

  const nomeAutenticacao =
    typeof user.displayName === "string" ? user.displayName.trim() : "";

  const nomeBase = nomeAutenticacao || email.split("@")[0] || "Usuário";
  const nome = nomeBase.slice(0, 100).trim() || "Usuário";
  const usuarioRef = doc(db, "usuarios", user.uid);

  return runTransaction(db, async (transaction) => {
    const usuarioSnapshot = await transaction.get(usuarioRef);

    if (usuarioSnapshot.exists()) {
      return false;
    }

    transaction.set(usuarioRef, {
      nome,
      email,
      criadoEm: serverTimestamp()
    });

    return true;
  });
}

/**
 * Autentica um usuário existente com e-mail e senha.
 */
export async function loginUsuario(email, senha) {
  const userCredential = await signInWithEmailAndPassword(auth, email, senha);
  return userCredential.user;
}

/**
 * Encerra a sessão do usuário atual.
 */
export async function logoutUsuario() {
  await signOut(auth);
}

/**
 * Observa mudanças no estado de autenticação (login/logout).
 * callback recebe o objeto "user" (ou null se deslogado).
 */
export function observarLogin(callback) {
  onAuthStateChanged(auth, callback);
}

/**
 * Traduz os códigos de erro do Firebase para mensagens amigáveis em português.
 */
export function traduzirErroFirebase(codigo) {
  const mensagens = {
    "validation/name-required": "Informe seu nome.",
    "validation/name-too-long": "O nome deve ter no máximo 100 caracteres.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/invalid-email": "O e-mail informado é inválido.",
    "auth/weak-password": "A senha deve ter no mínimo 6 caracteres.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde."
  };
  return mensagens[codigo] || "Ocorreu um erro. Tente novamente.";
}
