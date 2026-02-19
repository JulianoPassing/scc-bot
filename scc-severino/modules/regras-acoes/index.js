import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')
);

const { ACOES_CHANNEL_ID, ADMIN_ROLE_ID } = config;
const REGRAS_HTML_PATH = path.join(__dirname, 'regras-acoes.html');

const MAX_MSG_LEN = 1900;

/**
 * Extrai o conteúdo da seção #acoes do HTML
 */
function extractAcoesSection(html) {
  const start = html.indexOf('<section id="acoes"');
  if (start === -1) return '';
  const end = html.indexOf('<section id="advertencias"', start);
  if (end === -1) return html.slice(start);
  return html.slice(start, end);
}

/**
 * Converte HTML para formato Discord preservando emojis e estrutura
 */
function htmlToDiscord(html) {
  let text = html
    .replace(/<section[^>]*>|<\/section>/gi, '')
    .replace(/<h2[^>]*>.*?<\/h2>/gi, '')
    .replace(/<h3[^>]*>/gi, '\n\n**')
    .replace(/<\/h3>/gi, '**\n')
    .replace(/<h4[^>]*>/gi, '\n**')
    .replace(/<\/h4>/gi, '**\n')
    .replace(/<h5[^>]*>/gi, '\n**')
    .replace(/<\/h5>/gi, '**\n')
    .replace(/<b>/gi, '**')
    .replace(/<\/b>/gi, '**')
    .replace(/<i>/gi, '*')
    .replace(/<\/i>/gi, '*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '')
    .replace(/<tr>/gi, '\n')
    .replace(/<td[^>]*>/gi, ' | ')
    .replace(/<\/td>/gi, '')
    .replace(/<th[^>]*>/gi, ' **')
    .replace(/<\/th>/gi, '** ')
    .replace(/<\/tr>/gi, '')
    .replace(/<thead>|<\/thead>|<tbody>|<\/tbody>|<table[^>]*>|<\/table>/gi, '')
    .replace(/<a[^>]*href="[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<div[^>]*>|<\/div>/gi, '\n')
    .replace(/<span[^>]*>|<\/span>/gi, '')
    .replace(/<i class="[^"]*"[^>]*><\/i>/gi, '')
    .replace(/<i class="[^"]*"[^>]*>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();

  return text;
}

/** Mapeamento de títulos para emojis */
const TITULO_EMOJIS = {
  'Roupa de Gangue': '👕',
  'Regras Gerais – Polícia x Bandido': '⚙️',
  'Corpo da Polícia': '🏥',
  'Taser': '⚡',
  'Código 5': '🔫',
  'Disparos': '⏱️',
  'Ação de Rua': '🛣️',
  'QRR dos Bandidos': '👥',
  'Rendição': '🙌',
  'Giroflex': '🚨',
  'Veículo Danificado': '🚗',
  'Troca de Veículo': '🔄',
  'Disparos em Veículos': '🚙',
  'Roupa de Mergulho': '🏊',
  'Pneus Danificados': '🛞',
  'Drop em Telhados': '🏢',
  'Uso de Força': '🛡️',
  'Mandato de Prisão': '⚖️',
  'QSV – Limite': '🛡️',
  'Águia e Helicóptero': '🚁',
  'Ação de Rua': '🛣️',
  'Uso de Capacete': '⛑️',
  'Regras por Localidade': '📍',
  'Caixa Eletrônico': '💰',
  'Armazém': '📦',
  'Dominação': '🚩',
  'Petrolífera': '⛽',
  'Desmanche': '🔧',
  'Ações Blipadas': '📡',
  'Médico': '🩺',
  'Resgates': '🚑',
  'Multas': '📋',
  'Locais Blipados': '🏪',
  'Barbearia': '💈',
  'Ammunation': '🛡️',
  'Loja de Conveniência': '🏪',
  'Joalheria': '💎',
  'Galinheiro': '🐔',
  'Açougue': '🥩',
  'Banco Flecca': '🏦',
  'Tequi-La-La': '🍹',
  'Banco Paleto': '🏦',
  'Banco Central': '🏛️',
  'Nióbio': '🧪',
  'Roubo de Casas': '🏠',
  'Corrida Ilegal': '🏎️'
};

/**
 * Enriquece o texto com emojis e formatação visual para Discord
 */
function enrichWithEmojis(text) {
  let result = text;

  for (const [titulo, emoji] of Object.entries(TITULO_EMOJIS)) {
    const escaped = titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\*\\*([0-9.]*\\s*)?${escaped}[^*]*\\*\\*`, 'gi');
    result = result.replace(re, (m) => {
      const inner = m.replace(/\*\*/g, '').trim();
      return `**${emoji} ${inner}**`;
    });
  }

  result = result
    .replace(/^\s*•\s*/gm, '  ▸ ')
    .replace(/\n\*\*([^*]+)\*\*\n/g, '\n\n**$1**\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n(\*\*[^*]{4,80}\*\*)\n/g, '\n\n▬▬▬▬▬▬▬▬▬▬▬▬\n$1\n')
    .replace(/^\s+/, '')
    .trim();

  return result;
}

/**
 * Divide texto em chunks que cabem no limite do Discord (2000 chars)
 */
function splitIntoChunks(text, maxLen = MAX_MSG_LEN) {
  const chunks = [];
  const lines = text.split('\n');
  let current = '';

  for (const line of lines) {
    if (current.length + line.length + 1 <= maxLen) {
      current += (current ? '\n' : '') + line;
    } else {
      if (current) chunks.push(current);
      if (line.length > maxLen) {
        for (let i = 0; i < line.length; i += maxLen) {
          chunks.push(line.slice(i, i + maxLen));
        }
        current = '';
      } else {
        current = line;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

const setupRegrasAcoesModule = function (client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content !== '!regras-acoes') return;

    if (!message.member?.roles?.cache?.has(ADMIN_ROLE_ID)) {
      return message.reply('❌ Você não tem permissão para usar este comando.').catch(() => {});
    }

    try {
      const htmlPath = REGRAS_HTML_PATH;
      if (!fs.existsSync(htmlPath)) {
        return message.reply(`❌ Arquivo não encontrado: \`${htmlPath}\``).catch(() => {});
      }

      const processingMsg = await message.reply('🔄 Carregando regras de ações...');

      const html = fs.readFileSync(htmlPath, 'utf-8');
      const acoesHtml = extractAcoesSection(html);
      const discordText = htmlToDiscord(acoesHtml);
      const enriched = enrichWithEmojis(discordText);
      const chunks = splitIntoChunks(enriched);

      const channel = await message.guild.channels.fetch(ACOES_CHANNEL_ID).catch(() => null);
      if (!channel) {
        return processingMsg.edit('❌ Canal #acoes não encontrado.').catch(() => {});
      }

      const header = '**🎯 REGRAS DE AÇÕES – PvP/PvE**\n' +
        '═══════════════════════════\n' +
        '_Regras de PvP/PvE da cidade_\n\n';
      const footer = '\n═══════════════════════════\n' +
        '🏁 _Street Car Club Roleplay_';

      await processingMsg.edit('🔄 Publicando regras no canal #acoes...').catch(() => {});

      let first = true;
      for (let i = 0; i < chunks.length; i++) {
        let content = chunks[i];
        if (first) {
          content = header + content;
          first = false;
        }
        if (i === chunks.length - 1) {
          content += footer;
        }
        await channel.send(content).catch((e) => {
          console.error('Erro ao enviar chunk regras-acoes:', e);
        });
      }

      await processingMsg.edit('✅ Regras de ações publicadas no canal <#' + ACOES_CHANNEL_ID + '>!').catch(() => {});
    } catch (error) {
      console.error('Erro no regras-acoes:', error);
      await message.reply('❌ Erro ao carregar as regras. Verifique o caminho do arquivo e os logs.').catch(() => {});
    }
  });
};

export default setupRegrasAcoesModule;
