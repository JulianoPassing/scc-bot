import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')
);

const {
  STREAMS_CHANNEL_ID,
  REPORT_COMMAND_CHANNEL_ID,
  CRIADOR_CONTEUDO_ROLE_ID,
  ADMIN_ROLE_ID
} = config;

const MSG_PER_WEEK_THRESHOLD = 2;
const LAST_MESSAGES_TO_SHOW = 7;
const INATIVIDADE_DAYS = 30; // Mensagens com mais de 30 dias = inativo

/**
 * Busca todas as mensagens do canal (máximo possível)
 */
async function fetchAllChannelMessages(channel) {
  const allMessages = [];
  let lastId;
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const messages = await channel.messages.fetch(options);
    allMessages.push(...Array.from(messages.values()));
    if (messages.size < 100) break;
    lastId = messages.last().id;
  }
  return allMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
}

/**
 * Calcula o status: INEXISTENTE, INATIVO ou ATIVO
 * ATIVO: última mensagem <= 30 dias E >= 2 mensagens E >= 2 por semana
 * INATIVO: última mensagem > 30 dias OU < 2 mensagens OU < 2 por semana
 * INEXISTENTE: sem mensagens
 */
function calculateStatus(messages, now = Date.now()) {
  if (!messages || messages.length === 0) return 'INEXISTENTE';
  const total = messages.length;
  const newest = Math.max(...messages.map(m => m.createdTimestamp));
  const daysSinceLastMsg = (now - newest) / (1000 * 60 * 60 * 24);

  // Se a última mensagem tem mais de 30 dias = INATIVO
  if (daysSinceLastMsg > INATIVIDADE_DAYS) return 'INATIVO';
  if (total < 2) return 'INATIVO';

  const oldest = Math.min(...messages.map(m => m.createdTimestamp));
  const daysSpan = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24));
  const weeks = daysSpan / 7;
  const messagesPerWeek = total / weeks;
  return messagesPerWeek >= MSG_PER_WEEK_THRESHOLD ? 'ATIVO' : 'INATIVO';
}

/** Retorna true se a mensagem tem mais de 30 dias */
function isMessageOld(timestamp, now = Date.now()) {
  return (now - timestamp) / (1000 * 60 * 60 * 24) > INATIVIDADE_DAYS;
}

/**
 * Gera o HTML do relatório no padrão do transcript de tickets
 */
