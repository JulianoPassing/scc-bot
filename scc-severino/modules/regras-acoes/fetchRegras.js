/**
 * Busca as regras de ações do site oficial e converte para o formato do buildEmbeds.
 * Toda execução do comando !regras-acoes busca dados atualizados do site.
 */

import { parse } from 'node-html-parser';

const REGRAS_URL = 'https://regras-scc.vercel.app/';

// Mapeamento de títulos de seção para emoji e cor (hex -> int)
const SECAO_META = {
  'Roupa de Gangue': { emoji: '👕', cor: 0xC6C403 },
  'Regras Gerais – Polícia x Bandido': { emoji: '⚙️', cor: 0xEAF207 },
  'QSV – Limite Padrão de Contingente': { emoji: '🛡️', cor: 0x4ECDC4 },
  'Helicóptero': { emoji: '🚁', cor: 0xFF6B6B },
  'Águia e Helicóptero': { emoji: '🚁', cor: 0xFF9800 },
  'Ação de Rua': { emoji: '🛣️', cor: 0x4CAF50 },
  'Uso de Capacete': { emoji: '⛑️', cor: 0x9C27B0 },
  'Regras por Localidade': { emoji: '📍', cor: 0xC6C403 },
  'Regras – Ações Blipadas': { emoji: '📡', cor: 0xFF9800 },
  'Médico / Fim de Ação Blipada': { emoji: '🩺', cor: 0x4CAF50 },
  'Resgates': { emoji: '🚑', cor: 0xFF9800 },
  'Multas para Corridas Ilegais': { emoji: '📋', cor: 0xC6C403 },
  'Locais Blipados – Configuração': { emoji: '🏪', cor: 0xEAF207 },
};

const DEFAULT_META = { emoji: '📌', cor: 0xEAF207 };

function cleanText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function htmlToDiscordText(html) {
  if (!html) return '';
  return cleanText(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
  );
}

/**
 * Remove ícones/prefixos de texto (ex: "fa-crosshairs" ou ícones FontAwesome)
 */
function stripIconText(text) {
  return cleanText(text.replace(/<i[^>]*>[\s\S]*?<\/i>/gi, '').trim());
}

/**
 * Extrai a seção "Regras de Ações" do HTML e converte para o formato esperado.
 */
function parseHtmlToRegras(html) {
  const root = parse(html);

  let acoesSection = root.querySelector('#acoes');
  if (!acoesSection) {
    const allH2 = root.querySelectorAll('h2');
    for (const h2 of allH2) {
      const t = (h2.text || '').trim();
      if (t.includes('Regras de Ações') || t.includes('PvP/PvE')) {
        acoesSection = h2.parentNode?.parentNode || h2.parentNode;
        break;
      }
    }
  }
  if (!acoesSection) {
    const idx = html.indexOf('Regras de Ações');
    if (idx >= 0) return parseFromMarkdownLike(html.substring(idx));
    throw new Error('Seção de Regras de Ações não encontrada no site');
  }

  const secoes = [];
  let descricao = '';
  let titulo = 'Regras de Ações – PvP/PvE';

  const nodes = acoesSection.querySelectorAll('h2, h3, h4, p');
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];
    const tag = node.tagName?.toLowerCase?.();
    const text = stripIconText(node.text || node.innerHTML || '');

    if (tag === 'h2') {
      if (text.includes('Regras de Ações') || text.includes('PvP')) titulo = text;
      i++;
      continue;
    }

    if (tag === 'h3') {
      const meta = SECAO_META[text] || DEFAULT_META;
      secoes.push({
        titulo: text,
        emoji: meta.emoji,
        cor: meta.cor,
        conteudo: '',
        fields: []
      });
      i++;
      continue;
    }

    if (tag === 'h4') {
      const current = secoes[secoes.length - 1];
      if (current) {
        let valor = '';
        i++;
        while (i < nodes.length) {
          const next = nodes[i];
          const nextTag = next.tagName?.toLowerCase?.();
          if (nextTag === 'h3' || nextTag === 'h4') break;
          if (nextTag === 'p') {
            valor += htmlToDiscordText(next.innerHTML || next.text || '') + '\n';
          }
          i++;
        }
        current.fields.push({ nome: text, valor: cleanText(valor), inline: false });
        continue;
      }
      i++;
      continue;
    }

    if (tag === 'p' && secoes.length > 0) {
      const content = htmlToDiscordText(node.innerHTML || node.text || '');
      if (content) {
        const current = secoes[secoes.length - 1];
        if (current.fields.length > 0) {
          const last = current.fields[current.fields.length - 1];
          last.valor = (last.valor + '\n\n' + content).trim();
        } else {
          current.conteudo = (current.conteudo + (current.conteudo ? '\n\n' : '') + content).trim();
        }
      }
      i++;
      continue;
    }

    i++;
  }

  if (secoes.length === 0 && html.includes('Regras de Ações')) {
    return parseFromMarkdownLike(html.substring(html.indexOf('Regras de Ações')));
  }

  return {
    titulo,
    descricao: descricao || 'Regras oficiais de PvP/PvE da Street Car Club Roleplay. Consulte o canal para mais detalhes.',
    secoes
  };
}

