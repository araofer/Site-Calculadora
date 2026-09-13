# Como Adicionar uma Nova Ferramenta no Calculadora Master

Este guia descreve o fluxo padrão e escalável para adicionar uma nova calculadora ou utilitário ao projeto **Calculadora Master**.

O objetivo desta arquitetura é garantir que a **ferramenta número 16** e a **ferramenta número 100** sigam exatamente as mesmas regras de integridade, SEO, acessibilidade e performance.

---

## Sumário do Fluxo

1. [Criar a página HTML da ferramenta](#1-criar-a-página-html-da-ferramenta)
2. [Implementar o JavaScript da ferramenta](#2-implementar-o-javascript-da-ferramenta)
3. [Cadastrar no `data/tools.json`](#3-cadastrar-no-datatoolsjson)
4. [Definir ferramentas relacionadas](#4-definir-ferramentas-relacionadas)
5. [Executar a validação automatizada](#5-executar-a-validação-automatizada)
6. [Gerar catálogo JS e sitemap](#6-gerar-catálogo-js-e-sitemap)
7. [Testes funcionais e de SEO](#7-testes-funcionais-e-de-seo)
8. [Commit e submissão](#8-commit-e-submissão)

---

## 1. Criar a página HTML da ferramenta

Crie o arquivo HTML na pasta correspondente à categoria física em `tools/`:

- `tools/financas/<slug>.html`
- `tools/trabalhista/<slug>.html`
- `tools/saude/<slug>.html`
- `tools/utilidades/<slug>.html`

### Padrão Estrutural Obrigatório

A página deve conter:
- **Metatags de SEO**: `title`, `meta description`, `canonical` apontando para a URL pública final.
- **Folha de estilos**: `<link rel="stylesheet" href="../../css/style.css">`.
- **Header padronizado**: Navegação com logo e links institucionais.
- **Conteúdo principal semântico**:
  ```html
  <main class="container">
    <h1>Título da Ferramenta</h1>
    <p>Descrição introdutória clara e concisa.</p>

    <div class="box-card">
      <h2>Calcular agora</h2>
      <!-- Formulário e campos de entrada -->
      <!-- Botão de cálculo com estilo padronizado -->
      <!-- Contêiner de resultado acessível -->
    </div>

    <section class="content">
      <!-- Artigo explicativo, fórmulas, dicas e FAQs para SEO -->

      <!-- Seção de ferramentas relacionadas -->
      <section class="related-tools">
        <h2>Você também pode precisar</h2>
        <div class="related-tools-grid">
          <!-- Cards estáticos de 1 a 4 ferramentas relacionadas -->
        </div>
      </section>

      <p style="margin-top: 30px;">
        👉 <a href="../../index.html">Voltar para página inicial</a>
      </p>
    </section>
  </main>
  ```
- **Footer**: Incluindo links para Termos, Privacidade e Cookies.
- **Scripts utilitários**: `cookie-consent.js`, `header-auth.js` e script de toggle do menu mobile.

---

## 2. Implementar o JavaScript da ferramenta

Ao criar o script da calculadora:
- **Segurança**: Nunca utilize dados não tratados diretamente com `innerHTML`. Use `textContent` ou `document.createElement()`.
- **Formatação Brasileira**: Valores monetários devem seguir o formato `R$ 1.250,00` e números decimais com vírgula.
- **Tratamento de Erros**: Verifique valores nulos, vazios ou `NaN` antes de executar divisões ou exponenciações.
- **Reset**: Inclua uma função para limpar campos e resetar o resultado.

---

## 3. Cadastrar no `data/tools.json`

Abra `data/tools.json` e adicione a entrada da nova ferramenta no array:

```json
{
  "id": "minha-nova-ferramenta",
  "slug": "minha-nova-ferramenta",
  "name": "Calculadora Exemplo",
  "category": "Financeiro",
  "categorySlug": "financas",
  "description": "Explicação curta e persuasiva do que a ferramenta resolve em uma frase.",
  "url": "/tools/financas/minha-nova-ferramenta.html",
  "keywords": [
    "termo 1",
    "termo 2",
    "sinônimo",
    "busca comum"
  ],
  "related": [
    "id-ferramenta-relacionada-1",
    "id-ferramenta-relacionada-2"
  ],
  "featured": false,
  "status": "published"
}
```

### Categorias Oficiais Permitidas:
- `Financeiro` (slug: `financas`)
- `Trabalhista` (slug: `trabalhista`)
- `Matemática` (slug: `matematica`)
- `Saúde` (slug: `saude`)
- `Conversores` (slug: `conversores`)
- `Utilidades` (slug: `utilidades`)

### Status Permitidos:
- `published`: Ferramenta ativa, indexável no sitemap e disponível na busca.
- `draft`: Em desenvolvimento, não incluída no sitemap público.
- `deprecated`: Descontinuada ou redirecionada.

---

## 4. Definir ferramentas relacionadas

- No máximo **4 ferramentas relacionadas**.
- Devem apontar para IDs que **realmente existem** no `data/tools.json`.
- **Nunca recomende a própria ferramenta**.
- As relações devem fazer sentido prático para o usuário (ex: Financiamento de Carro ➔ Combustível, Juros, Financiamento de Imóvel).

---

## 5. Executar a validação automatizada

Antes de gerar os artefatos, execute o validador:

```bash
npm run validate:tools
```

O script checará automaticamente:
- Se todos os campos obrigatórios estão preenchidos.
- Se o ID e slug são únicos.
- Se o arquivo HTML físico realmente existe no caminho informado.
- Se os IDs em `related` existem e não contêm auto-recomendação.
- Se o limite de 4 relacionados é respeitado.
- Se categoria e status são válidos.

---

## 6. Gerar catálogo JS e sitemap

Com a validação aprovada, execute o pipeline de compilação de dados:

```bash
npm run build:data
```

Esse comando único irá:
1. Validar `data/tools.json`.
2. Compilar `js/tools-catalog.js` (mantendo retrocompatibilidade total com a Busca Universal da Home).
3. Atualizar `sitemap.xml` (incluindo a nova URL no mapa do site).
4. Reexecutar a validação final.

---

## 7. Testes funcionais e de SEO

Abra o projeto e verifique:
1. **Busca da Home**: Digite o nome da ferramenta ou suas palavras-chave no campo de busca de `index.html`. O card deve aparecer e o link deve abrir a página correta.
2. **Página da Ferramenta**: Faça simulações com números válidos, números negativos, zeros e campos em branco.
3. **Seção de Relacionados**: Verifique se os cards aparecem corretos visualmente e se os links clicáveis funcionam.
4. **Responsividade**: Teste as larguras de tela 320px, 375px, 768px e 1200px.

---

## 8. Commit e submissão

Verifique os arquivos alterados com:

```bash
git status
git diff --stat
```

Arquivos esperados modificados/criados:
- `tools/<categoria>/<nova-ferramenta>.html`
- `data/tools.json`
- `js/tools-catalog.js`
- `sitemap.xml`

Faça o commit seguindo o padrão convencional do projeto:

```bash
git add data/tools.json js/tools-catalog.js sitemap.xml tools/<categoria>/<nova-ferramenta>.html
git commit -m "feat: adiciona calculadora de <nome-da-ferramenta>"
```
