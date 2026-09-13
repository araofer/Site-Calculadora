# Arquitetura do Projeto — Calculadora Master

Este documento estabelece as diretrizes arquiteturais, o modelo de dados, os padrões de automação e o planejamento técnico para a evolução escalável do **Calculadora Master**.

---

## 1. Visão Geral e Filosofia

O **Calculadora Master** é uma plataforma de calculadoras e ferramentas utilitárias online gratuitas. Seus pilares fundamentais são:

1. **HTML Estático Nativo e Indexável (SEO-First)**: Conteúdo e links essenciais são renderizados no próprio documento HTML, garantindo rastreamento imediato por motores de busca (Google, Bing) e tempos de carregamento instantâneos (TTFB e LCP mínimos).
2. **Zero Frameworks Pesados**: Não são utilizados frameworks SPA pesados (React, Vue, Angular) em tempo de execução. Todo o comportamento interativo é baseado em JavaScript Vanilla de alta performance.
3. **Segurança e Acessibilidade**: Validação rigorosa de entradas de dados, formatação localizada em Real brasileiro (pt-BR), manipulação segura do DOM (evitando interpolações diretas de strings em `innerHTML`) e conformidade com WCAG (títulos hierárquicos, contrastes adequados, navegação por teclado).
4. **Modularidade e Governança**: Capacidade de crescer de 15 para dezenas ou centenas de ferramentas com governança centralizada de metadados, validação contínua e automação de catálogos e sitemaps.

---

## 2. Camada de Dados: Fonte Única da Verdade (`data/tools.json`)

Para evitar a manutenção manual dispersa em múltiplos arquivos (`index.html`, `js/tools-catalog.js`, `sitemap.xml`, páginas de categorias), toda a informação sobre as ferramentas passa a residir em:

📂 `data/tools.json`

### Schema Oficial

Cada ferramenta possui a seguinte estrutura:

| Propriedade | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `string` | Identificador único e estável (ex: `financiamento-carro`). |
| `slug` | `string` | Slug para rotas e URLs amigáveis. |
| `name` | `string` | Nome canônico e legível da ferramenta. |
| `category` | `string` | Categoria oficial (deve pertencer à lista de categorias válidas). |
| `categorySlug` | `string` | Identificador da categoria (ex: `financas`, `trabalhista`, `saude`). |
| `description` | `string` | Resumo claro e persuasivo da funcionalidade (uma frase). |
| `url` | `string` | Caminho relativo real do arquivo HTML no repositório (ex: `/tools/financas/financiamento-carro.html`). |
| `keywords` | `array` | Termos e sinônimos pesquisáveis para o motor de busca. |
| `related` | `array` | Lista de IDs de ferramentas relacionadas (máx. 4, sem auto-recomendações). |
| `featured` | `boolean`| Se a ferramenta deve ser destacada na página inicial. |
| `status` | `string` | Ciclo de vida: `published`, `draft`, `deprecated`. |

### Categorias Oficiais

Definidas centralmente para organizar a taxonomia lógica:
1. **Financeiro** (slug: `financas`)
2. **Trabalhista** (slug: `trabalhista`)
3. **Matemática** (slug: `matematica`)
4. **Saúde** (slug: `saude`)
5. **Conversores** (slug: `conversores`)
6. **Utilidades** (slug: `utilidades`)

### Desacoplamento: Categoria Lógica vs. Pasta Física

Historicamente, ferramentas foram organizadas em pastas como `tools/financas/`, `tools/saude/`, `tools/utilidades/` e `tools/trabalhista/`. Algumas calculadoras matemáticas (ex: `porcentagem.html`) estão fisicamente na pasta `financas/`.

**Diretriz Arquitetural Permanente**:  
A categoria lógica é configurada no `data/tools.json` (ex: `category: "Matemática"`), mas o arquivo físico e a URL pública permanecem inalterados. **Nunca movemos arquivos HTML existentes nem alteramos URLs canônicas**, protegendo backlinks, rankings no Google e a experiência do usuário.

---

## 3. Pipeline de Automação e Validação

Para assegurar integridade contínua, criamos três scripts em Node.js puro (sem dependências externas):