/**
 * Parser alternativo para conteúdo em formato markdown-like (quando o HTML retornado
 * for de um site que renderiza markdown).
 */
function parseFromMarkdownLike(text) {
  const lines = text.split('\n');
  const secoes = [];
  let titulo = 'Regras de Ações – PvP/PvE';
  let descricao = '';
  let currentSection = null;
  let currentField = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('©') || trimmed.includes('Noel Salvo')) break;

    if (trimmed.startsWith('## ')) {
      const t = trimmed.replace(/^##\s*/, '').trim();
      if (t.includes('Regras de Ações') || t.includes('PvP')) titulo = t;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      const t = trimmed.replace(/^###\s*/, '').trim();
      const meta = SECAO_META[t] || DEFAULT_META;
      currentSection = {
        titulo: t,
        emoji: meta.emoji,
        cor: meta.cor,
        conteudo: '',
        fields: []
      };
      secoes.push(currentSection);
      currentField = null;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      const t = trimmed.replace(/^####\s*/, '').trim();
      if (currentSection) {
        currentField = { nome: t, valor: '', inline: false };
        currentSection.fields.push(currentField);
      }
      continue;
    }

    if (currentField) {
      currentField.valor = (currentField.valor + (currentField.valor ? '\n' : '') + trimmed).trim();
    } else if (currentSection) {
      if (currentSection.fields.length > 0) {
        const last = currentSection.fields[currentSection.fields.length - 1];
        last.valor = (last.valor + '\n' + trimmed).trim();
      } else {
        currentSection.conteudo = (currentSection.conteudo + (currentSection.conteudo ? '\n\n' : '') + trimmed).trim();
      }
    } else if (descricao === '' && i < 5) {
      descricao = trimmed;
    }
  }

  return {
    titulo,
    descricao: descricao || 'Regras oficiais de PvP/PvE da Street Car Club Roleplay. Consulte o canal para mais detalhes.',
    secoes
  };
}

/**
 * Converte HTML para texto markdown-like para o parser.
 * Útil quando o site retorna HTML mas com estrutura diferente.
 */
function htmlToMarkdownLike(html) {
  return html
    .replace(/<h2[^>]*>/gi, '\n## ')
    .replace(/<h3[^>]*>/gi, '\n### ')
    .replace(/<h4[^>]*>/gi, '\n#### ')
    .replace(/<h5[^>]*>/gi, '\n##### ')
    .replace(/<\/h[2-5]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Busca as regras do site e retorna no formato esperado pelo buildEmbeds.
 * Tenta múltiplas estratégias de parsing para funcionar com diferentes estruturas do site.
 */
export async function fetchRegrasFromSite() {
  const res = await fetch(REGRAS_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });

  if (!res.ok) {
    throw new Error(`Site retornou status ${res.status}`);
  }

  const html = await res.text();

  if (!html.includes('Regras de Ações') && !html.includes('PvP')) {
    throw new Error('Conteúdo de Regras de Ações não encontrado no site');
  }

  // Estratégia 0: Next.js __NEXT_DATA__ (dados em JSON)
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const pageProps = nextData?.props?.pageProps;
      const content = pageProps?.content || pageProps?.html || JSON.stringify(pageProps);
      if (typeof content === 'string' && content.includes('Regras de Ações')) {
        let parsed = parseHtmlToRegras(content);
        if (parsed.secoes?.length < 5) parsed = parseFromMarkdownLike(htmlToMarkdownLike(content));
        if (parsed.secoes?.length >= 5) return parsed;
      }
    } catch (_) {}
  }

  // Estratégia 1: Parser HTML (quando o site tem HTML completo com id="acoes")
  try {
    const parsed = parseHtmlToRegras(html);
    if (parsed.secoes?.length >= 5) return parsed;
  } catch (_) {}

  // Estratégia 2: Extrair trecho e converter HTML → markdown-like
  const idx = html.indexOf('Regras de Ações');
  if (idx >= 0) {
    const slice = html.substring(idx);
    const endIdx = slice.indexOf('©') >= 0 ? slice.indexOf('©') : slice.length;
    const excerpt = slice.substring(0, endIdx);
    const markdownLike = htmlToMarkdownLike(excerpt);

    if (markdownLike.includes('### ')) {
      const parsed = parseFromMarkdownLike(markdownLike);
      if (parsed.secoes?.length >= 3) return parsed;
    }
  }

  // Estratégia 3: Parser markdown direto no HTML (para SPAs que injetam texto)
  const markdownFull = htmlToMarkdownLike(html);
  const acoesIdx = markdownFull.indexOf('Regras de Ações');
  if (acoesIdx >= 0) {
    const until = markdownFull.indexOf('©') >= 0 ? markdownFull.indexOf('©') : markdownFull.length;
    const parsed = parseFromMarkdownLike(markdownFull.substring(acoesIdx, until));
    if (parsed.secoes?.length >= 3) return parsed;
  }

  throw new Error('Não foi possível extrair as regras do site. Estrutura da página pode ter mudado.');
}
