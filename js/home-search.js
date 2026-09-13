/**
 * Controlador de Busca Universal - Calculadora Master
 * Gerencia a pesquisa em tempo real, navegacao por teclado e renderizacao acessivel.
 */

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const searchCount = document.getElementById("search-count");
  const searchClearBtn = document.getElementById("search-clear-btn");
  const searchForm = document.getElementById("search-form");

  if (!searchInput || !searchResults) return;

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clearSearch() {
    searchInput.value = "";
    searchResults.innerHTML = "";
    searchResults.style.display = "none";
    if (searchCount) searchCount.textContent = "";
    if (searchClearBtn) searchClearBtn.style.display = "none";
    searchInput.focus();
  }

  function renderResults(tools, query) {
    if (!tools || tools.length === 0) {
      if (searchCount) {
        searchCount.textContent = "Nenhuma ferramenta encontrada.";
      }
      searchResults.style.display = "block";
      searchResults.innerHTML = `
        <div class="search-empty-state" role="status">
          <p class="search-empty-title">Nenhuma ferramenta encontrada para "<strong>${escapeHtml(query)}</strong>".</p>
          <p class="search-empty-hint">Tente buscar por termos como <em>porcentagem</em>, <em>carro</em>, <em>horas extras</em>, <em>juros</em> ou <em>idade</em>.</p>
        </div>
      `;
      return;
    }

    if (searchCount) {
      const plural = tools.length > 1 ? "ferramentas encontradas" : "ferramenta encontrada";
      searchCount.textContent = `${tools.length} ${plural}. Pressione Enter para abrir a primeira opção ou navegue pelos resultados.`;
    }

    searchResults.style.display = "grid";
    searchResults.innerHTML = tools
      .map(tool => `
        <article class="tool-card search-card">
          <div class="tool-card-header">
            <span class="tool-card-category">${escapeHtml(tool.categoria)}</span>
          </div>
          <h3 class="tool-card-title">${escapeHtml(tool.nome)}</h3>
          <p class="tool-card-desc">${escapeHtml(tool.descricao)}</p>
          <div class="tool-card-footer">
            <a href="${escapeHtml(tool.url)}" class="tool-card-btn" data-tool-name="${escapeHtml(tool.nome)}">
              Calcular agora &rarr;
            </a>
          </div>
        </article>
      `)
      .join("");

    if (typeof window.trackToolSearch === "function") {
      window.trackToolSearch(query, tools.length);
    }
  }

  let debounceTimer = null;

  function handleSearch() {
    const query = searchInput.value.trim();

    if (!query) {
      searchResults.innerHTML = "";
      searchResults.style.display = "none";
      if (searchCount) searchCount.textContent = "";
      if (searchClearBtn) searchClearBtn.style.display = "none";
      return;
    }

    if (searchClearBtn) {
      searchClearBtn.style.display = "flex";
    }

    if (typeof window.searchToolsCatalog !== "function") {
      console.warn("searchToolsCatalog nao carregado.");
      return;
    }

    const results = window.searchToolsCatalog(query);
    renderResults(results, query);
  }

  // Evento em tempo real com debounce leve (80ms) para excelente responsividade
  searchInput.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleSearch, 80);
  });

  // Teclado: Enter abre o primeiro resultado, Escape limpa
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      clearSearch();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const firstLink = searchResults.querySelector(".tool-card-btn");
      if (firstLink) {
        const toolName = firstLink.getAttribute("data-tool-name");
        if (typeof window.trackToolResultClick === "function") {
          window.trackToolResultClick(toolName, firstLink.getAttribute("href"));
        }
        firstLink.click();
      }
    }
  });

  // Delegacao de cliques para medir cliques nos resultados
  searchResults.addEventListener("click", function (e) {
    const targetLink = e.target.closest(".tool-card-btn");
    if (targetLink && typeof window.trackToolResultClick === "function") {
      const toolName = targetLink.getAttribute("data-tool-name");
      window.trackToolResultClick(toolName, targetLink.getAttribute("href"));
    }
  });

  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", clearSearch);
  }

  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const firstLink = searchResults.querySelector(".tool-card-btn");
      if (firstLink) firstLink.click();
    });
  }
});
