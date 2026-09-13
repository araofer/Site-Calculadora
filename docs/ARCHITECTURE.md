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

Adotamos o padrão de **ECMAScript Modules (ESM) nativos** para todas as ferramentas do projeto. Todas as 15 ferramentas estão 100% modularizadas em ES Modules nativos (Piloto: 3, Lote 1: 4, Lote 2: 4, Lote 3: 4):

**Piloto (3 ferramentas):**
1. **Financiamento de Carro** (`tools/financas/financiamento-carro.html`) ➔ [`js/tools/financiamento-carro.js`](../js/tools/financiamento-carro.js) (importa [`js/core/currency.js`](../js/core/currency.js))
2. **Calculadora de Idade** (`tools/saude/idade.html`) ➔ [`js/tools/idade.js`](../js/tools/idade.js)
3. **Gerador de Senha** (`tools/utilidades/senha.html`) ➔ [`js/tools/senha.js`](../js/tools/senha.js)

**Lote 1 Migrado (4 ferramentas financeiras):**
4. **Financiamento de Imóveis (SAC)** (`tools/financas/financiamento-imovel.html`) ➔ [`js/tools/financiamento-imovel.js`](../js/tools/financiamento-imovel.js) (importa [`js/core/currency.js`](../js/core/currency.js))
   - Função pura: `calcularFinanciamentoSAC(params)` (alias: `calcularFinanciamentoImovel`)
   - Testes: `tests/financiamento-imovel.test.js`
5. **Calculadora de Juros** (`tools/financas/juros.html`) ➔ [`js/tools/juros.js`](../js/tools/juros.js)
   - Funções puras: `calcularJurosSimples(params)`, `calcularJurosCompostos(params)`
   - Testes: `tests/juros.test.js`
6. **Calculadora de Desconto** (`tools/financas/desconto.html`) ➔ [`js/tools/desconto.js`](../js/tools/desconto.js)
   - Função pura: `calcularDesconto(params)`
   - Testes: `tests/desconto.test.js`
7. **Calculadora de Lucro e Margem** (`tools/financas/lucro.html`) ➔ [`js/tools/lucro.js`](../js/tools/lucro.js)
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
   - Por especificação dos padrões web, módulos ES (`<script type="module">`) estão sujeitos a políticas de CORS e segurança do navegador e não carregam sobre o protocolo direto de arquivo (`file://`).
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

Padrão arquitetural estabelecido para novas ferramentas adicionadas ao projeto:
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

## 6. Eliminação do JavaScript Legado — `js/script.js` (Concluída)

### Diagnóstico e Resolução
O arquivo histórico `js/script.js` continha 324 linhas e 16 funções de cálculo legadas. Uma auditoria rigorosa de referências e dependências em todo o repositório comprovou que:
1. **Zero Referências Ativas**: Nenhuma página HTML, script ou componente do repositório importava ou referenciava `js/script.js`.
2. **100% das Funcionalidades Substituídas**: Todas as 16 funções legadas foram migradas para módulos ES nativos isolados sob `js/core/` e `js/tools/`, acompanhados por 104 testes automatizados em `node:test`.
3. **Zero Impacto**: A remoção física do arquivo `js/script.js` foi executada e validada, mantendo 104 testes passando e a integridade de 15 ferramentas e 40 URLs no sitemap.

### Inventário das 16 Funções Legadas e Seus Módulos Substitutos:

