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
 * ATIVO: >= 2 mensagens E >= 2 mensagens por semana (em média)
 * INATIVO: tem mensagens mas < 2 por semana ou menos de 2 mensagens no total
 * INEXISTENTE: sem mensagens
 */
function calculateStatus(messages) {
  if (!messages || messages.length === 0) return 'INEXISTENTE';
  const total = messages.length;
  if (total < 2) return 'INATIVO';
  const oldest = Math.min(...messages.map(m => m.createdTimestamp));
  const newest = Math.max(...messages.map(m => m.createdTimestamp));
  const daysSpan = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24));
  const weeks = daysSpan / 7;
  const messagesPerWeek = total / weeks;
  return messagesPerWeek >= MSG_PER_WEEK_THRESHOLD ? 'ATIVO' : 'INATIVO';
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
    minute: '2-digit'
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

  const streamersHtml = streamersData.map(({ member, messages, status }) => {
    const displayName = member?.displayName || member?.user?.username || 'Desconhecido';
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
            minute: '2-digit'
          });
          const content = msg.content
            ? msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            : '(sem texto)';
          return `
            <div class="msg-item">
              <div class="msg-meta">${dateStr}</div>
              <div class="msg-content">${content}</div>
            </div>`;
        }).join('');

    return `
      <div class="streamer-card ${statusClass(status)}">
        <div class="streamer-header">
          <div class="streamer-info">
            ${avatarUrl ? `<img src="${avatarUrl}" alt="avatar" class="streamer-avatar">` : ''}
            <div>
              <div class="streamer-name">${displayName}</div>
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
      <strong>ATIVO:</strong> 2 ou mais mensagens por semana no canal de streams<br>
      <strong>INATIVO:</strong> Menos de 2 mensagens por semana<br>
      <strong>INEXISTENTE:</strong> Nenhuma mensagem encontrada
    </div>

    ${streamersHtml}

    <div class="footer">
      <i class="fas fa-robot"></i> Relatório gerado automaticamente pelo sistema de streams Street Car Club.
    </div>
  </div>
</body>
</html>`;
}

const setupStreamsModule = function (client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content !== '!relatorio-streamers') return;

    if (message.channel.id !== REPORT_COMMAND_CHANNEL_ID) {
      return message.reply('❌ Este comando só pode ser usado no canal autorizado.').catch(() => {});
    }

    if (!message.member?.roles?.cache?.has(ADMIN_ROLE_ID)) {
      return message.reply('❌ Você não tem permissão para usar este comando.').catch(() => {});
    }

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
