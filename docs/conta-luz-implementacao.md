# Implementação — Calculadora de Conta de Luz

**Data:** 19/10/2026
**Branch:** `main`
**Rota:** `/tools/utilidades/conta-luz.html`

## Referência e decisões

A referência principal foi a **Calculadora de Orçamento Doméstico**, recentemente aprovada. Reutilizei o layout Factory, estrutura de formulário, validações, cards de resultado e fábrica `createResultActions`. Para favoritos, impressão e compartilhamento, a página usa os mecanismos compartilhados existentes; não foi criado armazenamento ou sistema paralelo.

O catálogo não continha ferramenta equivalente de estimativa de conta de energia. Como `data/categories.json` só oferece categorias técnicas predefinidas e não permite uma categoria doméstica nova sem ampliar o catálogo, a ferramenta foi registrada em **Utilidades** (`utilidades`) e incluída na página `/conversores.html`. A rota segue o padrão existente `/tools/<categoria>/<id>.html`.

## Fórmulas e validação

- **Modo consumo mensal:** custo de energia = consumo em kWh × tarifa efetiva informada; total estimado = custo de energia + custos adicionais.
- **Modo leituras:** consumo = leitura atual − leitura anterior; custo do período usa esse consumo medido e a tarifa informada.
- **Média diária:** consumo medido ÷ dias do período.
- **Média mensal estimada:** média diária × 30. É apresentada separadamente e não substitui o custo do período.
- Tarifa e consumo exigem valor numérico não negativo; custos adicionais são opcionais e vazios equivalem a zero. Consumo, tarifa e custos zero são aceitos. O período precisa ser inteiro de 1 a 366 dias e a leitura atual não pode ser menor que a anterior.
- Valores decimais com vírgula e agrupamento brasileiro são aceitos. Entradas inválidas, negativas e fora do limite suportado geram mensagem; resultados não exibem `NaN` nem `Infinity`.

Exemplos conferidos:

| Entrada | Resultado |
|---|---|
| 250,5 kWh × R$ 0,92/kWh + R$ 8,50 | energia R$ 230,46; total R$ 238,96 |
| leitura 12.450 → 12.700 kWh em 25 dias; tarifa R$ 0,80/kWh | consumo 250 kWh; custo do período R$ 200,00; média 10 kWh/dia; projeção 300 kWh/30 dias |
| consumo, tarifa e adicionais iguais a zero | total R$ 0,00 |

A tarifa é fornecida pelo usuário. O texto da página informa que a estimativa pode divergir da fatura por tributos, bandeiras, regras e tarifas da distribuidora, iluminação pública e outros componentes. A ferramenta não presume alíquotas nem consulta serviços externos. Os valores não são salvos ou enviados automaticamente; Compartilhar só encaminha o resumo ao mecanismo do dispositivo após ação explícita.

## Arquivos

Criados:

- `src/pages/tools/utilidades/conta-luz.page.html`
- `js/tools/conta-luz.js`
- `tests/conta-luz.test.js`
- `docs/conta-luz-implementacao.md`
- Capturas em `docs/conta-luz-capturas/` (estados inicial, mensal, leituras e inválido nos quatro viewports, mais PDF de impressão).

Modificados:

- `data/tools.json`: novo registro Factory publicado, categoria, URL e relações.
- `js/tools-catalog.js` e `sitemap.xml`: saídas regeneradas; comparação com o estado preexistente confirmou somente a inclusão da ferramenta/URL.
- `js/core/favorites.js`: inclusão do ID `conta-luz` no conjunto existente de IDs válidos.
- `css/style.css`: estilos específicos do formulário/radios, total e impressão. Na revisão visual, removi a borda nativa do fieldset e alinhei as opções à esquerda para combinar com os demais campos.
- `tests/build-html.test.js`, `tests/seo.test.js`, `tests/favorites.test.js`: atualização das expectativas de catálogo, páginas e assets e verificação da categoria correta.