| # | Função Legada em `script.js` | Finalidade Real | Módulo ESM Substituto | Função Exportada Substituta | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `calcularPorcentagem` | Lê `#valor` e `#porcentagem`, calcula `(valor * porcentagem) / 100` e exibe o resultado em `#resultado`. | [`js/tools/porcentagem.js`](../js/tools/porcentagem.js) | `calcularPorcentagem` | Removida |
| 2 | `gerarCampos` | Lê `#pessoas` e gera dinamicamente `<input type="number" class="valores">` no container `#camposPessoas`. | [`js/tools/dividir-conta.js`](../js/tools/dividir-conta.js) | `validarQuantidadePessoas` (renderização dinâmica em `setupDividirConta`) | Removida |
| 3 | `calcularDivisao` | Soma inputs `.valores`, compara com `#total` e exibe mensagem de status ("Tudo certo", "Faltam R$ ...", "Passou R$ ..."). | [`js/tools/dividir-conta.js`](../js/tools/dividir-conta.js) | `calcularDivisaoConta` | Removida |
| 4 | `calcularIdade` | Lê `#nascimento`, subtrai ano de nascimento do ano atual (`hoje.getFullYear() - nasc.getFullYear()`) e exibe em `#resultado`. | [`js/tools/idade.js`](../js/tools/idade.js) | `calcularIdadePrecisa` (calcula idade com exatidão em anos, meses e dias no fuso local) | Removida |
| 5 | `gerarSenha` | Gera senha alfanumérica de 12 caracteres usando `Math.random()` e exibe em `#resultado`. | [`js/tools/senha.js`](../js/tools/senha.js) | `gerarSenhaSegura` (Web Crypto API com amostragem por rejeição) | Removida |
| 6 | `contarCaracteres` | Lê `#texto`, calcula o tamanho total da cadeia (`texto.length`) e exibe contagem em `#resultado`. | [`js/tools/contador.js`](../js/tools/contador.js) | `contarTexto` (contagem de caracteres, caracteres sem espaços e palavras) | Removida |
| 7 | `calcularIMC` | Lê `#peso` e `#altura`, calcula `peso / (altura * altura)` e exibe em `#resultado`. | [`js/tools/imc.js`](../js/tools/imc.js) | `calcularIMC` (normalização m/cm, ponto/vírgula e faixas da OMS) | Removida |
| 8 | `calcularDesconto` | Lê `#valor` e `#desconto`, calcula `valorDesconto = (valor * desconto) / 100` e `valorFinal = valor - valorDesconto`. | [`js/tools/desconto.js`](../js/tools/desconto.js) | `calcularDesconto` | Removida |
| 9 | `calcularJuros` | Lê `#capital`, `#taxa` e `#tempo`, calcula juros simples `(capital * taxa * tempo) / 100` e total `capital + juros`. | [`js/tools/juros.js`](../js/tools/juros.js) | `calcularJurosSimples` (e `calcularJurosCompostos`) | Removida |
| 10 | `gerarLinkWhats` | Lê `#numero` e `#mensagem`, remove não dígitos e monta link `https://wa.me/<numero>?text=<mensagem>`. | [`js/tools/whatsapp.js`](../js/tools/whatsapp.js) | `gerarLinkWhatsApp` (URL `https://wa.me/${numero}?text=${mensagem}`) | Removida |
| 11 | `calcularLucro` | Lê `#custo` e `#venda`, calcula `lucro = venda - custo` e margem percentual `(lucro / custo) * 100`. | [`js/tools/lucro.js`](../js/tools/lucro.js) | `calcularLucro` | Removida |
| 12 | `calcularCombustivel` | Lê `#distancia`, `#consumo` e `#preco`, calcula `litros = distancia / consumo` e custo total `litros * preco`. | [`js/tools/combustivel.js`](../js/tools/combustivel.js) | `calcularConsumoCombustivel` | Removida |
| 13 | `mascaraMoeda` | Formata valor do input em moeda BRL em tempo real durante a digitação dividindo centavos por 100. | [`js/core/currency.js`](../js/core/currency.js) | `formatBRLCurrencyInput` (além de `parseBRLCurrency` e `formatBRL`) | Removida |
| 14 | `limparResultado` | Restaura mensagem informativa de orientação no elemento `#resultadoFinanciamento`. | [`js/tools/financiamento-carro.js`](../js/tools/financiamento-carro.js) | Manipulada internamente no controlador `setupFinanciamentoCarro` | Removida |
| 15 | `limparCampos` | Limpa campos de financiamento (`#valorVeiculo`, `#valorEntrada`, `#taxaMensal`, `#prazoMeses`) e chama `limparResultado()`. | [`js/tools/financiamento-carro.js`](../js/tools/financiamento-carro.js) | Delegada semanticamente via `data-action="clear"` em `setupFinanciamentoCarro` | Removida |
| 16 | `calcularFinanciamento` | Lê dados do veículo e calcula prestação mensal pela Tabela Price, total dos juros e custo total. | [`js/tools/financiamento-carro.js`](../js/tools/financiamento-carro.js) | `calcularFinanciamentoPrice` | Removida |
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

1. **Fase 2 — Modularização de Scripts (Concluída)**: 15/15 ferramentas migradas para ES Modules nativos com testes automatizados e script legado removido.
2. **Fase 3 — Motor de Build SSG**: Implementar geração de páginas via `src/components/` e `src/layouts/`, eliminando a duplicação de header e footer em 40 arquivos HTML.
3. **Fase 4 — Normalização de Git e Line Endings**: Aplicar `.gitattributes` e `.git-blame-ignore-revs` em commit exclusivo.
