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
  REMOVER_STREAMER_CHANNEL_ID,
  CRIADOR_CONTEUDO_ROLE_ID,
  ADMIN_ROLE_ID
} = config;

const CRITERIOS = config.CRITERIOS || {};
const MSG_PER_WEEK_THRESHOLD = CRITERIOS.MSG_MINIMA_POR_SEMANA ?? 2;
const MSG_ULTIMOS_30_DIAS = CRITERIOS.MSG_MINIMA_ULTIMOS_30_DIAS ?? 2;
const LAST_MESSAGES_TO_SHOW = 7;
const INATIVIDADE_DAYS = CRITERIOS.DIAS_INATIVIDADE ?? 30;
const MSG_MINIMA_TOTAL = CRITERIOS.MSG_MINIMA_TOTAL ?? 2;
const MODO_FILTRO = (CRITERIOS.MODO_FILTRO || 'janela'); // "janela" = msgs nos últimos 30 dias | "frequencia" = média histórica

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

/** Retorna início e fim do mês atual (America/Sao_Paulo) em timestamp */
function getMesAtual(now = Date.now()) {
  const d = new Date(now);
  const ano = d.getFullYear();
  const mes = d.getMonth();
  const inicio = new Date(ano, mes, 1).getTime();
  const fim = new Date(ano, mes + 1, 0, 23, 59, 59, 999).getTime();
  return { inicio, fim };
}

/**
 * Calcula status e métricas do criador de conteúdo
 * Baseado no MÊS ATUAL:
 *   ATIVO: 2+ mensagens no mês atual
 *   POUCO ATIVO: 1 mensagem no mês atual
 *   INATIVO: 0 mensagens no mês atual (mas tem histórico)
 *   INEXISTENTE: nunca postou
 */
