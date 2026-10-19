# Implementação — Calculadora de Orçamento Doméstico

**Data:** 19/10/2026
**Projeto:** `/home/araofer/Documentos/github/CalculadoraMaster`
**Branch:** `main`

## Referência e preservação

A melhor referência foi **Calculadora de Preço de Serviço** (`src/pages/tools/financas/preco-servico.page.html` e `js/tools/preco-servico.js`). Ela já usa a arquitetura Factory, layout compartilhado, campos monetários localizados, mensagens acessíveis, painel de resultados e `createResultActions`. Também consultei Lucro e Dividir Conta; Lucro tem estrutura mais antiga e Dividir Conta não tem os três controles de resultado.

A nova página reutiliza `src/layouts/tool.html`, que fornece cabeçalho, rodapé e o botão compartilhado de Favoritar. Copiar, Compartilhar e Imprimir usam `js/core/result-actions.js`; não foi criado mecanismo paralelo. O build descobre a ferramenta pelo catálogo, gera o card financeiro/home, a página e o asset JS. Nenhum dado de receita ou despesa é salvo em storage ou enviado automaticamente.

Antes das alterações, o repositório estava na branch `main` com mudanças e backups preexistentes em CSS, catálogo, scripts, páginas, testes e documentos. Foram preservados. Os testes e builds foram executados numa cópia temporária em `/tmp/calculadoramaster-budget-final.Me3MXB`; os `dist/` e `dist-pilot/` originais não foram usados nem sobrescritos. Não houve commit, push, deploy ou alteração do Firebase.

## Cálculos e validação de entradas

- Receitas: soma de salário/renda principal, rendas adicionais e outras receitas. Campos vazios representam zero; não há divisão por zero.
- Despesas: cada linha exige categoria válida, descrição e valor. Uma linha completamente vazia é ignorada; linhas parcialmente preenchidas são validadas.
- Valores negativos, texto não numérico, agrupamento inválido e valores acima do limite numérico são rejeitados com mensagem. Despesa zero é permitida.
- Valores são acumulados em centavos inteiros e apresentados em reais (`pt-BR`). `1.234,56`, `0,05` e decimal com ponto são aceitos; texto inválido nunca vira `NaN`/`Infinity` no resultado.
- Saldo = receitas − despesas. O déficit não é limitado a zero. Percentual comprometido = despesas ÷ receitas × 100 quando receitas > 0. Percentual restante só aparece se o saldo for positivo.
- A situação retornada é positiva, equilibrada ou déficit. O resumo de categorias é ordenado do maior para o menor gasto e destaca as três primeiras.

Exemplos testados:

| Receitas | Despesas | Saldo | Comprometido | Restante | Situação |
|---:|---:|---:|---:|---:|---|
| R$ 5.050,00 | R$ 3.900,00 | R$ 1.150,00 | 77,23% | 22,77% | Positivo |
| R$ 1.000,00 | R$ 1.000,00 | R$ 0,00 | 100,00% | Indisponível | Equilibrado |
| R$ 1.000,00 | R$ 1.200,00 | −R$ 200,00 | 120,00% | Indisponível | Déficit |
| R$ 0,00 | R$ 50,00 | −R$ 50,00 | Indisponível | Indisponível | Déficit |

## Catálogo e arquivos

Nova ferramenta: ID `orcamento-domestico`, categoria `Financeiro` (`financas`), URL `/tools/financas/orcamento-domestico.html`. O catálogo tinha 22 ferramentas e não continha equivalente de orçamento familiar.

Arquivos criados:

- `src/pages/tools/financas/orcamento-domestico.page.html`
- `js/tools/orcamento-domestico.js`
- `tests/orcamento-domestico.test.js`
- `docs/orcamento-domestico-implementacao.md`
- Evidências em `docs/orcamento-domestico-capturas/`

Arquivos modificados:

- `data/tools.json`: registro Factory publicado, com categoria, URL, metadados e relações.
- `js/tools-catalog.js` e `sitemap.xml`: gerados a partir do catálogo; adição da nova URL e ferramenta.
- `js/core/favorites.js`: inclusão do novo ID na lista de IDs permitidos do mecanismo compartilhado.
- `css/style.css`: estilo localizado das linhas e categorias; impressão oculta formulário e conteúdo explicativo. Após a primeira revisão visual, valores monetários de categoria receberam `white-space: nowrap` para não quebrarem no meio do valor em telas estreitas.
- `tests/build-html.test.js`, `tests/seo.test.js`, `tests/favorites.test.js` e `tests/favorites-page.test.js`: contagens, geração, metadados, inclusão em favoritos e caminho de navegação.

