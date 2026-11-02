# Como Adicionar uma Nova Ferramenta no Calculadora Master

Este guia descreve o fluxo oficial para adicionar uma nova calculadora ou utilitário ao projeto **Calculadora Master**, em conformidade com o motor SSG (`scripts/build-html.js`) e com `docs/CONVENCAO_CALCULADORAS.md`.

---

## Sumário do Fluxo

1. [Criar a página-fonte em `src/pages/`](#1-criar-a-página-fonte-em-srcpages)
2. [Implementar o módulo JavaScript em `js/tools/`](#2-implementar-o-módulo-javascript-em-jstools)
3. [Criar o teste automatizado em `tests/`](#3-criar-o-teste-automatizado-em-tests)
4. [Cadastrar no `data/tools.json`](#4-cadastrar-no-datatoolsjson)
5. [Gerar catálogo, sitemap e páginas estáticas (SSG)](#5-gerar-catálogo-sitemap-e-páginas-estáticas-ssg)
6. [Auditoria e validação automatizada](#6-auditoria-e-validação-automatizada)

---

## 1. Criar a página-fonte em `src/pages/`

Crie o arquivo na pasta correspondente à categoria em `src/pages/tools/<categoria>/<slug>.page.html`:

- `src/pages/tools/financas/<slug>.page.html`
- `src/pages/tools/trabalhista/<slug>.page.html`
- `src/pages/tools/matematica/<slug>.page.html`
- `src/pages/tools/saude/<slug>.page.html`
- `src/pages/tools/utilidades/<slug>.page.html`

### Padrão Estrutural Obrigatório

A página utiliza **Frontmatter YAML** no topo e o layout compartilhado `layout: tool` (definido em `src/layouts/tool.html`). O layout compartilhado injeta automaticamente o cabeçalho, navegação, botão de favoritar, consentimento de cookies, rodapé e recursos globais.

```html
---
title: Nome da Ferramenta Online Grátis | Calculadora Master
description: Descrição clara e persuasiva do que a ferramenta resolve em até 160 caracteres.
keywords: palavra-chave 1, palavra-chave 2, termo de busca
canonical: https://www.calculadoramaster.com/tools/<categoria>/<slug>.html
layout: tool
pageScripts: <script type="module" src="{{ROOT_PREFIX}}js/tools/<slug>.js"></script>
---

<h1>Nome da Ferramenta</h1>
<p>Introdução concisa explicando o objetivo do cálculo.</p>

<div class="card tool-calculator-card">
  <h2 class="tool-form-title">Informe seus dados</h2>

  <form id="formExemplo">
    <div class="form-group">
      <label for="campoPrincipal">Valor principal (R$):</label>
      <input type="text" id="campoPrincipal" name="campoPrincipal"
        inputmode="numeric" autocomplete="off" placeholder="1.000,00" required>
    </div>

    <div class="form-group">
      <label for="campoAliquota">Taxa ou percentual (%):</label>
      <input type="number" id="campoAliquota" name="campoAliquota"
        min="0" max="100" step="0.01" placeholder="10" aria-describedby="ajudaAliquota" required>
      <p id="ajudaAliquota">Texto descritivo de ajuda para preenchimento.</p>
    </div>

    <div class="tool-actions">
      <button type="submit" class="tool-btn tool-btn-primary">Calcular</button>
      <button type="button" id="btnLimpar" class="tool-btn tool-btn-secondary">Limpar</button>
    </div>
  </form>

  <p id="erroExemplo" role="alert" aria-live="assertive" hidden></p>

  <section id="resultadoExemplo" aria-live="polite" aria-atomic="true" hidden>
    <h2 class="tool-result-title">Seu resultado estimado</h2>

    <div class="card tool-result-card">
      <p>Total calculado:
        <strong id="valorResultado">R$ 0,00</strong>
      </p>
    </div>

    <div class="tool-actions result-actions">
      <button type="button" id="btnCopiar" class="tool-btn tool-btn-secondary" hidden>Copiar resultado</button>
      <button type="button" id="btnCompartilhar" class="tool-btn tool-btn-secondary" hidden>Compartilhar link</button>
      <button type="button" id="btnImprimir" class="tool-btn tool-btn-secondary" hidden>Imprimir</button>
    </div>
  </section>
</div>

<section class="content">
  <h2>Como funciona o cálculo</h2>
  <p>Explicação didática das fórmulas, legislação e regras aplicáveis.</p>

  <section class="related-tools">
    <h2>Você também pode precisar</h2>
    <div class="related-tools-grid">
      <!-- Cards estáticos de ferramentas relacionadas -->
    </div>
  </section>

  <p class="tool-return-link">
    👉 <a href="{{ROOT_PREFIX}}index.html">Voltar para a página inicial</a>
  </p>
</section>
```

---

## 2. Implementar o módulo JavaScript em `js/tools/`

Crie `js/tools/<slug>.js` como módulo ES nativo:

- **Funções puras desacopladas**: Separe os cálculos e regras matemáticas da manipulação de DOM para permitir testes de unidade isolados.
- **Segurança e XSS**: Nunca injete dados diretamente com `innerHTML`. Use `textContent` ou criação explícita de elementos (`document.createElement`).
- **Ações compartilhadas**: Importe `createResultActions` de `../core/result-actions.js` para gerenciar a cópia, compartilhamento e impressão dos resultados.
- **Formatação**: Utilize `Intl.NumberFormat('pt-BR', ...)` ou utilitários em `js/core/currency.js`.
- **Acessibilidade**: Ative/desative a exibição com a propriedade `.hidden` (não use estilos inline com `display: none` direto). Limpe estados de erro ao recalcular ou resetar.

---

## 3. Criar o teste automatizado em `tests/`

Crie `tests/<slug>.test.js` utilizando o test runner nativo do Node.js (`node:test` e `node:assert/strict`):

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularExemplo } from '../js/tools/<slug>.js';

test('cálculo regular com entradas válidas', () => {
  const res = calcularExemplo({ valor: 1000, taxa: 10 });
  assert.equal(res.valido, true);
  assert.equal(res.total, 1100);
});

test('validação de limites e entradas inválidas', () => {
  assert.equal(calcularExemplo({ valor: -10 }).valido, false);
});
```

---

## 4. Cadastrar no `data/tools.json`

Adicione a nova entrada ao array de ferramentas:

```json
{
  "id": "minha-ferramenta",
  "slug": "minha-ferramenta",
  "name": "Nome da Ferramenta",
  "category": "Financeiro",
  "categorySlug": "financas",
  "description": "Explicação concisa do que a ferramenta resolve em uma frase.",
  "url": "/tools/financas/minha-ferramenta.html",
  "keywords": [
    "termo 1",
    "termo 2",
    "sinônimo"
  ],
  "related": [
    "ferramenta-relacionada-1",
    "ferramenta-relacionada-2"
  ],
  "featured": false,
  "status": "published"
}
```

### Regras de Cadastro:
- **Categorias Permitidas**: `Financeiro` (`financas`), `Trabalhista` (`trabalhista`), `Matemática` (`matematica`), `Saúde` (`saude`), `Utilidades` (`utilidades`).
- **Related**: No máximo 4 IDs de ferramentas existentes no catálogo; nunca recomende a própria ferramenta.
- **Status**: `published` para ferramentas públicas; `draft` durante o desenvolvimento.

---

## 5. Gerar catálogo, sitemap e páginas estáticas (SSG)

Execute os comandos do pipeline:

```bash
# Valida tools.json e gera o sitemap.xml e catálogo JS
npm run build:data

# Compila as páginas HTML a partir de src/pages/ para dist/
npm run build:prod
```

---

## 6. Auditoria e validação automatizada

Antes de submeter, valide a integridade total do build:

```bash
# 1. Executa a suíte de testes unitários
npm test

# 2. Executa a auditoria completa de produção (SEO, assets, equivalência, integridade)
npm run audit:prod

# 3. Executa a verificação SSG integrada
npm run verify:ssg
```
