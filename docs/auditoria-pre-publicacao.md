# Auditoria integrada de pré-publicação

**Data:** 19/10/2026
**Branch:** `main`
**Resultado atualizado:** os dois bloqueios técnicos foram eliminados. Build e auditoria local passam; a publicação remota não foi executada.

## Escopo e preservação

A auditoria cobre Orçamento Doméstico, Conta de Luz, Consumo de Água, Comparador de Preços por Unidade e Custo por Porção, além da suíte geral, catálogo, geração, sitemap e configuração de publicação.

Antes de editar, `git status --short`, `git branch --show-current`, `git diff` e os arquivos não rastreados foram inspecionados. A branch é `main`; as alterações preexistentes e numerosos backups foram preservados. Nenhuma calculadora foi alterada. Os testes e builds foram executados em cópias temporárias fiéis, sem `dist/` e `dist-pilot/`; as saídas preexistentes da raiz não foram sobrescritas. Não houve commit, push, deploy ou alteração no Firebase.

## Comandos executados e resultados

| Comando/verificação | Resultado |
| --- | --- |
| `git status --short`, `git diff` e inspeção de não rastreados | PASS — branch `main`; preexistentes/backups preservados |
| `git diff --check` na raiz e em `verify:ssg` na cópia com Git | PASS — sem erros de whitespace |
| `npm run build:data` em cópia limpa, sem `dist/` | PASS — 27 fontes/schema válidos; catálogo gerado e sitemap com 55 URLs |
| `npm run build:prod` após `build:data` | PASS — 61 páginas, 78 assets, validação completa de 27 ferramentas |
| `npm run verify:ssg` em cópia nova | PASS — 38/38 testes e sequência completa de produção |
| `npm run audit:prod` na cópia temporária | PASS — testes, build de dados e produção, equivalência `dist`/`dist-pilot`, ESM, SEO/integridade, HTTP, mobile 320 px e `diff-check` |
| Verificação de arquivos do diretório publicado | PASS — `.htaccess`, `sitemap.xml` e `robots.txt` existem e são cópias byte a byte das fontes geradas |
| Sitemap/robots | PASS — 55 URLs, 55 únicas; cinco rotas presentes uma vez cada; robots permite rastreamento e anuncia o sitemap configurado |
| Catálogo/rotas/favoritos/ações | PASS — 27 ferramentas; cinco rotas construídas; 38 testes cobrem as calculadoras, favoritos e ações compartilhadas |

Os builds completos foram executados em `/tmp/cm-build-fix-20261019-133448` e `/tmp/cm-verify-fix-20261019-133456`. O segundo inclui `.git` para que `verify:ssg` pudesse executar seu `git diff --check`; ambos foram criados sem `dist/` e `dist-pilot/` da raiz. O `audit:prod` só escreveu dentro da cópia temporária.

## Sequência de build e causa da falha

O validador exige fontes Factory e módulos JS; na validação completa, também exige o HTML compilado publicado em `dist/tools/...` ou `tools/...`. O HTML é criado por `scripts/build-html.js --scope=prod`.

Os scripts agora declaram:

- `build:data`: valida fontes/schema com `validate-tools.js --source-only` → gera catálogo e sitemap → repete a validação de fontes/schema.
- `build:prod`: `build:data` → compila páginas/assets → executa a validação completa, que exige os HTMLs publicados.
- `verify:ssg`: `npm test` → `build:prod` → `git diff --check`.
- `audit:prod.js`: chama `npm run build:data` e `npm run build:prod`, usando os comandos canônicos.

Antes da correção, a validação completa no início de `build:data` exigia HTMLs publicados e falhava em um checkout limpo. A correção preserva essa checagem completa, mas a move para depois da geração. `--source-only` não ignora validação de schema, categoria, relações, unicidade, URL, página-fonte ou módulo; apenas difere a checagem de HTML publicado até a etapa em que o build já o criou. `build:prod` termina executando o validador completo.

A sequência oficial reproduzida desde cópias sem saídas é:

```sh
npm run verify:ssg
```

Também foi executado `npm run build:data` diretamente sem `dist/`; ele passou. `build:prod` gera o sitemap atual antes de compilar e só então exige que as 27 páginas publicadas existam. O ciclo está sem dependência circular e mantém a validação final. Os testes de `audit:prod` também passaram em cópia temporária.

## Catálogo, rotas e sitemap

| Ferramenta | Cadastro | Categoria | Rota gerada | Sitemap |
| --- | ---: | --- | --- | ---: |
| Orçamento Doméstico | 1 | Financeiro | `/tools/financas/orcamento-domestico.html` | 1 ocorrência |
| Conta de Luz | 1 | Utilidades | `/tools/utilidades/conta-luz.html` | 1 ocorrência |
| Consumo de Água | 1 | Utilidades | `/tools/utilidades/consumo-agua.html` | 1 ocorrência |
| Comparador de Preços por Unidade | 1 | Utilidades | `/tools/utilidades/comparador-precos.html` | 1 ocorrência |
| Custo por Porção | 1 | Utilidades | `/tools/utilidades/custo-por-porcao.html` | 1 ocorrência |

As cinco rotas foram encontradas na saída compilada, registradas uma vez no catálogo e uma vez no sitemap. O catálogo contém 27 ferramentas no total. O sitemap de produção contém 55 URLs únicas. Os testes gerais incluem geração, Factory, SEO e favoritos; a validação completa passou após `build:prod`.

## Funcionalidade e regressão

Os relatórios específicos consultados foram:

- `docs/orcamento-domestico-implementacao.md`
- `docs/conta-luz-implementacao.md`
- `docs/consumo-agua-implementacao.md`
- `docs/comparador-precos-implementacao.md`
- `docs/custo-por-porcao-implementacao.md`