O catálogo final contém **23 ferramentas publicadas**, sem duplicidade de ID ou URL. `build:data` gerou sitemap com 51 URLs e validou a nova ferramenta. A página usa canonical `/tools/financas/orcamento-domestico.html` e o layout gera os metadados estruturados e o favorito com ID/categoria corretos.

## Testes, build e recursos

Executados após a correção visual na cópia temporária:

- `npm run build:data`: sucesso; 23 ferramentas validadas, arquivos e URLs válidos, 51 URLs no sitemap.
- `npm test`: **34 aprovados, 0 falhas, 0 ignorados**.
- `npm run build:prod`: sucesso; **57 páginas e 74 assets**.
- HTTP local: **200** para a calculadora, `/financeira.html`, `/favoritos.html`, o JS da ferramenta e `js/tools-catalog.js`.
- `git diff --check`: sucesso.

Verificações de recursos:

- **Favoritar:** clique no navegador alterou `aria-pressed` para `true`, gravou `orcamento-domestico` em `calculadoraMaster:favorites:v1`, manteve o estado após recarregar e removeu o ID ao desfavoritar. O teste da listagem confirma nome, categoria “Financeiro” e link para a URL catalogada em `/favoritos.html`.
- **Compartilhar:** botão conectado ao `createResultActions` compartilhado. Teste controlado do mecanismo nativo verificou título correto, URL `https://www.calculadoramaster.com/tools/financas/orcamento-domestico.html` sem parâmetros pessoais e resumo no texto compartilhado. A página informa que o resumo só é passado ao mecanismo do dispositivo após o clique; nenhum conteúdo foi enviado a terceiros durante os testes.
- **Imprimir:** o botão acionou `window.print()` e o evento `beforeprint` no Chrome headless. A impressão emulada ocultou formulário, navegação/favorito e ações, mantendo os resultados. `Page.printToPDF` gerou um PDF legível com o resumo e sem controles; evidência em `impressao-resumo.pdf`.
- **Limpar e novo cálculo:** a interface foi exercitada com adicionar/remover despesa, cálculo, validação, limpeza das entradas/linhas/resultados e cálculo posterior. Testes cobrem também categorias diferentes e estados de saldo.

## Revisão visual

Página servida por HTTP local a partir do build de produção isolado. Em cada largura foram inspecionados estado inicial, resultado calculado e erro de validação. Não houve overflow horizontal nem valores `NaN`/`Infinity`. O valor de teste no navegador foi R$ 5.050,00 de receitas e R$ 2.300,00 de despesas: saldo R$ 2.750,00, 45,54% comprometido e 54,46% restante.

| Viewport | Estado inicial | Calculado | Inválido | Overflow horizontal | Impressão |
|---:|---|---|---|---|---|
| 320 px | PASS | PASS | PASS | PASS | N/A — estilos de impressão verificados em 1366 px |
| 360 px | PASS | PASS | PASS | PASS | N/A — estilos de impressão verificados em 1366 px |
| 768 px | PASS | PASS | PASS | PASS | N/A — estilos de impressão verificados em 1366 px |
| 1366 px | PASS | PASS | PASS | PASS | PASS — botão acionou impressão; PDF revisado |

Capturas do estado inicial, calculado e inválido para os quatro viewports e o PDF estão em [`docs/orcamento-domestico-capturas/`](orcamento-domestico-capturas/).

### Defeito encontrado e corrigido durante a inspeção

No primeiro passe, em 320 px, a coluna de categorias quebrou o valor de moeda entre os algarismos. A regra localizada `white-space: nowrap` no valor resolveu o defeito sem afetar o restante do site. Depois da correção, foram repetidos `build:data`, todos os testes, build de produção e a revisão dos quatro viewports; todos passaram.

## Pendências e limitações

- A caixa de compartilhamento nativa foi validada com um mock controlado; nenhuma opção de compartilhamento externo foi selecionada ou enviada. O fallback continua sendo o mecanismo compartilhado existente.
- A impressão foi validada no Chrome headless via `beforeprint`, emulação de `@media print` e PDF. Não foi aberta uma interface de diálogo gráfica do sistema operacional.
- Impressão em 320, 360 e 768 px não foi executada separadamente; a impressão foi revisada em 1366 px e os mesmos estilos `@media print` se aplicam à página.
- Sem outras pendências conhecidas. A revisão visual pode ser considerada aprovada para os critérios e tamanhos documentados.
