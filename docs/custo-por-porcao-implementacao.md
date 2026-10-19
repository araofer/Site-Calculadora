# Calculadora de Custo por Porção — implementação

## Referência e reuso

A referência principal foi o Comparador de Preços por Unidade. A nova tela reutiliza sua estrutura de linhas dinâmicas e os fatores de conversão exportados em `COMPARISON_UNITS`; assim, não duplica os fatores de mg/g/kg ou mL/L. Também reutiliza `parseMoneyInput` do Orçamento Doméstico, `parseEnergyNumber` da Conta de Luz, `createResultActions` para copiar/imprimir e `shareResult` para compartilhar somente o título e a URL canônica. Favoritar continua usando o botão e a persistência globais.

Antes da implementação, a raiz foi confirmada como `/home/araofer/Documentos/github/CalculadoraMaster`, na branch `main`. O catálogo não continha o identificador `custo-por-porcao` nem uma ferramenta equivalente. A geração Factory deriva página e asset do catálogo e dos arquivos-fonte, sem categoria ou mecanismo de registro paralelo.

## Arquivos

Criados:

- `src/pages/tools/utilidades/custo-por-porcao.page.html`
- `js/tools/custo-por-porcao.js`
- `tests/custo-por-porcao.test.js`
- `docs/custo-por-porcao-capturas/` (capturas PNG e PDF)
- `docs/custo-por-porcao-implementacao.md`

Modificados para integrar a ferramenta:

- `data/tools.json` (registro Factory `custo-por-porcao`, categoria `Utilidades`)
- `js/core/favorites.js` (ID aceito pelo mecanismo existente)
- `js/tools-catalog.js` e `sitemap.xml` (gerados pelos scripts do projeto)
- `css/style.css` (layout dos ingredientes e regras de impressão)
- `tests/build-html.test.js`, `tests/favorites.test.js` e `tests/seo.test.js` (rota e contagens do catálogo/build)

Não foram alterados `dist/`, `dist-pilot/`, `js/core/result-actions.js`, Firebase ou mecanismos compartilhados de ação.

## Unidades e fórmulas

Unidades aceitas:

- **Massa:** mg, g e kg, normalizadas em kg.
- **Volume:** mL e L, normalizados em L.
- **Contagem:** unidade.

Em cada ingrediente, unidade da embalagem e unidade utilizada precisam pertencer à mesma dimensão. A ferramenta rejeita combinações incompatíveis e não converte massa em volume nem usa equivalências culinárias. Unidades de comprimento que existem no comparador não são oferecidas para custo de receita.

Com preço da embalagem `P`, quantidade na embalagem normalizada `Qe` e quantidade usada normalizada `Qu`:

```text
custoIngrediente = P × Qu / Qe
custoReceita = soma dos custos dos ingredientes
custoPorPorcao = custoReceita / numeroDePorcoes
```

Os intermediários mantêm precisão completa; a formatação final é em reais brasileiros. Preço zero é aceito para ingredientes sem custo de compra informado. Quantidades da embalagem e usadas, bem como o rendimento, precisam ser maiores que zero.

### Exemplo obrigatório verificado

| Ingrediente | Embalagem | Uso | Custo proporcional |
| --- | --- | --- | ---: |
| Arroz | 1 kg por R$ 8,00 | 300 g | R$ 2,40 |
| Molho | 300 g por R$ 4,00 | 150 g | R$ 2,00 |

Para 4 porções, o custo total é **R$ 4,40** e o custo por porção é **R$ 1,10**. Os valores foram confirmados pelo teste de cálculo e no navegador.

## Validação e experiência

A tela aceita nome de receita opcional, rendimento obrigatório e até 20 ingredientes. Cada linha tem ID único e estável, campos de nome, preço da embalagem, quantidade/unidade da embalagem e quantidade/unidade usada. Adicionar e remover mantém dados das outras linhas; ao atingir 20, o botão é desabilitado e aparece a mensagem do limite. Limpar restaura uma linha vazia, remove erros e resultados e permite novo cálculo.

