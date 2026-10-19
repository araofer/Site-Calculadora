# Implementação da página de favoritos

**Data:** 19/10/2026
**Branch:** `main`
**Rota validada:** `/favoritos.html`

## Causa do 404

O módulo compartilhado já armazenava IDs em `localStorage` na chave `calculadoraMaster:favorites:v1`, e o layout de ferramentas já expunha os botões individuais. O 404 acontecia porque não havia página-fonte nem entrada para `favoritos.html` em `SITE_PAGES`; também faltava uma tela para resolver os IDs do armazenamento com os metadados do catálogo.

## Implementação

- A nova página usa `src/layouts/site.html`, cabeçalho/rodapé compartilhados e `css/style.css`.
- `js/favorites-page.js` lê o catálogo real `window.TOOLS_CATALOG`, mostra nome, categoria e URL segura, oferece remoção e atualiza a lista sem recarregar. Eventos da API compartilhada e eventos `storage` atualizam a tela.
- O estado vazio inclui link para explorar as calculadoras. IDs antigos ausentes do catálogo aparecem como indisponíveis e podem ser removidos; não são descartados silenciosamente. Valores persistidos de formato inesperado são mantidos e geram aviso.
- `js/core/favorites.js` mantém a chave e o formato atuais, além da API existente. Expõe leitura sem filtragem para a lista, preserva IDs antigos ao adicionar/remover outros favoritos, remove todas as ocorrências de um ID duplicado e emite atualização para telas abertas. Erros de leitura/gravação ficam disponíveis para feedback; falha de gravação não finge que o item foi removido da persistência.
- O build registra uma única página em `SITE_PAGES` e copia o script. Os cabeçalhos `header.html` e `site-header.html` apontam para a URL pública `/favoritos.html`.
- A página tem `noindex,follow` e não foi incluída no sitemap: a lista depende do `localStorage` privado de cada navegador e não é conteúdo público estável para indexação. A rota, porém, é gerada e acessível diretamente.
- Os cards e ações usam elementos semânticos, nomes acessíveis nos botões, foco visível, mensagens com `role=status`/`role=alert` e layout adaptado para celular.

## Arquivos desta implementação

- `src/pages/favoritos.page.html` — nova página-fonte e conteúdo vazio/lista.
- `js/favorites-page.js` — renderização a partir do catálogo, remoção, atualização e feedback.
- `js/core/favorites.js` — leitura preservadora, feedback de storage e evento de atualização, mantendo a chave e API usadas pelas ferramentas.
- `scripts/build-html.js` — inclusão de `favoritos.html` e do asset da página no build do site.
- `src/components/header.html` e `src/components/site-header.html` — link visível “Meus favoritos”.
- `css/style.css` — estilos locais aos cards/estado vazio, foco e breakpoint responsivo.
- `tests/favorites-page.test.js` — testes de lista, remoção, armazenamento e build.
- `tests/favorites.test.js` — preservação de IDs antigos e erros de gravação.
- `tests/build-html.test.js` e `tests/seo.test.js` — contagens atualizadas e verificação de geração/noindex.
- `docs/revisao-visual-capturas/` — novas capturas, sem substituir as evidências existentes.
- `docs/favoritos-implementacao.md` — este relatório.

`css/style.css`, `tests/build-html.test.js` e `tests/seo.test.js` já tinham alterações não commitadas antes desta tarefa. As mudanças desta implementação foram adicionadas sem descartar as alterações existentes. Backups e os diretórios `dist/` e `dist-pilot/` do repositório foram preservados.

## Testes e build

Para proteger os artefatos preexistentes, a suíte completa foi executada em uma cópia temporária do repositório. O build final foi escrito em diretório temporário com `--dest`, em vez de usar `dist/` ou `dist-pilot/` do workspace.

- `npm test` — **PASS**, 33 testes aprovados, 0 falhas, 0 cancelados, 0 ignorados, 0 `todo`.
- `npm run build:prod -- --dest=/tmp/cm-favorites-suite-vbCFI6/final-dist` — **PASS**, 56 páginas e 73 assets. `favoritos.html` e `js/favorites-page.js` estão presentes.
- Servidor HTTP local sobre o build temporário — **PASS**, `GET /favoritos.html` retornou HTTP 200.
- A rota foi gerada uma vez. A URL e o link de cabeçalho apontam para `/favoritos.html`; o sitemap permanece sem a página privada.
- Testes unitários simulam `localStorage` e cobrem gravação/leitura bloqueadas. O teste do build valida a página-fonte, metadados, links e asset. Os testes existentes de favoritos foram mantidos e passaram.