function calculateStatus(messages, now = Date.now()) {
  const empty = { status: 'INEXISTENTE', diasDesdeUltima: null, msgPorSemana: '0', msgNoMes: 0, total: 0, motivo: 'Nunca postou no canal' };
  if (!messages || messages.length === 0) return empty;

  const total = messages.length;
  const newest = Math.max(...messages.map(m => m.createdTimestamp));
  const oldest = Math.min(...messages.map(m => m.createdTimestamp));
  const daysSinceLastMsg = Math.floor((now - newest) / (1000 * 60 * 60 * 24));
  const { inicio, fim } = getMesAtual(now);
  const msgNoMes = messages.filter(m => m.createdTimestamp >= inicio && m.createdTimestamp <= fim).length;
  const daysSpan = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24));
  const weeks = daysSpan / 7;
  const messagesPerWeek = (total / weeks).toFixed(1);

  if (msgNoMes === 0) {
    return { status: 'INATIVO', diasDesdeUltima: daysSinceLastMsg, msgPorSemana: messagesPerWeek, msgNoMes, total, motivo: `Nenhuma mensagem no mês atual` };
  }
  if (msgNoMes === 1) {
    return { status: 'POUCO ATIVO', diasDesdeUltima: daysSinceLastMsg, msgPorSemana: messagesPerWeek, msgNoMes, total, motivo: `1 mensagem no mês atual` };
  }
  return { status: 'ATIVO', diasDesdeUltima: daysSinceLastMsg, msgPorSemana: messagesPerWeek, msgNoMes, total, motivo: `${msgNoMes} mensagens no mês atual` };
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
    if (status === 'POUCO ATIVO') return 'status-pouco-ativo';
    if (status === 'INATIVO') return 'status-inativo';
    return 'status-inexistente';
  };

  const statusIcon = (status) => {
    if (status === 'ATIVO') return 'fa-check-circle';
    if (status === 'POUCO ATIVO') return 'fa-minus-circle';
    if (status === 'INATIVO') return 'fa-exclamation-triangle';
    return 'fa-times-circle';
  };

  const now = Date.now();
  const streamersHtml = streamersData.map(({ member, messages, status, statusData }) => {
    const displayName = member?.displayName || member?.user?.username || 'Desconhecido';
    const userTag = member?.user?.tag || member?.user?.username || 'Desconhecido';
    const userId = member?.id || '';
    const avatarUrl = member?.user?.displayAvatarURL?.() || '';
    const last7 = (messages || []).slice(0, LAST_MESSAGES_TO_SHOW);
    const sd = statusData || {};

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
              ${sd.motivo ? `<div class="streamer-motivo">${sd.motivo}</div>` : ''}
              ${(sd.total > 0 && (sd.diasDesdeUltima !== null || sd.msgPorSemana || sd.msgNoMes)) ? `
              <div class="streamer-metricas">
                ${sd.diasDesdeUltima !== null ? `<span><i class="fas fa-clock"></i> Última: há ${sd.diasDesdeUltima} dias</span>` : ''}
                ${sd.msgNoMes !== undefined ? `<span><i class="fas fa-calendar-alt"></i> ${sd.msgNoMes} no mês</span>` : ''}
                ${sd.msgPorSemana ? `<span><i class="fas fa-chart-line"></i> ${sd.msgPorSemana}/semana</span>` : ''}
                ${sd.total ? `<span><i class="fas fa-comment"></i> ${sd.total} total</span>` : ''}
              </div>` : ''}
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

    .stats-resumo {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin: 20px 30px;
      justify-content: center;
    }
    .stat-box {
      padding: 15px 25px;
      border-radius: 12px;
      text-align: center;
      min-width: 100px;
      border: 1px solid var(--border-color);
    }
    .stat-box .stat-num { font-size: 1.8em; font-weight: 700; display: block; }
    .stat-box .stat-label { font-size: 0.85em; color: var(--text-secondary); }
    .stat-box.stat-ativo { border-left: 4px solid #22c55e; }
    .stat-box.stat-pouco-ativo { border-left: 4px solid #3b82f6; }
    .stat-box.stat-inativo { border-left: 4px solid #f59e0b; }
    .stat-box.stat-inexistente { border-left: 4px solid #ef4444; }
    .stat-box.stat-total { border-left: 4px solid var(--primary-color); }

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
    .streamer-card.status-pouco-ativo { border-left-color: #3b82f6; }
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
    .streamer-status.status-pouco-ativo { color: #3b82f6; }
    .streamer-status.status-inativo { color: #f59e0b; }
    .streamer-status.status-inexistente { color: #ef4444; }

    .streamer-motivo {
      font-size: 0.85em;
      color: var(--text-secondary);
      margin-top: 6px;
      font-style: italic;
    }
    .streamer-metricas {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 8px;
      font-size: 0.8em;
      color: var(--text-secondary);
    }
    .streamer-metricas span { display: flex; align-items: center; gap: 4px; }
    .streamer-metricas i { color: var(--primary-color); }

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

    <div class="stats-resumo">
      <div class="stat-box stat-ativo">
        <span class="stat-num">${streamersData.filter(s => s.status === 'ATIVO').length}</span>
        <span class="stat-label">Ativos</span>
      </div>
      <div class="stat-box stat-pouco-ativo">
        <span class="stat-num">${streamersData.filter(s => s.status === 'POUCO ATIVO').length}</span>
        <span class="stat-label">Pouco Ativos</span>
      </div>
      <div class="stat-box stat-inativo">
        <span class="stat-num">${streamersData.filter(s => s.status === 'INATIVO').length}</span>
        <span class="stat-label">Inativos</span>
      </div>
      <div class="stat-box stat-inexistente">
        <span class="stat-num">${streamersData.filter(s => s.status === 'INEXISTENTE').length}</span>
        <span class="stat-label">Inexistentes</span>
      </div>
      <div class="stat-box stat-total">
        <span class="stat-num">${streamersData.length}</span>
        <span class="stat-label">Total</span>
      </div>
    </div>

    <div class="info">
      <strong><i class="fas fa-info-circle"></i> Critérios (mês atual)</strong><br><br>
      <strong style="color:#22c55e">ATIVO:</strong> 2+ mensagens no mês atual<br>
      <strong style="color:#3b82f6">POUCO ATIVO:</strong> 1 mensagem no mês atual<br>
      <strong style="color:#f59e0b">INATIVO:</strong> 0 mensagens no mês atual<br>
      <strong style="color:#ef4444">INEXISTENTE:</strong> Nunca postou no canal<br><br>
      <small style="opacity:0.8">Relatório: ${formattedDate}</small>
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

    if (isRelatorio && message.channel.id !== REPORT_COMMAND_CHANNEL_ID) {
      return message.reply('❌ O relatório só pode ser gerado no canal autorizado.').catch(() => {});
    }
    const removerChannel = REMOVER_STREAMER_CHANNEL_ID || REPORT_COMMAND_CHANNEL_ID;
    if (isRemover && removerChannel && message.channel.id !== removerChannel) {
      return message.reply(`❌ Use o comando no canal <#${removerChannel}>`).catch(() => {});
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
        const processingMsg = ids.length > 10
          ? await message.reply(`🔄 Removendo cargo de ${ids.length} membros...`).catch(() => null)
          : null;

        const guild = message.guild;
        const role = await guild.roles.fetch(CRIADOR_CONTEUDO_ROLE_ID).catch(() => null);
        if (!role) {
          if (processingMsg) await processingMsg.delete().catch(() => {});
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
        const MAX_LEN = 1900;
        let reply = `**Remoção do cargo Criador de Conteúdo**\n`;
        if (sucesso.length > 0) {
          reply += `\n✅ **Removidos (${sucesso.length}):**\n${sucesso.map(s => `• \`${s.id}\` — ${s.tag}`).join('\n')}`;
        }
        if (falha.length > 0) {
          reply += `\n\n❌ **Falhas (${falha.length}):**\n${falha.map(f => `• \`${f.id}\` — ${f.msg}`).join('\n')}`;
        }
        if (processingMsg) await processingMsg.delete().catch(() => {});

        if (reply.length > MAX_LEN) {
          const chunks = [];
          let curr = `**Remoção do cargo Criador de Conteúdo**\n`;
          if (sucesso.length > 0) {
            curr += `\n✅ **Removidos (${sucesso.length}):**\n`;
            for (const s of sucesso) {
              const line = `• \`${s.id}\` — ${s.tag}\n`;
              if (curr.length + line.length > MAX_LEN) {
                chunks.push(curr);
                curr = line;
              } else curr += line;
            }
          }
          if (falha.length > 0) {
            curr += `\n❌ **Falhas (${falha.length}):**\n`;
            for (const f of falha) {
              const line = `• \`${f.id}\` — ${f.msg}\n`;
              if (curr.length + line.length > MAX_LEN) {
                chunks.push(curr);
                curr = line;
              } else curr += line;
            }
          }
          chunks.push(curr);
          await message.reply(chunks[0]).catch(e => console.error('Erro ao enviar reply:', e));
          for (let i = 1; i < chunks.length; i++) {
            await message.channel.send(chunks[i]).catch(e => console.error('Erro ao enviar chunk:', e));
          }
        } else {
          await message.reply(reply).catch(e => console.error('Erro ao enviar reply:', e));
        }
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
        const statusData = calculateStatus(userMessages);
        return {
          member,
          messages: userMessages,
          status: statusData.status,
          statusData
        };
      });

      streamersData.sort((a, b) => {
        const order = { ATIVO: 0, 'POUCO ATIVO': 1, INATIVO: 2, INEXISTENTE: 3 };
        const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4);
        if (diff !== 0) return diff;
        return (a.statusData.diasDesdeUltima ?? 9999) - (b.statusData.diasDesdeUltima ?? 9999);
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
      const poucoAtivos = streamersData.filter(s => s.status === 'POUCO ATIVO').length;
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
          { name: '🔵 Pouco Ativos', value: `${poucoAtivos}`, inline: true },
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