function generateStreamersRelatorio(streamersData, guild) {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });

  const statusClass = (status) => {
    if (status === 'ATIVO') return 'status-ativo';
    if (status === 'INATIVO') return 'status-inativo';
    return 'status-inexistente';
  };

  const statusIcon = (status) => {
    if (status === 'ATIVO') return 'fa-check-circle';
    if (status === 'INATIVO') return 'fa-exclamation-triangle';
    return 'fa-times-circle';
  };

  const now = Date.now();
  const streamersHtml = streamersData.map(({ member, messages, status }) => {
    const displayName = member?.displayName || member?.user?.username || 'Desconhecido';
    const userTag = member?.user?.tag || member?.user?.username || 'Desconhecido';
    const userId = member?.id || '';
    const avatarUrl = member?.user?.displayAvatarURL?.() || '';
    const last7 = (messages || []).slice(0, LAST_MESSAGES_TO_SHOW);

    const messagesHtml = last7.length === 0
      ? '<div class="no-messages">Nenhuma mensagem encontrada no canal de streams.</div>'
      : last7.map(msg => {
          const dateStr = new Date(msg.createdTimestamp).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
          });
          const antiga = isMessageOld(msg.createdTimestamp, now);
          const content = msg.content
            ? msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            : '(sem texto)';
          return `
            <div class="msg-item ${antiga ? 'msg-antiga' : 'msg-recente'}">
              <div class="msg-meta">
                ${dateStr}
                ${antiga ? '<span class="msg-badge">Antiga</span>' : '<span class="msg-badge msg-badge-recente">Recente</span>'}
              </div>
              <div class="msg-content">${content}</div>
            </div>`;
        }).join('');

    return `
      <div class="streamer-card ${statusClass(status)}">
        <div class="streamer-header">
          <div class="streamer-info">
            ${avatarUrl ? `<img src="${avatarUrl}" alt="avatar" class="streamer-avatar">` : ''}
            <div class="streamer-details">
              <div class="streamer-name">${displayName}</div>
              <div class="streamer-ids">
                <span class="streamer-tag"><i class="fas fa-at"></i> ${userTag}</span>
                <span class="streamer-id"><i class="fas fa-fingerprint"></i> ${userId}</span>
              </div>
              <div class="streamer-status ${statusClass(status)}">
                <i class="fas ${statusIcon(status)}"></i> ${status}
              </div>
            </div>
          </div>
        </div>
        <div class="streamer-messages">
          <h4><i class="fas fa-comments"></i> Últimas ${LAST_MESSAGES_TO_SHOW} mensagens</h4>
          ${messagesHtml}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Streamers - Street Car Club</title>
  <link rel="icon" href="https://i.imgur.com/YULctuK.png" type="image/png">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

    :root {
      --primary-color: #EAF207;
      --secondary-color: #F4F740;
      --accent-color: #C6C403;
      --background-color: #0D0D0D;
      --card-background: linear-gradient(135deg, #0D0D0D 0%, #0D0D0D 100%);
      --text-color: #FFFFFF;
      --text-secondary: #B0B0B0;
      --border-color: #30363D;
      --shadow-color: rgba(0, 0, 0, 0.4);
      --gradient-primary: linear-gradient(135deg, #EAF207 0%, #F4F740 100%);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Poppins', sans-serif;
      background: var(--background-color);
      background-image: url('https://i.imgur.com/Wf7bGAO.png');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      color: var(--text-color);
      line-height: 1.7;
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: var(--card-background);
      border-radius: 20px;
      box-shadow: 0 20px 40px var(--shadow-color);
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    .header {
      background: var(--card-background);
      padding: 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px var(--shadow-color);
    }

    .logo img {
      max-width: 300px;
      height: auto;
      filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
    }

    .header h1 {
      font-size: 2.5em;
      font-weight: 700;
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 20px 0 10px;
      position: relative;
      padding-bottom: 20px;
    }

    .header h1::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 3px;
      background: var(--gradient-primary);
      border-radius: 2px;
    }

    .header p {
      font-size: 1.2em;
      color: var(--text-secondary);
      opacity: 0.9;
    }

    .info {
      margin: 20px 30px;
      padding: 20px;
      background: rgba(234, 242, 7, 0.1);
      border-radius: 15px;
      border: 1px solid rgba(234, 242, 7, 0.3);
    }

    .info strong { color: var(--primary-color); font-weight: 600; }

    .streamer-card {
      background: var(--card-background);
      margin: 20px 30px;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 5px 15px var(--shadow-color);
      border: 1px solid var(--border-color);
      border-left: 5px solid var(--primary-color);
      transition: all 0.3s ease;
    }

    .streamer-card:hover {
      transform: translateX(5px);
      box-shadow: 0 10px 25px var(--shadow-color);
    }

    .streamer-card.status-ativo { border-left-color: #22c55e; }
    .streamer-card.status-inativo { border-left-color: #f59e0b; }
    .streamer-card.status-inexistente { border-left-color: #ef4444; }

    .streamer-header {
      margin-bottom: 20px;
    }

    .streamer-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .streamer-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid var(--primary-color);
    }

    .streamer-name {
      font-size: 1.3em;
      font-weight: 700;
      color: var(--text-color);
    }

    .streamer-details { flex: 1; }
    .streamer-ids {
      display: flex;
      gap: 15px;
      margin-top: 6px;
      font-size: 0.85em;
      color: var(--text-secondary);
    }
    .streamer-ids i { margin-right: 4px; color: var(--primary-color); }
    .streamer-tag, .streamer-id { font-family: monospace; }

    .streamer-status {
      font-size: 0.95em;
      margin-top: 4px;
      font-weight: 600;
    }

    .streamer-status.status-ativo { color: #22c55e; }
    .streamer-status.status-inativo { color: #f59e0b; }
    .streamer-status.status-inexistente { color: #ef4444; }

    .streamer-messages h4 {
      font-size: 1em;
      color: var(--text-secondary);
      margin-bottom: 15px;
      font-weight: 600;
    }

    .streamer-messages h4 i { margin-right: 8px; color: var(--primary-color); }

    .msg-item {
      background: rgba(234, 242, 7, 0.05);
      margin: 10px 0;
      padding: 15px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      border-left: 3px solid var(--accent-color);
    }

    .msg-meta {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .msg-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .msg-badge:not(.msg-badge-recente) {
      background: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }
    .msg-badge-recente {
      background: rgba(34, 197, 94, 0.3);
      color: #86efac;
    }
    .msg-item.msg-antiga {
      border-left-color: #ef4444;
      opacity: 0.9;
    }
    .msg-item.msg-recente {
      border-left-color: #22c55e;
    }

    .msg-content {
      font-size: 14px;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--text-color);
      line-height: 1.5;
    }

    .no-messages {
      padding: 20px;
      text-align: center;
      color: var(--text-secondary);
      font-style: italic;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 10px;
      border: 1px dashed var(--border-color);
    }

    .footer {
      margin: 30px 0 0 0;
      text-align: center;
      color: var(--text-secondary);
      font-size: 13px;
      padding: 20px;
      background: var(--card-background);
      border-top: 1px solid var(--border-color);
    }

    .footer i { color: var(--primary-color); margin-right: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="https://i.imgur.com/kHvmXj6.png" alt="Street Car Club Roleplay Logo" />
      </div>
      <h1><i class="fas fa-broadcast-tower"></i> Relatório de Criadores de Conteúdo</h1>
      <p>Street Car Club • Canal de Streams • ${formattedDate}</p>
    </div>

    <div class="info">
      <strong><i class="fas fa-info-circle"></i> Critérios de Status:</strong><br>
      <strong>ATIVO:</strong> Última mensagem nos últimos 30 dias + 2 ou mais mensagens por semana<br>
      <strong>INATIVO:</strong> Última mensagem com mais de 30 dias OU menos de 2 mensagens por semana<br>
      <strong>INEXISTENTE:</strong> Nenhuma mensagem encontrada<br>
      <small style="opacity:0.8;margin-top:8px;display:block">Relatório gerado em: ${formattedDate}</small>
    </div>

    ${streamersHtml}

    <div class="footer">
      <i class="fas fa-robot"></i> Relatório gerado automaticamente pelo sistema de streams Street Car Club.
    </div>
  </div>
</body>
</html>`;
}