O código auditado mantém as cinco entradas no registro único e as rotas correspondentes. Os módulos das ferramentas usam o mecanismo compartilhado de favoritos (`js/core/favorites.js`) e ações de resultado (`js/core/result-actions.js`), sem sistemas paralelos. As URLs compartilhadas são as rotas canônicas e não recebem leituras, preços, ingredientes ou dados de orçamento como parâmetros. O Custo por Porção usa o helper compartilhado para ações e compartilha somente título/URL. Os relatórios e testes registram persistência, remoção, listagem em `/favoritos.html`, impressão com controles ocultos e uso das ações compartilhadas.

Os cinco módulos e testes específicos foram incluídos na suíte. A validação funcional dos relatórios registra casos de fórmula, unidades compatíveis, entradas zero/vazias/inválidas, modos/linhas dinâmicas, arredondamento de apresentação, compartilhamento sem dados pessoais e impressão. O exemplo obrigatório do Custo por Porção resulta em R$ 2,40 de arroz + R$ 2,00 de molho = R$ 4,40, ou R$ 1,10 por porção. Não foi observada regressão automatizada nas ferramentas antigas: os 38 testes gerais passaram.

### Revisão visual agregada

Os relatórios de implementação e suas capturas documentam a revisão responsiva, sem overflow horizontal, nos tamanhos pedidos. As matrizes registradas cobrem os estados principais de cada ferramenta; a cobertura por estado varia entre relatórios. A impressão foi verificada por emulação/PDF nas ferramentas. Esta auditoria integrou essas evidências e não iniciou uma nova sessão de navegador para repetir todos os estados.

| Viewport | Evidência documentada para as cinco ferramentas | Overflow horizontal |
| --- | --- | --- |
| 320 px | PASS | Não relatado |
| 360 px | PASS | Não relatado |
| 768 px | PASS | Não relatado |
| 1366 px | PASS | Não relatado |

As evidências estão em `docs/orcamento-domestico-capturas/`, `docs/conta-luz-capturas/`, `docs/consumo-agua-capturas/`, `docs/comparador-precos-capturas/` e `docs/custo-por-porcao-capturas/`. A cobertura de impressão em larguras menores que desktop não foi realizada separadamente nos relatórios de Orçamento Doméstico; os estilos de impressão foram verificados em desktop.

## Publicação na Hostinger e rollback

O build de produção copia `.htaccess`, `sitemap.xml` e `robots.txt` para a raiz de `dist/`. Os dois arquivos SEO são copiados depois da geração do sitemap e foram comparados byte a byte com as fontes. O sitemap mantém o domínio já configurado em `scripts/generate-sitemap.js`; o `robots.txt` correspondente permite `/` e referencia esse sitemap. Nenhum domínio novo foi introduzido. O `.htaccess` contém `DirectoryIndex`, desativa listagem de diretório, redireciona HTTPS/`www` e configura rotas sem extensão/404.

Não há configuração ou instrução Hostinger no repositório que determine o document root remoto ou faça upload. Por isso, não foi presumido `public_html` ou outro destino: a saída testada é autocontida, mas a seleção do diretório remoto deve seguir a configuração real da conta antes do upload.

Publicar somente o conteúdo de `dist/`, nunca a raiz do checkout. Assim não se incluem fontes, testes, documentos, backups ou arquivos locais. `.gitignore` não substitui uma lista permitida de publicação. Antes do upload, usar a cópia de release validada e guardar uma cópia íntegra do conteúdo remoto atual; após o upload, executar smoke tests das rotas principais e das cinco ferramentas. Para rollback, restaurar exatamente a cópia remota anterior, sem depender de `git revert` ou de novo build.

Não foi possível confirmar o destino remoto, permissões, modo de upload ou rollback no painel Hostinger porque esses dados/configurações não constam do repositório e nenhum acesso à produção foi utilizado.

## Problemas, gravidade e correção mínima

| Gravidade | Estado | Causa/correção |
| --- | --- | --- |
| Alta — sequência de build | **Resolvido** | `build:data` valida fontes antes da compilação e valida artefatos completos depois; `build:prod` gera dados, compila e roda o validador completo. `verify:ssg` e `audit:prod` passam desde cópia sem saídas. |
| Alta — sitemap/robots ausentes da saída | **Resolvido** | `copyProductionConfig()` agora copia `.htaccess`, `sitemap.xml` e `robots.txt`; teste confere conteúdo, rotas do sitemap, unicidade e permissão pública no robots. |
| Operacional — destino remoto Hostinger | **Pendente de configuração externa** | O repositório não informa o document root da conta nem procedimento de upload. Confirmar o destino no ambiente Hostinger; esta auditoria não presume caminho nem acessou produção. |

## Limitações desta auditoria

- `audit:prod` foi executado na cópia temporária; suas saídas representam essa cópia, não a saída antiga ignorada na raiz.
- A revisão visual de 320/360/768/1366 px continua agregada dos relatórios individuais; `audit:prod` nesta rodada testou mobile em 320 px.
- O conteúdo atualmente publicado, o document root e as permissões da Hostinger não foram verificados. Nenhum ambiente remoto foi acessado.

## Conclusão

**Os dois bloqueios técnicos foram eliminados.** `verify:ssg` e `audit:prod` passam em cópia temporária limpa; o build final contém 27 ferramentas, 61 páginas, 78 assets, 55 URLs únicas no sitemap e os três arquivos de raiz pública (`.htaccess`, `sitemap.xml`, `robots.txt`). As cinco rotas aparecem uma vez no catálogo e no sitemap. A publicação não foi executada. Antes de enviar, confirme no painel Hostinger qual é o document root configurado e publique somente o conteúdo validado de `dist/`; essa informação não existe no repositório.