### 1. `scripts/validate-tools.js` (`npm run validate:tools`)
Executa verificações rigorosas:
- Unicidade de `id`, `slug` e `url`.
- Existência física do arquivo HTML apontado por `url` no disco.
- Integridade relacional: todo item em `related` deve apontar para um `id` válido e existente.
- Prevenção de auto-recomendações.
- Limite máximo de 4 itens por ferramenta.
- Validação de campos obrigatórios, categorias e status.
- Retorna exit code `0` em caso de sucesso e `1` com relatório descritivo se houver inconformidades.

### 2. `scripts/generate-catalog.js` (`npm run generate:catalog`)
Compila `data/tools.json` diretamente em `js/tools-catalog.js`.
- Mantém retrocompatibilidade total com a API consumida pela Busca Universal da Home (`home-search.js`).
- Expõe métodos de busca, normalização, acesso por ID e obtenção de relacionados (`searchToolsCatalog`, `getToolById`, `getRelatedTools`).
- Gera arquivo compatível com navegadores (`window.TOOLS_CATALOG`) e Node.js (`module.exports`).
- Preserva estritamente as quebras de linha CRLF.

### 3. `scripts/generate-sitemap.js` (`npm run generate:sitemap`)
Gera `sitemap.xml` atualizado:
- Inclui a raiz (`/`), páginas de categoria e institucionais.
- Inclui todas as ferramentas com `status: "published"`.
- Varre e inclui automaticamente todos os artigos existentes em `blog/artigos/`.
- Preserva quebras de linha LF originais do sitemap.

### Comando Único de Compilação
```bash
npm run build:data
```
Executa a validação, gera o catálogo JS, gera o sitemap e valida novamente a saída.

---

## 4. Modularização JavaScript (ES Modules Nativos)

Adotamos o padrão de **ECMAScript Modules (ESM) nativos** para todas as ferramentas migradas. Até o momento, 7 ferramentas estão 100% modularizadas:

**Piloto (3 ferramentas):**
1. **Financiamento de Carro** (`tools/financas/financiamento-carro.html`) ➔ [`js/tools/financiamento-carro.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/financiamento-carro.js) (importa [`js/core/currency.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/core/currency.js))
2. **Calculadora de Idade** (`tools/saude/idade.html`) ➔ [`js/tools/idade.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/idade.js)
3. **Gerador de Senha** (`tools/utilidades/senha.html`) ➔ [`js/tools/senha.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/senha.js)

**Lote 1 Migrado (4 ferramentas financeiras):**
4. **Financiamento de Imóveis (SAC)** (`tools/financas/financiamento-imovel.html`) ➔ [`js/tools/financiamento-imovel.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/financiamento-imovel.js) (importa [`js/core/currency.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/core/currency.js))
   - Função pura: `calcularFinanciamentoSAC(params)` (alias: `calcularFinanciamentoImovel`)
   - Testes: `tests/financiamento-imovel.test.js`
5. **Calculadora de Juros** (`tools/financas/juros.html`) ➔ [`js/tools/juros.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/juros.js)
   - Funções puras: `calcularJurosSimples(params)`, `calcularJurosCompostos(params)`
   - Testes: `tests/juros.test.js`
6. **Calculadora de Desconto** (`tools/financas/desconto.html`) ➔ [`js/tools/desconto.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/desconto.js)
   - Função pura: `calcularDesconto(params)`
   - Testes: `tests/desconto.test.js`
