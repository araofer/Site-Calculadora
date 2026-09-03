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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Cadastra um novo usuário com nome, e-mail e senha.
 * Salva também um documento na coleção "usuarios" do Firestore.
 */
export async function cadastrarUsuario(nome, email, senha) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
  const user = userCredential.user;

  await updateProfile(user, { displayName: nome });

  await setDoc(doc(db, "usuarios", user.uid), {
    nome: nome,
    email: email,
    criadoEm: serverTimestamp()
  });

  return user;
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
