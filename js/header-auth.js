// Atualiza a área de autenticação do header (desktop e mobile) conforme o estado de login do usuário.
// Este script é carregado como módulo em todas as páginas que possuem a nova navbar.

import { observarLogin, logoutUsuario } from "./auth.js";

const navActions = document.querySelector(".nav-actions");
const navMenu = document.querySelector("#nav-menu");

// Localiza ou cria dinamicamente apenas UMA vez o contêiner .mobile-auth-links dentro de #nav-menu
// e adiciona de forma idempotente a classe .has-mobile-auth para isolar o layout CSS
function obterOuCriarMobileAuth() {
  if (!navMenu) return null;
  navMenu.classList.add("has-mobile-auth");
  let mobileAuth = navMenu.querySelector(".mobile-auth-links");
  if (!mobileAuth) {
    mobileAuth = document.createElement("div");
    mobileAuth.className = "mobile-auth-links";
    navMenu.appendChild(mobileAuth);
  }
  return mobileAuth;
}

// Função unificada de logout seguro com redirecionamento para /
async function executarLogout(e) {
  e.preventDefault();
  try {
    await logoutUsuario();
    window.location.href = "/";
  } catch (err) {
    console.error("Erro ao sair:", err);
  }
}

// Renderiza os links de deslogado sem innerHTML e com caminhos absolutos seguros
function renderizarDeslogado(container, isMobile) {
  if (!container) return;
  container.textContent = "";

  const linkEntrar = document.createElement("a");
  linkEntrar.href = "/login.html";
  linkEntrar.textContent = "Entrar";
  linkEntrar.className = isMobile ? "mobile-auth-link" : "btn-login";

  const linkCadastrar = document.createElement("a");
  linkCadastrar.href = "/cadastro.html";
  linkCadastrar.textContent = "Cadastrar-se";
  linkCadastrar.className = isMobile ? "mobile-auth-link" : "btn-signup";

  container.appendChild(linkEntrar);
  container.appendChild(linkCadastrar);
}

// Renderiza o estado logado com textContent (proteção nativa contra XSS)
function renderizarLogado(container, nomeExibido, isMobile) {
  if (!container) return;
  container.textContent = "";

  const spanGreeting = document.createElement("span");
  spanGreeting.className = "user-greeting";
  spanGreeting.textContent = `Olá, ${nomeExibido}`;

  const linkLogout = document.createElement("a");
  linkLogout.href = "#";
  linkLogout.textContent = "Sair";
  linkLogout.className = isMobile ? "mobile-auth-link" : "btn-signup";
  linkLogout.addEventListener("click", executarLogout);

  container.appendChild(spanGreeting);
  container.appendChild(linkLogout);
}

if (navActions || navMenu) {
  const mobileAuth = obterOuCriarMobileAuth();

  observarLogin((user) => {
    if (user) {
      const nomeExibido = user.displayName || (user.email ? user.email.split("@")[0] : "Usuário");
      renderizarLogado(navActions, nomeExibido, false);
      renderizarLogado(mobileAuth, nomeExibido, true);
    } else {
      renderizarDeslogado(navActions, false);
      renderizarDeslogado(mobileAuth, true);
    }
  });
}