/** Extrai Discord ID - aceita só o número (ex: 953329786858663996), menção ou com prefixo */
function extractDiscordIds(text) {
  const parts = text.split(/\s+/).filter(Boolean);
  const ids = [];
  for (const p of parts) {
    if (p === '!remover-streamer') continue;
    // Menção <@123> ou <@!123>
    const mentionMatch = p.match(/<?@!?(\d{17,19})>?/);
    if (mentionMatch) {
      ids.push(mentionMatch[1]);
    } else {
      // Só o número ou número com prefixo (discordid:, etc)
      const numMatch = p.match(/(\d{17,19})/);
      if (numMatch) ids.push(numMatch[1]);
    }
  }
  return [...new Set(ids)];
}

const setupStreamsModule = function (client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const isRelatorio = content === '!relatorio-streamers';
    const isRemover = content.startsWith('!remover-streamer');

    if (!isRelatorio && !isRemover) return;

    if (message.channel.id !== REPORT_COMMAND_CHANNEL_ID) {
      return message.reply('❌ Este comando só pode ser usado no canal autorizado.').catch(() => {});
    }

    if (!message.member?.roles?.cache?.has(ADMIN_ROLE_ID)) {
      return message.reply('❌ Você não tem permissão para usar este comando.').catch(() => {});
    }

    // ========== COMANDO !remover-streamer ==========
    if (isRemover) {
      const ids = extractDiscordIds(content);
      if (ids.length === 0) {
        return message.reply(
          '❌ Informe pelo menos um Discord ID (só o número).\n' +
          '**Uso:** `!remover-streamer` seguido dos IDs\n' +
          '**Exemplo:**\n```\n!remover-streamer\n953329786858663996\n123456789012345678\n```'
        ).catch(() => {});
      }

      try {
        const guild = message.guild;
        const role = await guild.roles.fetch(CRIADOR_CONTEUDO_ROLE_ID).catch(() => null);
        if (!role) {
          return message.reply('❌ Cargo Criador de Conteúdo não encontrado.').catch(() => {});
        }

        const resultados = [];
        for (const userId of ids) {
          try {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) {
              resultados.push({ id: userId, ok: false, msg: 'Membro não encontrado no servidor' });
              continue;
            }
            if (!member.roles.cache.has(CRIADOR_CONTEUDO_ROLE_ID)) {
              resultados.push({ id: userId, ok: false, msg: 'Não possui o cargo' });
              continue;
            }
            await member.roles.remove(role);
            resultados.push({ id: userId, ok: true, tag: member.user.tag });
          } catch (err) {
            resultados.push({ id: userId, ok: false, msg: err.message || 'Erro ao remover' });
          }
        }

        const sucesso = resultados.filter(r => r.ok);
        const falha = resultados.filter(r => !r.ok);
        let reply = `**Remoção do cargo Criador de Conteúdo**\n`;
        if (sucesso.length > 0) {
          reply += `\n✅ **Removidos (${sucesso.length}):**\n${sucesso.map(s => `• \`${s.id}\` — ${s.tag}`).join('\n')}`;
        }
        if (falha.length > 0) {
          reply += `\n\n❌ **Falhas (${falha.length}):**\n${falha.map(f => `• \`${f.id}\` — ${f.msg}`).join('\n')}`;
        }
        await message.reply(reply).catch(() => {});
      } catch (error) {
        console.error('Erro no remover-streamer:', error);
        await message.reply('❌ Erro ao processar o comando.').catch(() => {});
      }
      return;
    }

    // ========== COMANDO !relatorio-streamers ==========
    try {
      const processingMsg = await message.reply('🔄 Gerando relatório de criadores de conteúdo...');

      const guild = message.guild;
      const streamsChannel = await guild.channels.fetch(STREAMS_CHANNEL_ID).catch(() => null);
      if (!streamsChannel) {
        return processingMsg.edit('❌ Canal de streams não encontrado.').catch(() => {});
      }

      await guild.members.fetch();
      const criadores = guild.members.cache.filter(
        m => m.roles.cache.has(CRIADOR_CONTEUDO_ROLE_ID) && !m.user.bot
      );

      if (criadores.size === 0) {
        return processingMsg.edit('❌ Nenhum membro com o cargo Criador de Conteúdo encontrado.').catch(() => {});
      }

      await processingMsg.edit('🔄 Buscando mensagens do canal de streams (isso pode levar um momento)...').catch(() => {});

      const allMessages = await fetchAllChannelMessages(streamsChannel);

      const streamersData = criadores.map(member => {
        const userMessages = allMessages.filter(m => m.author.id === member.id);
        const status = calculateStatus(userMessages);
        return {
          member,
          messages: userMessages,
          status
        };
      });

      streamersData.sort((a, b) => {
        const order = { ATIVO: 0, INATIVO: 1, INEXISTENTE: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      });

      const html = generateStreamersRelatorio(streamersData, guild);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `relatorio-streamers-${timestamp}.html`;

      const relatoriosDir = path.join(__dirname, 'relatorios');
      if (!fs.existsSync(relatoriosDir)) {
        fs.mkdirSync(relatoriosDir, { recursive: true });
      }
      const filePath = path.join(relatoriosDir, filename);
      fs.writeFileSync(filePath, html, 'utf-8');

      const attachment = new AttachmentBuilder(filePath, { name: filename });

      const ativos = streamersData.filter(s => s.status === 'ATIVO').length;
      const inativos = streamersData.filter(s => s.status === 'INATIVO').length;
      const inexistentes = streamersData.filter(s => s.status === 'INEXISTENTE').length;

      const successEmbed = new EmbedBuilder()
        .setColor(0xEAF207)
        .setTitle('📊 Relatório de Criadores de Conteúdo')
        .setDescription('O relatório HTML foi gerado com sucesso.')
        .addFields(
          { name: '📁 Arquivo', value: `\`${filename}\``, inline: true },
          { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: '👥 Total', value: `${streamersData.length} criadores`, inline: true },
          { name: '✅ Ativos', value: `${ativos}`, inline: true },
          { name: '⚠️ Inativos', value: `${inativos}`, inline: true },
          { name: '❌ Inexistentes', value: `${inexistentes}`, inline: true }
        )
        .setFooter({ text: 'Street Car Club • Relatório de Streams' })
        .setTimestamp();

      await processingMsg.edit({
        content: '✅ Relatório gerado com sucesso!',
        embeds: [successEmbed],
        files: [attachment]
      }).catch(() => {});

      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {}
      }, 10000);

    } catch (error) {
      console.error('Erro no relatorio-streamers:', error);
      await message.reply('❌ Erro ao gerar o relatório. Verifique os logs.').catch(() => {});
    }
  });
};

export default setupStreamsModule;
