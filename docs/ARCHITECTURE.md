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

## 4. Estrutura Futura de JavaScript Modular

Atualmente, cada página em `tools/` possui uma tag `<script>` inline com a sua lógica de cálculo. Embora isso garanta que cada ferramenta seja auto-suficiente sem requisições adicionais, dificulta testes unitários automatizados e reutilização de utilitários comuns.

### Proposta de Modularização (Fase Arquitetura 2)

```text
js/
  core/
    currency.js       # Máscara monetária pt-BR, parse de moeda, arredondamento financeiro
    storage.js        # Abstração de localStorage com fallback seguro e tipagem
    analytics.js      # Disparador central de eventos para GA4 (sem poluir scripts de ferramentas)
    utils.js          # Debounce, escape HTML, validação de datas e números

  tools/
    financiamento-carro.js
    financiamento-imovel.js
    juros.js
    porcentagem.js
    idade.js
    imc.js
    ... (um módulo puro e testável por ferramenta)

  home-search.js      # Controlador de busca universal da página inicial
  tools-catalog.js    # Catálogo compilado
```

### Responsabilidade de cada diretório:
- **`js/core/`**: Funções utilitárias puras, altamente reutilizáveis e com 100% de cobertura de testes. Nenhuma lógica específica de uma calculadora deve entrar aqui.
- **`js/tools/`**: Lógica de cada calculadora. Cada módulo exportará funções puras de cálculo (ex: `calcularPrice(valor, entrada, taxa, meses)`) desacopladas do DOM, facilitando testes automatizados com Jest ou Node Test Runner.
- **Transição Segura**: A migração deve ser gradual (ferramenta por ferramenta), mantendo compatibilidade com as páginas existentes até a conclusão dos testes.

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

| Função em `script.js` | Status | Situação em Relação às Páginas em `tools/` |
| :--- | :--- | :--- |
| `calcularPorcentagem` | **Obsoleta** | [`tools/financas/porcentagem.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/financas/porcentagem.html) possui implementação própria com suporte a 3 tipos de cálculos percentuais. |
| `gerarCampos` / `calcularDivisao` | **Duplicada** | [`tools/financas/dividir-conta.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/financas/dividir-conta.html) possui versão idêntica inline. |
| `calcularIdade` | **Obsoleta / Incompleta** | Em `script.js`, apenas subtrai anos (`hoje.getFullYear() - nasc.getFullYear()`). Em [`tools/saude/idade.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/saude/idade.html), calcula com precisão anos, meses e dias exatos. |
| `gerarSenha` | **Insegura / Obsoleta** | Em `script.js`, utiliza `Math.random()`. Em [`tools/utilidades/senha.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/utilidades/senha.html), utiliza criptografia com a API nativa `window.crypto.getRandomValues()`. |
| `contarCaracteres` | **Obsoleta / Reduzida** | Em `script.js`, apenas conta `texto.length`. Em [`tools/utilidades/contador.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/utilidades/contador.html), conta palavras, caracteres, espaços e quebras de linha. |
| `calcularIMC` | **Duplicada** | [`tools/saude/imc.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/saude/imc.html) possui versão com classificação completa de obesidade. |
| `calcularDesconto` | **Duplicada** | [`tools/financas/desconto.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/financas/desconto.html) possui versão própria com tratamento de vírgulas e botão de reset. |
| `calcularJuros` | **Obsoleta** | Em `script.js`, calcula apenas juros simples. [`tools/financas/juros.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/financas/juros.html) possui abas para juros simples e compostos. |
| `gerarLinkWhats` | **Duplicada / Desconectada** | [`tools/utilidades/whatsapp.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/utilidades/whatsapp.html) possui a função `gerarLink()`. |
| `calcularLucro` | **Duplicada** | [`tools/financas/lucro.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/financas/lucro.html) possui implementação própria. |
| `calcularCombustivel` | **Duplicada** | [`tools/utilidades/combustivel.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/utilidades/combustivel.html) possui implementação própria. |
| `mascaraMoeda` / `limparCampos` / `calcularFinanciamento` | **Duplicada** | [`tools/financas/financiamento-carro.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/tools/financas/financiamento-carro.html) possui essas funções inline com suporte SAC/Price. |

### Plano de Ação Recomendado para `js/script.js`
1. **Não remover agora**: Mantido temporariamente intacto para garantir que nenhuma automação ou documentação externa dependa dele.
2. **Fase 2 de Arquitetura**: Extrair as funções úteis para `js/core/` (como `mascaraMoeda`) e `js/tools/`.
3. **Depreciação Definitiva**: Após a extração dos módulos e verificação dos testes, o arquivo será arquivado ou deletado com segurança.

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