## Testes e build

Os comandos foram inspecionados antes da execução. Como o build grava em `dist/` e `dist-pilot/`, `npm test`, `npm run build:data` e `npm run build:prod` foram executados em uma cópia de trabalho temporária. Os diretórios `dist/` e `dist-pilot/` do repositório não foram sobrescritos.

- `npm test`: **35 aprovados, 0 falhas, 0 ignorados**.
- `npm run build:data`: sucesso; **24 ferramentas** validadas, IDs/URLs únicos e relações válidas; sitemap com **52 URLs**.
- `npm run build:prod`: sucesso; **58 páginas e 75 assets** gerados.
- A página e `/favoritos.html` responderam **HTTP 200** no servidor local; a calculadora consta na página de Utilidades e no sitemap.
- `git diff --check`: passou.

Os testes cobrem fórmulas, decimais brasileiros, custos opcionais, valores zero, entradas vazias/inválidas/negativas, leituras regressivas, período inválido, registro de catálogo, geração, favorito e persistência compartilhada, compartilhamento sem parâmetros pessoais e uso dos handlers compartilhados de imprimir/compartilhar.

## Recursos compartilhados

- **Favoritar:** em Chrome, o botão atualizou `aria-pressed` para `true`, gravou `conta-luz` em `calculadoraMaster:favorites:v1`, preservou após recarregar e a calculadora apareceu em `/favoritos.html` com o link `/tools/utilidades/conta-luz.html`.
- **Compartilhar:** `createResultActions` foi exercitado com mock de `navigator.share`. O título foi “Calculadora de Conta de Luz — Calculadora Master”; a URL foi a própria rota, sem query string nem valores pessoais. O resumo foi incluído no texto compartilhado, conforme esperado. Nenhum conteúdo foi enviado a terceiros.
- **Imprimir:** o botão disparou `beforeprint`; o PDF foi gerado pelo Chrome headless. Em `@media print`, formulário, favorito e ações ficaram ocultos, enquanto o resultado permaneceu visível. Evidência em `docs/conta-luz-capturas/impressao.pdf`.

## Revisão visual e funcional

Página servida por HTTP local no build temporário. A revisão exercitou estado inicial, cálculo mensal, leituras, erro de leitura atual inferior, alternância de modo, limpeza e restauração do modo mensal. Não houve overflow horizontal nem erros JavaScript.

| Viewport | Inicial | Mensal | Leituras e médias | Validação | Alternância | Limpar | Impressão responsiva |
|---:|---|---|---|---|---|---|---|
| 320 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS — estilos comuns verificados no documento impresso |
| 360 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS — estilos comuns verificados no documento impresso |
| 768 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS — estilos comuns verificados no documento impresso |
| 1366 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS — PDF gerado e conferido |

Capturas e documento impresso: [`docs/conta-luz-capturas/`](conta-luz-capturas/).

Na primeira inspeção, o seletor de modo aparecia com a borda padrão do navegador e as opções centralizadas. Corrigi o CSS de forma restrita ao fieldset desta calculadora e repeti a suíte completa, os builds e a inspeção nos quatro viewports; a aparência final está nas capturas atualizadas.

## Preservação e pendências

Antes de editar, `git status --short` mostrou alterações e muitos backups preexistentes no projeto. Eles foram preservados; não foram restaurados, apagados nem sobrescritos. A geração de catálogo e sitemap foi feita primeiro na cópia temporária e aplicada ao repositório só após conferir que o delta gerado era a nova ferramenta. Não houve commit, push, deploy nem alteração de Firebase.

Sem defeitos pendentes conhecidos. A impressão foi verificada por automação headless e PDF, sem abrir diálogo gráfico do sistema. O compartilhamento foi mockado, sem enviar o resumo a um aplicativo ou pessoa. O valor é uma estimativa baseada na tarifa digitada e não pretende reproduzir a fatura real da distribuidora.
