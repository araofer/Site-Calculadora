// Atualiza a área "Entrar / Cadastrar-se" do header conforme o estado de login do usuário.
// Este script é carregado como módulo em todas as páginas que possuem a nova navbar.

import { observarLogin, logoutUsuario } from "./auth.js";

const navActions = document.querySelector(".nav-actions");

if (navActions) {
  observarLogin((user) => {
    if (user) {
      const nomeExibido = user.displayName || (user.email ? user.email.split("@")[0] : "Usuário");

      navActions.innerHTML = `
        <span class="user-greeting">Olá, ${nomeExibido}</span>
        <a href="#" id="btn-logout" class="btn-signup">Sair</a>
      `;

      const btnLogout = document.getElementById("btn-logout");
      if (btnLogout) {
        btnLogout.addEventListener("click", async (e) => {
          e.preventDefault();
          try {
            await logoutUsuario();
            window.location.href = "index.html";
          } catch (err) {
            console.error("Erro ao sair:", err);
          }
        });
      }
    } else {
      navActions.innerHTML = `
        <a href="login.html" class="btn-login">Entrar</a>
        <a href="cadastro.html" class="btn-signup">Cadastrar-se</a>
      `;
    }
  });
}
