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
 * Busca as regras do site e retorna no formato esperado pelo buildEmbeds.
 */
export async function fetchRegrasFromSite() {
  const res = await fetch(REGRAS_URL, {
    headers: { 'User-Agent': 'SCC-Bot/1.0' }
  });

  if (!res.ok) {
    throw new Error(`Site retornou status ${res.status}`);
  }

  const html = await res.text();

  if (html.includes('Regras de Ações') || html.includes('PvP/PvE')) {
    try {
      return parseHtmlToRegras(html);
    } catch (e) {
      const idx = html.indexOf('Regras de Ações');
      if (idx >= 0) {
        return parseFromMarkdownLike(html.substring(idx));
      }
      throw e;
    }
  }

  throw new Error('Conteúdo de Regras de Ações não encontrado no site');
}