São validados nome do ingrediente, campos incompletos, preços inválidos/negativos, quantidades zero/negativas, unidades inexistentes ou incompatíveis, porções vazias, inválidas, zero ou negativas e tentativa de calcular sem ingredientes. Valores negativos não são convertidos. O formulário não grava preços nem receitas em `localStorage`.

## Testes e builds

Os comandos foram inspecionados e os testes/builds foram executados em `/tmp/cm-custo-porcao-20261019`, uma cópia temporária sem os diretórios raiz `dist/` e `dist-pilot/`:

- `npm test`: **38 arquivos de teste aprovados, 0 falhas**.
- `npm run build:prod`: **61 páginas e 78 assets**, concluído.
- `npm run build:data`: **27 ferramentas validadas**; sitemap com **55 URLs**, concluído.
- `git diff --check`: concluído sem erros.

O build de produção foi executado antes do build de dados, porque o validador do catálogo exige páginas Factory compiladas. Duas tentativas de `npm run build:data` diretamente na raiz falharam nessa pré-condição: as páginas compiladas das ferramentas Factory não estavam presentes no `dist/` da raiz. O validador apontou cinco arquivos compilados ausentes. Nenhum `dist/` foi modificado por essas tentativas; `build:data` passou na cópia temporária depois de `build:prod`. Os scripts `generate:catalog` e `generate:sitemap` também foram executados na raiz, gerando o catálogo de 27 ferramentas e o sitemap de 55 URLs.

## Favoritar, Compartilhar e Imprimir

- **Favoritar:** no navegador, inclusão, estado salvo em `localStorage`, permanência após recarga, exibição em `/favoritos.html` e remoção foram confirmadas. Há também teste automatizado específico para adicionar/remover o ID, preservar outros favoritos e ler o valor persistido.
- **Compartilhar:** a API do navegador foi simulada. O payload contém o título da Calculadora de Custo por Porção e a URL canônica da ferramenta; o texto de fallback é apenas essa URL. Nenhum ingrediente, nome de receita, preço ou quantidade foi incluído, e nada foi enviado externamente.
- **Imprimir:** a emulação confirmou o formulário e os controles ocultos, com resultados visíveis. O PDF foi criado e seu texto extraído foi conferido: contém nome da receita, rendimento, total, custo por porção, ingrediente, quantidade usada, preço/quantidade da embalagem e custo proporcional.

## Revisão visual

A saída temporária foi servida por HTTP e testada em Chrome headless. Foram verificados estado inicial, exemplo calculado, erro por unidades incompatíveis, inclusão/remoção preservando os demais campos, Limpar, recálculo, favorito, compartilhamento e impressão. A largura rolável foi comparada à largura útil do documento; não há overflow horizontal.

| Viewport | Inicial | Receita calculada | Inválido | Adicionar/remover | Limpar/recalcular | Impressão | Overflow |
| ---: |:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 320 px | PASS | PASS | PASS | PASS | PASS | PASS | Não |
| 360 px | PASS | PASS | PASS | PASS | PASS | PASS | Não |
| 768 px | PASS | PASS | PASS | PASS | PASS | PASS | Não |
| 1366 px | PASS | PASS | PASS | PASS | PASS | PASS | Não |

Evidências em `docs/custo-por-porcao-capturas/`: estados inicial e resultado em 320, 360, 768 e 1366 px; inválido e Limpar em 360 px; `impressao.pdf`. A impressão foi conferida também extraindo o texto do PDF.

## Limitações e pendências

O cálculo considera apenas preço e quantidade informados. Não calcula preço de venda, lucro, margem, comissão, desperdício ou equivalências culinárias; não cobre ingredientes que demandem conversão entre massa e volume. Não há pendências conhecidas de implementação.

## Preservação

As alterações preexistentes e os backups já presentes no estado inicial foram preservados. Os testes e builds usaram a cópia temporária para não sobrescrever `dist/` nem `dist-pilot/`; estes diretórios na raiz foram mantidos. Não houve commit, push, deploy ou alteração no Firebase de produção.
