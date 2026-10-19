# Comparador de Preços por Unidade — implementação

## Referência e integração

A referência principal foi a Calculadora de Orçamento Doméstico: ela já utiliza linhas dinâmicas de formulário e ações de resultado compartilhadas. Foram reutilizados o parser monetário `parseMoneyInput`, o parser numérico já usado pela Conta de Luz e `createResultActions`; a página também reutiliza o componente de Favoritos do site. Não foi criado outro mecanismo de Favoritar, Imprimir ou Compartilhar.

A nova ferramenta está registrada como `comparador-precos`, categoria técnica `Utilidades`, na URL `/tools/utilidades/comparador-precos.html`. O catálogo gerado, a navegação e o sitemap incluem a página. A validação encontrou 26 ferramentas no catálogo após a inclusão. Não foi encontrada ferramenta equivalente antes da implementação.

## Arquivos

Criados:

- `src/pages/tools/utilidades/comparador-precos.page.html`
- `js/tools/comparador-precos.js`
- `tests/comparador-precos.test.js`
- `docs/comparador-precos-capturas/` (capturas PNG e PDF)
- `docs/comparador-precos-implementacao.md`

Modificados para integrar a ferramenta:

- `data/tools.json`
- `js/core/favorites.js` (lista compartilhada de IDs permitidos)
- `js/tools-catalog.js` e `sitemap.xml` (saídas geradas)
- `css/style.css` (layout responsivo e regras de impressão)
- `tests/build-html.test.js`, `tests/favorites.test.js` e `tests/seo.test.js`

Nenhum mecanismo compartilhado de ações foi alterado.

## Unidades e cálculos

As dimensões são mantidas separadas: massa (mg, g, kg), volume (mL, L), comprimento (mm, cm, m) e quantidade (unidade). Os fatores normalizam massa em kg, volume em L e comprimento em m. Unidades de dimensões diferentes são rejeitadas.

Para cada produto, com preço de uma embalagem `P`, quantidade por embalagem `Q`, fator de conversão `F` e número de embalagens `N`:

```text
precoTotal = P × N
quantidadeTotal = Q × F × N
precoUnitario = precoTotal / quantidadeTotal
```

A comparação usa valores sem arredondamento intermediário. A apresentação informa preço total, quantidade normalizada, preço unitário, menor preço unitário, diferença entre maior e menor preço unitário, economia percentual quando existe diferença e economia estimada na maior quantidade total informada. O menor desembolso total aparece separadamente da opção com menor preço unitário. Empates são identificados; em empate não há percentual fictício.

Exemplo validado: 500 g por R$ 8,00 resultam em R$ 16,00/kg; 1 kg por R$ 14,00 resulta em R$ 14,00/kg. A segunda opção tem menor preço unitário, com diferença de R$ 2,00/kg e economia de 12,5% sobre a opção mais cara. A primeira opção ainda exige menor desembolso total.

## Validação e experiência

O formulário permite de 2 a 5 produtos, dá a cada linha um ID estável único, inicia embalagens em 1 e preserva os campos das outras linhas ao adicionar/remover. Valida campos obrigatórios, valores monetários e quantidades, valores negativos, quantidades zero, embalagens não inteiras ou inválidas, identificadores duplicados e dimensões incompatíveis. O botão Limpar restaura duas linhas, remove erros/resultados e permite recalcular. Alterações e remoções invalidam resultados anteriores. Entradas inválidas não são convertidas silenciosamente em valores positivos.

## Testes e builds

Executados em uma cópia temporária do repositório, preservando `dist/` e `dist-pilot/` existentes:

- `npm test`: **37 testes aprovados, 0 falhas**.
- `npm run build:prod`: **60 páginas e 77 assets**, concluído.
- `npm run build:data`: **26 ferramentas validadas** e sitemap com **54 URLs**, concluído.
- `git diff --check`: concluído sem erros.

O build de produção foi executado antes de `build:data`, conforme a dependência de páginas compiladas do validador. `dist/` e `dist-pilot/` na raiz não foram sobrescritos. Nenhum teste ou build foi executado diretamente sobre esses diretórios existentes.

## Favoritar, Compartilhar e Imprimir

- **Favoritar:** verificado no navegador: inclusão, remoção, estado após recarga e presença na listagem `/favoritos.html`. A persistência usa o armazenamento já existente do site.
- **Compartilhar:** verificado com a API de compartilhamento simulada: título e URL canônicos da ferramenta, sem parâmetros com preços, quantidades ou outros dados dos produtos. Não houve envio externo.
- **Imprimir:** verificado por emulação de impressão e PDF: controles/formulário ficam ocultos e a área de resultados permanece visível, com produtos e valores comparados.

## Revisão visual

Revisão feita servindo o build temporário por HTTP e verificando estado inicial, comparação válida, incompatibilidade, empate, Limpar/recalcular, adição/remoção, favoritos e impressão. A checagem visual mediu ausência de overflow horizontal nas larguras testadas. A sessão de navegador usada nessa rodada foi encerrada; uma tentativa de reabri-la depois foi bloqueada pelo sandbox. As capturas da revisão concluída estão em `docs/comparador-precos-capturas/`.

| Viewport | Inicial | Comparação | Inválido/incompatível | Adicionar/remover | Empate | Limpar/recalcular | Impressão | Overflow horizontal |
| ---: |:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 320 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS | Não |
| 360 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS | Não |
| 768 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS | Não |
| 1366 px | PASS | PASS | PASS | PASS | PASS | PASS | PASS | Não |

Arquivos de evidência incluem os estados iniciais de 320, 360, 768 e 1366 px; comparação, incompatibilidade, empate, Limpar em 1366 px; e `impressao.pdf`.

## Limitações e pendências

A estimativa compara somente preço e quantidade declarados. Não considera qualidade, promoções, frete, perdas, marcas, restrições de compra ou regras comerciais. A unidade de área não foi incluída. Os cálculos não afirmam equivalência física ou econômica entre dimensões diferentes.

Não há pendências de implementação conhecidas. A revisão visual foi concluída na sessão local anterior; não foi possível reabrir o navegador na tentativa final por restrição do sandbox.

## Preservação

A branch permaneceu `main`. As alterações preexistentes e arquivos de backup listados no estado inicial foram preservados; as mudanças desta implementação foram limitadas aos arquivos descritos acima. Nenhum commit, push, deploy ou alteração no Firebase de produção foi realizado.