7. **Calculadora de Lucro e Margem** (`tools/financas/lucro.html`) ➔ [`js/tools/lucro.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/lucro.js)
   - Função pura: `calcularLucro(params)`
   - Testes: `tests/lucro.test.js`

### Estrutura Implementada

```text
js/
  core/
    package.json      # {"type": "module"} - escopo ESM isolado
    currency.js       # Módulo ES puro: parseBRLCurrency, formatBRLCurrencyInput, formatBRL

  tools/
    package.json      # {"type": "module"} - escopo ESM isolado
    financiamento-carro.js   # ESM: Price + bindings data-action
    financiamento-imovel.js  # ESM: SAC + bindings data-action
    juros.js                 # ESM: Juros simples e compostos + bindings data-action
    desconto.js              # ESM: Desconto percentual + bindings data-action
    lucro.js                 # ESM: Lucro bruto e margem + bindings data-action
    porcentagem.js           # ESM: Cálculo de porcentagem + bindings data-action
    dividir-conta.js         # ESM: Fechamento de conta entre pessoas + bindings data-action
    imc.js                   # ESM: Índice de Massa Corporal + bindings data-action
    horas-extras.js          # ESM: Horas extras trabalhistas + bindings data-action
    combustivel.js           # ESM: Consumo e custo de viagem + bindings data-action
    contador.js              # ESM: Contagem de caracteres e palavras + bindings data-action
    qr-code.js               # ESM: Validação e integração com QRCode.js + bindings data-action
    whatsapp.js              # ESM: Sanitização e links wa.me + bindings data-action
    idade.js                 # ESM: Idade exata local + bindings data-action
    senha.js                 # ESM: Web Crypto API + rejection sampling + bindings data-action

  home-search.js      # Controlador de busca universal da página inicial
  tools-catalog.js    # Catálogo central compilado

tests/
  package.json        # {"type": "module"} - escopo ESM de testes
  currency.test.js    # Testes unitários com node:test e node:assert
  financiamento-carro.test.js
  financiamento-imovel.test.js
  juros.test.js
  desconto.test.js
  lucro.test.js
  porcentagem.test.js
  dividir-conta.test.js
  imc.test.js
  horas-extras.test.js
  combustivel.test.js
  contador.test.js
  qr-code.test.js
  whatsapp.test.js
  idade.test.js
  senha.test.js
```

### Decisão Arquitetural: Adoção de ES Modules Nativos e Isolamento de Escopo

1. **Eliminação Total de Atalhos Globais (`window.*`)**:
   - Foram completamente banidos atalhos como `window.limparCampos`, `window.gerarSenha`, `window.calcularIdade` e `window.calcularFinanciamento`.
   - Cada ferramenta é um módulo isolado. Não há poluição de escopo global nem risco de colisão de nomes entre ferramentas distintas.
2. **Isolamento de Escopo com Subdiretórios `package.json`**:
   - A raiz do repositório (`package.json`) e a pasta `scripts/` permanecem em CommonJS tradicional, garantindo que o pipeline existente (`npm run build:data`, `validate-tools.js`, etc.) continue funcionando sem necessidade de transpiladores.
   - Os subdiretórios `js/core/`, `js/tools/` e `tests/` possuem arquivos `package.json` individuais com `{"type": "module"}`, permitindo que o Node.js e os navegadores tratem esses arquivos diretamente como ES Modules (`import`/`export`).
3. **Servidor HTTP Local para Desenvolvimento**:
   - Por especificação dos padrões web, módulos ES (`<script type="module">`) estão sujeitos a políticas de CORS e segurança do navegador e não carregam sobre o protocolo direto `file:///`.
   - Para rodar o ambiente de desenvolvimento local, basta subir qualquer servidor estático HTTP simples:
     ```bash
     npx serve .
     # ou
     python3 -m http.server 8000
     ```

### Eventos Semânticos (`data-action`) vs. Inspeção de Texto Visível

Para eliminar a fragilidade de seletores baseados em texto visível dos botões (`textContent.includes("limpar")`), estabeleceu-se o padrão obrigatório de atributos semânticos:
- `data-action="calculate"`: Ações de cálculo principal (ex: Calcular Idade, Calcular Financiamento, Calcular Horas Extras, Calcular Consumo).
- `data-action="clear"`: Ações de limpeza e redefinição de campos.
- `data-action="generate"`: Ações de geração de dados (ex: Gerar Senha Forte, Gerar QR Code, Gerar Link WhatsApp).
- `data-action="generate-fields"`: Geração de campos dinâmicos (ex: Dividir Conta).
- `data-action="copy"`: Ações de cópia para a área de transferência (ex: Copiar Senha, Copiar Link WhatsApp).
- `data-action="download"`: Ações de download de arquivos gerados (ex: Baixar QR Code em PNG).

Vantagens:
- Desacopla completamente a lógica JavaScript da redação ou tradução dos textos dos botões.
- Previne quebras se o texto for alterado por copywriting ou testes A/B.
- Não requer atributos inline legados (`onclick="..."`, `oninput="..."`).

### Integração com Bibliotecas Externas e Exceção do QR Code (QRCode.js)

- A ferramenta de QR Code utiliza a biblioteca oficial `qrcodejs` carregada via CDN tradicional (`https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js`).
- **Exceção Arquitetural Documentada**: Bibliotecas de terceiros que expõem seu construtor no escopo global (`window.QRCode`) são consumidas defensivamente pelo módulo ESM [`js/tools/qr-code.js`](../js/tools/qr-code.js), sem que o módulo registre qualquer variável ou função global própria.
- Isso preserva a estabilidade e a qualidade visual da renderização sem introduzir pacotes npm, dependências pesadas ou bundlers no pipeline estático.

### Padronização Monetária Brasileira e Suporte a Negativos (`js/core/currency.js`)

O módulo central de moeda foi blindado com:
1. `parseBRLCurrency(valor, opcoes)`: Converte formatos como `"50.000,00"`, `"1.234,56"`, `1500` para número real. Trata defensivamente `NaN`, `Infinity`, `-Infinity`, strings vazias e `null`.
   - **Suporte arquitetural a negativos**: Possui `{ allowNegative: false }` por padrão (retornando `0` para entradas negativas não autorizadas). Quando `{ allowNegative: true }`, preserva e calcula valores negativos (ex: `"-50,00"` ➔ `-50`).
2. `formatBRLCurrencyInput(input, opcoes)`: Máscara dinâmica em tempo real para campos `<input>`. Se os dígitos forem apagados, o campo permanece vazio (`""`), sem forçar `"0,00"`. Suporta sinal negativo quando `allowNegative: true`.
3. `formatBRL(valor, opcoes)`: Formatação visual no padrão brasileiro (`1.250,00` ou `R$ 1.250,00`).

### Criptografia Segura e Tratamento Defensivo (`js/tools/senha.js`)

- Utiliza exclusivamente a **Web Crypto API** (`crypto.getRandomValues`) com algoritmo de amostragem por rejeição (*rejection sampling*) sobre módulo $2^{32}$ (`range = 4294967296`), garantindo distribuição uniforme sem viés de módulo.
- **Zero uso de `Math.random()`**.
- Tratamento defensivo caso o ambiente não possua Web Crypto API ou suporte à Clipboard API (com fallback de cópia via `document.execCommand`).

### Testes Automatizados Nativos (`node:test`)

Para manter a filosofia de **Zero Frameworks e Zero Dependências NPM**, todos os testes utilizam os módulos nativos do Node.js:
- Framework: `node:test`
- Asserções: `node:assert/strict`
- Execução: `npm test` (dispara `node --test tests/*.test.js`)
- Execução instantânea (menos de 650ms para a suíte completa com 104 testes).

### Status da Migração ESM: 15/15 Ferramentas Migradas (100% Concluído)

Para migrar cada uma das ferramentas restantes:
1. Crie `js/tools/<id>.js` como ES Module nativo.
2. Isole a regra de cálculo em uma função pura exportável (ex: `export function calcularX(params) { ... }`).
3. Crie a função de setup da interface (ex: `export function setupX() { ... }`) utilizando seletores semânticos:
   - `document.querySelector('[data-action="calculate"]')`
   - `document.querySelector('[data-action="clear"]')`
4. Na página HTML `tools/<categoria>/<slug>.html`:
   - Adicione os atributos `data-action` aos botões correspondentes.
   - Remova todos os atributos inline `onclick` e `oninput`.
   - Substitua scripts legados por `<script type="module" src="../../js/tools/<id>.js"></script>`.
5. Crie a suíte de testes em `tests/<id>.test.js` importando a função pura e validando casos felizes e de borda via `node:test`.
6. Execute `npm test` e `npm run build:data`.

---

## 5. Arquitetura Futura de Componentes e Templates Estáticos

Hoje, cerca de 40 arquivos HTML no repositório duplicam:
- `<header>` com o mesmo logotipo, menu e botão de menu mobile.
- `<footer>` com os mesmos textos legais e links de privacidade/termos.
- Bloco de scripts de autenticação e consentimento de cookies.
- Estrutura de cards de ferramentas e seções relacionadas.

### Proposta de Sistema de Templates Estáticos (`src/`)

```text
src/
  components/
    header.html           # Cabeçalho unificado com navegação e auth
    footer.html           # Rodapé padrão institucional
    tool-card.html        # Card padrão reutilizável
    related-tools.html    # Template da grade de ferramentas relacionadas
    cookie-banner.html    # Notificação de consentimento LGPD

  layouts/
    base.html             # Shell global HTML5 com metatags dinâmicas
    tool.html             # Layout específico para páginas de ferramentas

  pages/
    tools/
      financas/
        financiamento-carro.html (apenas o miolo/conteúdo específico)
```

### Gerador de Build Estático (Static Site Generator Minimalista)
Um script Node.js nativo lerá os arquivos de `src/`, injetará componentes e layouts, e compilará para os arquivos HTML estáticos finais na raiz e em `tools/`.
- **Vantagem**: Manutenção em um único lugar (ex: alterar um link no header atualiza automaticamente todas as 40+ páginas).
- **Sem Runtime**: O site entregue aos usuários continua sendo HTML estático puro, mantendo a velocidade máxima e zero dependência de servidor Node em produção.

---

## 6. Débito Técnico — `js/script.js`

### Diagnóstico
O arquivo [`js/script.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/script.js) possui 324 linhas contendo 16 funções de cálculo. Uma auditoria detalhada no repositório revelou um fato crucial:

> **Nenhuma página HTML do projeto (nem a Home, nem páginas de categoria, nem calculadoras em `tools/`) referencia ou importa `js/script.js`.**

Cada calculadora individual em `tools/` possui seu próprio script inline com sua própria implementação.

### Análise Detalhada das Funções em `js/script.js`:

| Função em `script.js` | Status Pós-Piloto | Situação em Relação aos Módulos e Páginas |
| :--- | :--- | :--- |
| `mascaraMoeda` / `limparCampos` / `calcularFinanciamento` | **Obsoleta (Substituída)** | Substituída com testes por [`js/core/currency.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/core/currency.js) e [`js/tools/financiamento-carro.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/financiamento-carro.js). A versão legada em `script.js` não tratava campos vazios e carecia de proteção contra divisão por zero em taxa 0%. |
| `calcularIdade` | **Obsoleta (Substituída)** | Substituída com testes por [`js/tools/idade.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/idade.js). A versão em `script.js` apenas subtraía anos, ignorando dias e meses e sujeita a bugs de fuso UTC. |
| `gerarSenha` | **Obsoleta e Insegura** | Substituída com testes por [`js/tools/senha.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/senha.js). A versão em `script.js` utilizava `Math.random()` inseguro e comprimento fixo em 12 caracteres. |
| `calcularPorcentagem` | **Obsoleta (Substituída)** | Substituída com testes por [`js/tools/porcentagem.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/porcentagem.js). A versão legada em `script.js` calculava apenas porcentagem simples, enquanto o novo módulo calcula projeção de acréscimo e desconto. |
| `gerarCampos` / `calcularDivisao` | **Obsoleta (Substituída)** | Substituída com testes por [`js/tools/dividir-conta.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/dividir-conta.js). Suporta tolerância de ponto flutuante para centavos e validação de até 50 pessoas. |
| `contarCaracteres` | **Obsoleta (Substituída)** | Substituída com testes por [js/tools/contador.js](../js/tools/contador.js). A versão legada em `script.js` contava apenas caracteres totais, enquanto o novo módulo calcula caracteres totais, caracteres sem espaços e palavras em tempo real. |
| `calcularIMC` | **Obsoleta (Substituída)** | Substituída com testes por [`js/tools/imc.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/imc.js). Normaliza altura digitada em cm (> 3m) e classifica todas as 6 faixas da OMS. |
| `calcularDesconto` | **Obsoleta (Substituída)** | Substituída com testes por [`js/tools/desconto.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/desconto.js). A versão legada em `script.js` utilizava IDs desatualizados (`valor` em vez de `preco`). |
| `calcularJuros` | **Obsoleta (Substituída)** | Substituída com testes por [`js/tools/juros.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/juros.js). A versão legada em `script.js` calculava apenas juros simples sob IDs obsoletos, enquanto o novo módulo suporta juros simples e compostos isoladamente. |
| `gerarLinkWhats` | **Obsoleta (Substituída)** | Substituída com testes por [js/tools/whatsapp.js](../js/tools/whatsapp.js). Sanitiza números, aplica DDI 55 defensivo e codifica mensagens via encodeURIComponent com atribuição segura no DOM. |
| `calcularLucro` | **Obsoleta (Substituída)** | Substituída com testes por [`js/tools/lucro.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/lucro.js). A versão legada em `script.js` calculava margem incorretamente sobre o custo `(lucro/custo)*100`, enquanto o novo módulo calcula margem sobre o preço `(lucro/preco)*100` com destaque visual de prejuízo. |
| `calcularCombustivel` | **Obsoleta (Substituída)** | Substituída com testes por [js/tools/combustivel.js](../js/tools/combustivel.js). Valida campos numéricos e calcula litros e custo da viagem com validação contra divisão por zero. |

### Plano de Ação Recomendado para `js/script.js`
1. **Não remover agora**: Mantido temporariamente intacto para não impactar referências externas legadas ou pipelines de terceiros.
2. **Migração 100% Concluída (15/15 Ferramentas)**: Todas as 15 ferramentas do projeto foram integralmente migradas para módulos ES independentes e testadas via `node:test` (104 testes passando). Nenhuma página depende de `js/script.js`.
3. **Depreciação Definitiva Pronta para Execução**: O arquivo `js/script.js` está 100% obsoleto e pode ser deletado com segurança na próxima etapa de limpeza/estabilização.

---

## 7. Estratégia de Normalização de Line Endings (.gitattributes)

### Diagnóstico Atual
O repositório possui uma mistura histórica de quebras de linha:
- Páginas de ferramentas em `tools/**/*.html` e arquivos compilados usam estritamente **CRLF** (`\r\n`).
- Arquivos de configuração e sitemap (`sitemap.xml`) usam **LF** (`\n`).
- `css/style.css` possui um misto histórico (CRLF predominante com algumas linhas LF).

### Por que NÃO normalizar tudo em massa nesta etapa?
Uma conversão cega em massa de todos os arquivos do repositório geraria:
1. Um `diff` gigante de centenas de arquivos, poluindo o histórico e inutilizando `git blame` para auditorias de código anteriores.
2. Alto risco de conflito em merges de outras branches abertas.

### Estratégia Recomendada para a Fase de Estabilização Git

1. **Adicionar `.gitattributes`** configurando o tratamento por tipo de arquivo:
   ```gitattributes
   # Auto-detect text files and normalize to LF in Git repository,
   # checking out according to developer OS or specific file rules
   * text=auto eol=lf

   # Ensure Windows/DOS format for files requiring CRLF
   *.bat text eol=crlf

   # Preserve specific files
   *.png binary
   *.webp binary
   *.jpg binary
   ```
2. **Executar a renomeação/normalização em commit único e isolado**:
   ```bash
   git add --renormalize .
   git commit -m "chore: normaliza quebras de linha via .gitattributes"
   ```
3. **Configurar `.git-blame-ignore-revs`**: Adicionar o hash desse commit de normalização ao arquivo `.git-blame-ignore-revs`, para que o Git ignore a renormatização ao rastrear a autoria das linhas de código.

---

## 8. Próximos Passos Recomendados

1. **Fase 2 — Modularização de Scripts**: Extrair funções de cálculo inline de `tools/` para `js/tools/<id>.js` com testes automatizados via Node Test Runner.
2. **Fase 3 — Motor de Build SSG**: Implementar geração de páginas via `src/components/` e `src/layouts/`, eliminando a duplicação de header e footer em 40 arquivos HTML.
3. **Fase 4 — Normalização de Git e Line Endings**: Aplicar `.gitattributes` e `.git-blame-ignore-revs` em commit exclusivo.
