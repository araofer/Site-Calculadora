/**
 * Catalogo Central de Ferramentas - Calculadora Master
 * Estrutura unificada com todas as ferramentas reais disponiveis no projeto.
 */

const TOOLS_CATALOG = [
  {
    id: "horas-extras",
    nome: "Calculadora de Horas Extras",
    categoria: "Trabalhista",
    descricao: "Calcule o valor da hora normal, hora extra e o total com adicional informado.",
    url: "tools/trabalhista/horas-extras.html",
    termos: ["horas extras", "hora extra", "trabalhista", "adicional hora extra", "salario", "jornada", "clt", "trabalho", "rescisao", "banco de horas"],
    destaque: true,
    related: ["porcentagem", "desconto", "juros"]
  },
  {
    id: "financiamento-carro",
    nome: "Financiamento de Carros",
    categoria: "Financeira",
    descricao: "Simule as parcelas e os juros do financiamento do seu carro pela Tabela Price.",
    url: "tools/financas/financiamento-carro.html",
    termos: ["financiamento carro", "carro", "veiculo", "auto", "parcela carro", "simulador auto", "automovel", "moto", "tabela price", "juros"],
    destaque: true,
    related: ["juros", "financiamento-imovel", "porcentagem", "combustivel"]
  },
  {
    id: "financiamento-imovel",
    nome: "Financiamento de Imóveis",
    categoria: "Financeira",
    descricao: "Simule o financiamento imobiliário pelo Sistema SAC com parcelas decrescentes.",
    url: "tools/financas/financiamento-imovel.html",
    termos: ["financiamento imovel", "imovel", "casa", "apartamento", "habitacional", "sistema sac", "parcela decrescente", "caixa", "financiamento"],
    destaque: false,
    related: ["juros", "financiamento-carro", "porcentagem"]
  },
  {
    id: "desconto",
    nome: "Calculadora de Desconto",
    categoria: "Financeira",
    descricao: "Descubra o valor final com desconto e a economia real nas suas compras.",
    url: "tools/financas/desconto.html",
    termos: ["desconto", "porcentagem de desconto", "promocao", "liquidacao", "preco final", "compras", "cupom", "off"],
    destaque: true,
    related: ["porcentagem", "lucro", "dividir-conta", "juros"]
  },
  {
    id: "juros",
    nome: "Calculadora de Juros",
    categoria: "Financeira",
    descricao: "Calcule juros simples e compostos para investimentos, empréstimos e rendimentos.",
    url: "tools/financas/juros.html",
    termos: ["juros", "juros compostos", "juros simples", "rendimento", "investimento", "emprestimo", "taxa de juros", "capital", "rentabilidade"],
    destaque: false,
    related: ["financiamento-carro", "financiamento-imovel", "porcentagem", "lucro"]
  },
  {
    id: "lucro",
    nome: "Calculadora de Lucros",
    categoria: "Financeira",
    descricao: "Calcule lucro bruto, margem de lucro e a precificação ideal para seus produtos.",
    url: "tools/financas/lucro.html",
    termos: ["lucro", "margem de lucro", "markup", "precificacao", "custo e venda", "ganho", "comercio", "vendas", "empresa"],
    destaque: false,
    related: ["porcentagem", "desconto", "juros"]
  },
  {
    id: "porcentagem",
    nome: "Calculadora de Porcentagem",
    categoria: "Matemática",
    descricao: "Calcule percentuais, aumentos, reduções e proporções de forma simples e rápida.",
    url: "tools/financas/porcentagem.html",
    termos: ["porcentagem", "percentual", "por cento", "fracao", "aumento percentual", "regra de tres", "desconto", "porcentagens"],
    destaque: true,
    related: ["desconto", "lucro", "juros"]
  },
  {
    id: "dividir-conta",
    nome: "Dividir Conta",
    categoria: "Financeira",
    descricao: "Divida contas entre amigos de forma igual ou com consumos diferentes por pessoa.",
    url: "tools/financas/dividir-conta.html",
    termos: ["dividir conta", "divisao de conta", "restaurante", "bar", "rachar conta", "amigos", "dividir despesas", "churrasco", "conta"],
    destaque: false,
    related: ["desconto", "porcentagem", "combustivel"]
  },
  {
    id: "imc",
    nome: "Calculadora de IMC",
    categoria: "Saúde",
    descricao: "Calcule seu Índice de Massa Corporal e veja a classificação do seu peso ideal.",
    url: "tools/saude/imc.html",
    termos: ["imc", "indice de massa corporal", "peso ideal", "obesidade", "saude", "tabela imc", "peso e altura", "emagrecer", "massa corporal"],
    destaque: true,
    related: ["idade"]
  },
  {
    id: "idade",
    nome: "Calculadora de Idade",
    categoria: "Saúde",
    descricao: "Descubra sua idade exata em anos, meses e dias a partir da data de nascimento.",
    url: "tools/saude/idade.html",
    termos: ["idade", "quantos anos tenho", "data de nascimento", "dias de vida", "tempo de vida", "aniversario", "calcular idade", "nascimento"],
    destaque: false,
    related: ["imc"]
  },
  {
    id: "combustivel",
    nome: "Calculadora de Combustível",
    categoria: "Utilidades",
    descricao: "Calcule o consumo em litros e o custo total estimado de combustível em viagens.",
    url: "tools/utilidades/combustivel.html",
    termos: ["combustivel", "gasolina", "etanol", "alcool", "consumo km por litro", "gasto de viagem", "custo combustivel", "carro", "viagem"],
    destaque: false,
    related: ["financiamento-carro", "dividir-conta", "desconto"]
  },
  {
    id: "contador",
    nome: "Contador de Caracteres",
    categoria: "Utilidades",
    descricao: "Conte caracteres, palavras, espaços e linhas em qualquer texto instantaneamente.",
    url: "tools/utilidades/contador.html",
    termos: ["contador", "contar caracteres", "contar palavras", "texto", "tamanho do texto", "redacao", "caracteres", "palavras"],
    destaque: false,
    related: ["whatsapp", "qr-code", "senha"]
  },
  {
    id: "senha",
    nome: "Gerador de Senha",
    categoria: "Utilidades",
    descricao: "Gere senhas fortes, seguras e personalizadas com criptografia Web Crypto.",
    url: "tools/utilidades/senha.html",
    termos: ["senha", "gerador de senha", "senha forte", "password generator", "seguranca", "criar senha", "senha segura", "gerador senha"],
    destaque: true,
    related: ["qr-code", "whatsapp", "contador"]
  },
  {
    id: "qr-code",
    nome: "Gerador de QR Code",
    categoria: "Utilidades",
    descricao: "Crie códigos QR personalizados para links, textos, WhatsApp e redes em segundos.",
    url: "tools/utilidades/qr-code.html",
    termos: ["qr code", "gerador qr code", "codigo qr", "qrcode", "criar qr code", "link qr", "pix", "wifi"],
    destaque: false,
    related: ["whatsapp", "senha", "contador"]
  },
  {
    id: "whatsapp",
    nome: "Gerador de Links WhatsApp",
    categoria: "Utilidades",
    descricao: "Gere links diretos de WhatsApp (wa.me) com mensagem personalizada sem cadastro.",
    url: "tools/utilidades/whatsapp.html",
    termos: ["whatsapp", "link whatsapp", "gerador whatsapp", "wa.me", "link na bio", "zap", "mensagem direta", "contato whatsapp"],
    destaque: false,
    related: ["qr-code", "contador", "senha"]
  }
];