## Matriz funcional

| Verificação | Estado | Evidência |
|---|---|---|
| Estado sem favoritos | PASS | Mensagem amigável e link “Explorar calculadoras”. |
| Um favorito | PASS | Nome, categoria e URL correspondente ao ID real no catálogo. |
| Múltiplos favoritos em categorias diferentes | PASS | Financeiro, Saúde e Utilidades listados sem duplicatas. |
| Abrir a ferramenta | PASS | Link usa `/tools/{categoria}/{ferramenta}.html` do catálogo; testes verificam o destino de Juros. |
| Remoção | PASS | Remove do armazenamento, atualiza a lista e anuncia a ação; foco vai ao próximo controle ou ao link vazio. |
| Persistência após recarga | PASS | Teste automatizado reconstrói a página com o valor persistido; Chrome confirmou um favorito restante depois da remoção. |
| ID antigo/fora do catálogo | PASS | Aparece como indisponível; pode ser removido sem apagar os IDs conhecidos adjacentes. |
| Falha de leitura/gravação | PASS | Mensagens acessíveis; dado existente não é apresentado como removido quando a gravação falha. |
| Duplicatas | PASS | Renderização deduplica visualmente; remoção apaga todas as ocorrências do ID selecionado. |
| Acessibilidade básica | PASS | Links têm texto visível; botões têm `aria-label`; foco visível e regiões de feedback acessíveis. |
| Navegação pelo cabeçalho | PASS | Link “Meus favoritos” inserido nos dois componentes compartilhados; aponta para `/favoritos.html`. |
| Build/rota HTTP | PASS | Build temporário gerou uma página; requisição local respondeu HTTP 200. |

### Matriz visual por estado e viewport

O Chrome foi configurado via DevTools para os viewports CSS exatos. Em cada linha, foram verificados o número de cards e `scrollWidth === clientWidth`; não houve overflow horizontal.

| Estado | 320 px | 360 px | 768 px | 1366 px |
|---|---|---|---|---|
| Vazio | PASS | PASS | PASS | PASS |
| Lista preenchida | PASS | PASS | PASS | PASS |
| Após remover um favorito | PASS | PASS | PASS | PASS |

Capturas finais, preservadas em `docs/revisao-visual-capturas/`:

- Vazio: [320](revisao-visual-capturas/favorites-afterfix-empty-320.png), [360](revisao-visual-capturas/favorites-afterfix-empty-360.png), [768](revisao-visual-capturas/favorites-afterfix-empty-768.png), [1366](revisao-visual-capturas/favorites-afterfix-empty-1366.png).
- Lista: [320](revisao-visual-capturas/favorites-afterfix-filled-320.png), [360](revisao-visual-capturas/favorites-afterfix-filled-360.png), [768](revisao-visual-capturas/favorites-afterfix-filled-768.png), [1366](revisao-visual-capturas/favorites-afterfix-filled-1366.png).
- Após remoção: [320](revisao-visual-capturas/favorites-afterfix-after-remove-320.png), [1366](revisao-visual-capturas/favorites-afterfix-after-remove-1366.png). Métricas e estado de armazenamento após remoção também passaram a 360 e 768 px.
- Evidência do defeito corrigido em 768 px: [antes](revisao-visual-capturas/favorites-filled-768.png); [depois](revisao-visual-capturas/favorites-afterfix-filled-768.png).

## Pendências

Não há falhas funcionais ou visuais conhecidas nesta implementação. A verificação de storage foi simulada em testes automatizados; não foi possível forçar permissões de armazenamento negadas em uma instalação real de navegador, mas o caminho de erro foi exercitado por mocks. Não foram feitas alterações em Firebase, dados de produção, deploy ou publicação.

**Conclusão:** a listagem está integrada à geração estática, acessível pela navegação e validada em HTTP, com persistência, remoção, estados vazios/antigos, erros de armazenamento e responsividade aprovados.
