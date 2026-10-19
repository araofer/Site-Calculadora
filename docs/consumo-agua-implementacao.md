# Implementação — Calculadora de Consumo de Água

**Data:** 19/10/2026
**Branch:** `main`
**Rota:** `/tools/utilidades/consumo-agua.html`

## Referência e integração

A referência foi a página Factory da **Calculadora de Conta de Luz** (`src/pages/tools/utilidades/conta-luz.page.html`) e seu módulo (`js/tools/conta-luz.js`). Reutilizei o layout Factory, formulário com modos, apresentação de resultados e `createResultActions`. Favoritos continuam no sistema global de `js/core/favorites.js`; não foi criado mecanismo paralelo. O parser de números brasileiros existente também foi reutilizado.

O catálogo não continha calculadora equivalente. `consumo-agua` foi registrado como ferramenta Factory publicada na categoria técnica **Utilidades**, com a URL convencionada. O gerador de catálogo, a geração HTML Factory e o gerador de sitemap foram usados. A ferramenta também aparece na navegação da categoria através do catálogo.

## Fórmulas e exemplos conferidos

- Consumo mensal: custo da água = consumo em m³ × tarifa por m³; total = custo da água + cobranças adicionais.
- Leituras: consumo = leitura atual − leitura anterior; custo do período = consumo × tarifa.
- Média diária = consumo ÷ dias; projeção mensal = média diária × 30; custo mensal projetado = projeção mensal × tarifa.
- A cobrança adicional integra o total do período. A projeção mensal e seu custo são exibidos separadamente e não representam uma fatura real.

| Entrada | Resultado esperado e conferido |
|---|---|
| 250,5 m³ × R$ 5,20/m³ + R$ 12,00 | custo da água R$ 1.302,60; total R$ 1.314,60 |
| Leituras 10 → 22,5 m³ em 25 dias; tarifa R$ 4,00/m³ | consumo 12,5 m³; período R$ 50,00 antes de adicionais; média 0,5 m³/dia; projeção 15 m³; custo mensal projetado R$ 60,00 |
| Consumo e tarifa iguais a zero | custo e total R$ 0,00 |

Valores decimais usam o formato brasileiro. Campos obrigatórios vazios, valores negativos, entradas inválidas, leitura atual inferior à anterior e período não inteiro ou menor que um dia são rejeitados com mensagens claras. Dias são limitados a 1–366; os valores numéricos têm limite defensivo. Cobranças adicionais vazias equivalem a zero.

## Arquivos criados e modificados

Criados:

- `src/pages/tools/utilidades/consumo-agua.page.html`
- `js/tools/consumo-agua.js`
- `tests/consumo-agua.test.js`
- `docs/consumo-agua-implementacao.md`
- Capturas e PDF em `docs/consumo-agua-capturas/`.

Modificados para integrar a ferramenta:

- `data/tools.json`, `js/tools-catalog.js` e `sitemap.xml`.
- `js/core/favorites.js`, acrescentando o ID à lista compartilhada permitida.
- `css/style.css`, com o layout do seletor de modo e regras de impressão para esta página.
- `tests/build-html.test.js`, `tests/favorites.test.js` e `tests/seo.test.js`, atualizando a cobertura e as contagens de catálogo/build para a ferramenta nova.

## Favoritar, compartilhar e imprimir

- **Favoritar:** no Chrome headless, clique adicionou `consumo-agua` ao armazenamento compartilhado. O ID persistiu após recarga, o botão voltou com `aria-pressed="true"` e a ferramenta apareceu em `/favoritos.html`. A remoção e persistência também são cobertas pelo teste automatizado do armazenamento compartilhado.
- **Compartilhar:** a API Web Share foi substituída por um mock local. O título foi “Calculadora de Consumo de Água — Calculadora Master” e a URL foi `/tools/utilidades/consumo-agua.html`, sem query string nem leituras. Nenhum compartilhamento externo foi enviado. O texto compartilha o resumo calculado após ação explícita do usuário.
- **Imprimir:** `Page.printToPDF` gerou `docs/consumo-agua-capturas/impressao.pdf`. Em mídia de impressão, formulário e ações foram ocultados e o resultado permaneceu visível.

## Testes e builds

Os scripts foram inspecionados. Como o validador exige páginas Factory compiladas, os comandos foram executados em cópia temporária do repositório; os diretórios `dist/` e `dist-pilot/` existentes no projeto não foram tocados.

- `npm test`: **36 suites aprovadas, 0 falhas**. Inclui fórmulas, validações, catálogo, favoritos, alternância/limpeza, compartilhamento, impressão e regressões dos componentes existentes.
- `npm run build:data`: sucesso após a geração HTML inicial; **25 ferramentas validadas**, IDs/URLs únicos e **53 URLs** no sitemap.
- `npm run build:prod`: sucesso; **59 páginas e 76 assets**.
- `git diff --check`: passou.
- A primeira execução de `build:data` na cópia temporária ocorreu antes de gerar as páginas Factory e falhou pela ausência esperada de páginas compiladas. Depois de `build:prod`, `build:data` concluiu com sucesso; esta falha inicial não alterou o repositório.

## Revisão visual

A página do build temporário foi servida por HTTP local e exercitada no Chrome headless. Em todos os viewports foram conferidos os estados inicial, mensal, leituras, inválido, alternância, Limpar e a ausência de overflow horizontal.

| Viewport | Inicial | Mensal | Leituras e projeção | Inválido | Alternância e Limpar | Overflow horizontal | Impressão |
|---:|---|---|---|---|---|---|---|
| 320 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 360 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 768 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 1366 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

Evidências: `docs/consumo-agua-capturas/` contém as capturas iniciais de 320, 360, 768 e 1366 px, os estados mensal, leituras, inválido e limpar em 1366 px, além do PDF de impressão. Os estados foram inspecionados sem editar arquivos durante a revisão visual.

## Limitações e preservação

A tarifa deve ser fornecida pelo usuário. A conta real pode variar por concessionária, estrutura e faixas tarifárias, cobrança mínima, coleta/tratamento de esgoto, taxas locais e outras regras. A calculadora não presume tarifas progressivas nem uma composição universal de cobranças adicionais; não salva nem envia dados domésticos automaticamente.

Antes da implementação, `git status --short` mostrou alterações preexistentes e numerosos backups. Todos foram preservados. Builds e testes que escrevem em diretórios de saída rodaram na cópia temporária. Não houve commit, push, deploy ou alteração do Firebase. Sem defeitos conhecidos pendentes; o compartilhamento foi mockado e a impressão foi validada em PDF, sem abrir aplicativos externos ou diálogo gráfico.