/**
 * Remove acentos e normaliza texto para busca case-insensitive e insensivel a acentos.
 */
function normalizeSearchText(text) {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Verifica se um token casa com o inicio de alguma palavra no texto-fonte.
 */
function matchesWordBoundary(sourceText, token) {
  if (!sourceText || !token) return false;
  const escaped = token.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp("(?:^|[^a-z0-9])" + escaped, "i");
  return regex.test(sourceText);
}

/**
 * Pesquisa no catalogo considerando nome, categoria, descricao e termos alternativos.
 */
function searchToolsCatalog(query) {
  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) return [];

  const tokens = cleanQuery.split(/\s+/).filter(Boolean);

  const scored = [];

  for (const tool of TOOLS_CATALOG) {
    const nomeNorm = normalizeSearchText(tool.nome);
    const catNorm = normalizeSearchText(tool.categoria);
    const descNorm = normalizeSearchText(tool.descricao);
    const termosNorm = tool.termos.map(normalizeSearchText);

    // Todos os tokens da busca devem dar match em alguma palavra do nome, categoria, descricao ou termos
    const matchesAll = tokens.every(token => {
      return (
        matchesWordBoundary(nomeNorm, token) ||
        matchesWordBoundary(catNorm, token) ||
        matchesWordBoundary(descNorm, token) ||
        termosNorm.some(t => matchesWordBoundary(t, token))
      );
    });

    if (matchesAll) {
      let score = 0;

      // Correspondencia exata no nome
      if (nomeNorm === cleanQuery) score += 500;
      else if (matchesWordBoundary(nomeNorm, cleanQuery)) score += 300;
      else if (nomeNorm.includes(cleanQuery)) score += 150;

      // Correspondencia em termos-chave
      if (termosNorm.some(t => t === cleanQuery)) score += 400;
      else if (termosNorm.some(t => matchesWordBoundary(t, cleanQuery))) score += 250;

      // Correspondencia de categoria
      if (catNorm === cleanQuery) score += 200;
      else if (matchesWordBoundary(catNorm, cleanQuery)) score += 100;

      // Correspondencia na descricao
      if (matchesWordBoundary(descNorm, cleanQuery)) score += 50;

      // Tokens individuais
      for (const token of tokens) {
        if (matchesWordBoundary(nomeNorm, token)) score += 60;
        if (termosNorm.some(t => matchesWordBoundary(t, token))) score += 40;
      }

      // Bonus sutil para ferramentas em destaque para desempate
      if (tool.destaque) score += 5;

      scored.push({ tool, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map(item => item.tool);
}

/**
 * Retorna uma ferramenta do catalogo pelo seu ID.
 */
function getToolById(id) {
  return TOOLS_CATALOG.find(tool => tool.id === id) || null;
}

/**
 * Retorna as ferramentas relacionadas de uma ferramenta pelo seu ID.
 */
function getRelatedTools(toolId) {
  const current = getToolById(toolId);
  if (!current || !Array.isArray(current.related)) return [];
  return current.related
    .map(relId => getToolById(relId))
    .filter(Boolean);
}

/**
 * Preparacao de arquitetura de eventos analiticos (sem acionar GA4 diretamente nesta etapa)
 */
function trackToolSearch(query, resultCount) {
  // Hook reservado para futura integracao com GA4:
  // gtag("event", "tool_search", { search_term: query, results_count: resultCount });
}

function trackToolResultClick(toolName, url) {
  // Hook reservado para futura integracao com GA4:
  // gtag("event", "tool_search_result_click", { tool_name: toolName, tool_url: url });
}

// Exportacao segura para ambiente de browser e Node.js
if (typeof window !== "undefined") {
  window.TOOLS_CATALOG = TOOLS_CATALOG;
  window.normalizeSearchText = normalizeSearchText;
  window.searchToolsCatalog = searchToolsCatalog;
  window.trackToolSearch = trackToolSearch;
  window.trackToolResultClick = trackToolResultClick;
  window.getToolById = getToolById;
  window.getRelatedTools = getRelatedTools;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TOOLS_CATALOG,
    normalizeSearchText,
    searchToolsCatalog,
    trackToolSearch,
    trackToolResultClick,
    getToolById,
    getRelatedTools
  };
}
