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
  GUILD_ID,
  TELAGENS_CHANNEL_ID,
  REPORT_COMMAND_CHANNEL_ID,
  STAFF_ROLE_ID
} = config;

const LAST_ENTRIES = 8;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

function parsePeriodDays(args) {
  if (!args.length) return null;
  const raw = String(args[0]).toLowerCase();
  const match = raw.match(/^(\d+)\s*d?$/);
  if (!match) return undefined;
  const days = parseInt(match[1], 10);
  if (!Number.isFinite(days) || days <= 0 || days > 3650) return undefined;
  return days;
}

async function fetchAllChannelMessages(channel, onProgress) {
  const allMessages = [];
  let lastId;
  let batch = 0;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const messages = await channel.messages.fetch(options);
    allMessages.push(...Array.from(messages.values()));
    batch += 1;
    if (onProgress && batch % 5 === 0) {
      await onProgress(allMessages.length);
    }
    if (messages.size < 100) break;
    lastId = messages.last().id;
  }

  return allMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
}

function getMessagePlainText(message) {
  const parts = [];
  if (message.content) parts.push(message.content);
  for (const embed of message.embeds || []) {
    if (embed.author?.name) parts.push(embed.author.name);
    if (embed.title) parts.push(embed.title);
    if (embed.description) parts.push(embed.description);
    for (const field of embed.fields || []) {
      parts.push(`${field.name}: ${field.value}`);
    }
    if (embed.footer?.text) parts.push(embed.footer.text);
  }
  return parts.join('\n').trim();
}

function extractStaffId(message, text) {
  const labeledMention = text.match(
    /(?:staff|respons[aá]vel|telador|autor)\s*[:\-]\s*<@!?(\d{17,19})>/i
  );
  if (labeledMention) return labeledMention[1];

  if (!message.author.bot) return message.author.id;

  const labeledId = text.match(
    /(?:staff|respons[aá]vel|telador|autor)\s*[:\-]\s*(?:id\s*)?`?(\d{17,19})`?/i
  );
  if (labeledId) return labeledId[1];

  const mention = text.match(/<@!?(\d{17,19})>/);
  if (mention) return mention[1];

  return null;
}

function extractPlayerId(text) {
  const labeled = text.match(
    /(?:id|passaporte|player(?:\s*id)?)\s*[:\-#]?\s*`?(\d{1,6})`?/i
  );
  return labeled ? labeled[1] : null;
}

function extractResultado(text) {
  const labeled = text.match(/(?:resultado|status|veredito)\s*[:\-]\s*(.+)/i);
  if (labeled) return labeled[1].split('\n')[0].trim().slice(0, 80);

  const lower = text.toLowerCase();
  if (/\blimpo\b/.test(lower)) return 'Limpo';
  if (/\bcheater\b|\bcheat\b|\bhacker\b/.test(lower)) return 'Cheater';
  if (/\bsuspeito\b/.test(lower)) return 'Suspeito';
  if (/\baprovad[oa]\b/.test(lower)) return 'Aprovado';
  if (/\breprovad[oa]\b/.test(lower)) return 'Reprovado';
  return null;
}

function previewText(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '(sem texto)';
  return clean.length > 180 ? `${clean.slice(0, 177)}…` : clean;
}

function collectTelagens(messages, sinceTimestamp) {
  const byStaff = new Map();
  let ignored = 0;
  let oldest = null;
  let newest = null;

  for (const message of messages) {
    if (message.system) continue;
    if (sinceTimestamp && message.createdTimestamp < sinceTimestamp) continue;

    const text = getMessagePlainText(message);
    const hasContent = Boolean(text) || message.attachments.size > 0;
    if (!hasContent) {
      ignored += 1;
      continue;
    }

    const staffId = extractStaffId(message, text);
    if (!staffId) {
      ignored += 1;
      continue;
    }

    if (!oldest || message.createdTimestamp < oldest) oldest = message.createdTimestamp;
    if (!newest || message.createdTimestamp > newest) newest = message.createdTimestamp;

    if (!byStaff.has(staffId)) {
      byStaff.set(staffId, {
        staffId,
        username: message.author.username,
        tag: message.author.tag,
        avatarUrl: message.author.displayAvatarURL({ size: 64 }),
        count: 0,
        playerIds: new Set(),
        resultados: {},
        entries: []
      });
    }

    const staff = byStaff.get(staffId);
    staff.count += 1;

    const playerId = extractPlayerId(text);
    if (playerId) staff.playerIds.add(playerId);

    const resultado = extractResultado(text);
    if (resultado) {
      staff.resultados[resultado] = (staff.resultados[resultado] || 0) + 1;
    }

    staff.entries.push({
      timestamp: message.createdTimestamp,
      preview: previewText(text),
      playerId,
      resultado,
      url: message.url
    });
  }

  const ranking = Array.from(byStaff.values()).map((staff) => {
    staff.entries.sort((a, b) => b.timestamp - a.timestamp);
    return {
      ...staff,
      uniquePlayers: staff.playerIds.size,
      lastTimestamp: staff.entries[0]?.timestamp || 0
    };
  });

  ranking.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.lastTimestamp - a.lastTimestamp;
  });

  return { ranking, ignored, oldest, newest };
}

function generateTelagensRelatorio({ ranking, total, ignored, periodLabel, oldest, newest, guild }) {
  const formattedDate = formatDate(Date.now());
  const staffCount = ranking.length;
  const media = staffCount > 0 ? (total / staffCount).toFixed(1) : '0';
  const uniquePlayers = new Set();
  for (const staff of ranking) {
    for (const id of staff.playerIds) uniquePlayers.add(id);
  }

  const periodoMsgs = oldest && newest
    ? `${formatDate(oldest)} → ${formatDate(newest)}`
    : '—';

  const staffHtml = ranking.map((staff, index) => {
    const member = guild?.members?.cache?.get(staff.staffId);
    const displayName = escapeHtml(member?.displayName || staff.username || `Staff ${staff.staffId}`);
    const userTag = escapeHtml(member?.user?.tag || staff.tag || staff.staffId);
    const avatarUrl = member?.user?.displayAvatarURL({ size: 64 }) || staff.avatarUrl || '';
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
    const pct = total > 0 ? ((staff.count / total) * 100).toFixed(1) : '0.0';
    const lastDate = staff.lastTimestamp ? formatDate(staff.lastTimestamp) : '—';
    const resultados = Object.entries(staff.resultados)
      .sort((a, b) => b[1] - a[1])
      .map(([nome, qtd]) => `<span class="chip">${escapeHtml(nome)} · ${qtd}</span>`)
      .join('');

    const entriesHtml = staff.entries.slice(0, LAST_ENTRIES).map((entry) => `
      <div class="msg-item">
        <div class="msg-meta">
          ${formatDate(entry.timestamp)}
          ${entry.playerId ? `<span class="msg-badge">ID ${escapeHtml(entry.playerId)}</span>` : ''}
          ${entry.resultado ? `<span class="msg-badge msg-badge-recente">${escapeHtml(entry.resultado)}</span>` : ''}
        </div>
        <div class="msg-content">${escapeHtml(entry.preview)}</div>
      </div>
    `).join('');

    return `
      <div class="staff-card">
        <div class="staff-header">
          <div class="staff-info">
            ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="avatar" class="staff-avatar">` : ''}
            <div class="staff-details">
              <div class="staff-name">${medal} ${displayName}</div>
              <div class="staff-ids">
                <span><i class="fas fa-at"></i> ${userTag}</span>
                <span><i class="fas fa-fingerprint"></i> ${escapeHtml(staff.staffId)}</span>
              </div>
            </div>
          </div>
          <div class="staff-count">
            <div class="count-num">${staff.count}</div>
            <div class="count-label">telagens</div>
          </div>
        </div>
        <div class="staff-metricas">
          <span><i class="fas fa-percentage"></i> ${pct}% do total</span>
          <span><i class="fas fa-user"></i> ${staff.uniquePlayers} IDs únicos</span>
          <span><i class="fas fa-clock"></i> Última: ${lastDate}</span>
        </div>
        ${resultados ? `<div class="staff-chips">${resultados}</div>` : ''}
        <div class="staff-messages">
          <h4><i class="fas fa-comments"></i> Últimas ${Math.min(LAST_ENTRIES, staff.entries.length)} telagens</h4>
          ${entriesHtml || '<div class="no-messages">Nenhuma telagem listada.</div>'}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Telagens - Street Car Club</title>
  <link rel="icon" href="https://i.imgur.com/YULctuK.png" type="image/png">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
    :root {
      --primary-color: #EAF207;
      --background-color: #0D0D0D;
      --card-background: #0D0D0D;
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
    .header { padding: 40px; text-align: center; }
    .logo img { max-width: 300px; height: auto; filter: drop-shadow(0 10px 20px rgba(0,0,0,.3)); }
    .header h1 {
      font-size: 2.4em;
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
    .header p { font-size: 1.1em; color: var(--text-secondary); }
    .stats-resumo {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin: 0 30px 20px;
      justify-content: center;
    }
    .stat-box {
      padding: 15px 25px;
      border-radius: 12px;
      text-align: center;
      min-width: 120px;
      border: 1px solid var(--border-color);
      border-left: 4px solid var(--primary-color);
    }
    .stat-box .stat-num { font-size: 1.8em; font-weight: 700; display: block; color: var(--primary-color); }
    .stat-box .stat-label { font-size: 0.85em; color: var(--text-secondary); }
    .info {
      margin: 0 30px 20px;
      padding: 20px;
      background: rgba(234, 242, 7, 0.1);
      border-radius: 15px;
      border: 1px solid rgba(234, 242, 7, 0.3);
      color: var(--text-secondary);
    }
    .info strong { color: var(--primary-color); }
    .staff-card {
      background: var(--card-background);
      margin: 20px 30px;
      padding: 25px;
      border-radius: 15px;
      border: 1px solid var(--border-color);
      border-left: 5px solid var(--primary-color);
    }
    .staff-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .staff-info { display: flex; align-items: center; gap: 15px; }
    .staff-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid var(--primary-color);
    }
    .staff-name { font-size: 1.3em; font-weight: 700; }
    .staff-ids {
      display: flex;
      gap: 15px;
      margin-top: 6px;
      font-size: 0.85em;
      color: var(--text-secondary);
      flex-wrap: wrap;
    }
    .staff-ids i { margin-right: 4px; color: var(--primary-color); }
    .staff-count { text-align: right; }
    .count-num { font-size: 2em; font-weight: 800; color: var(--primary-color); line-height: 1; }
    .count-label { font-size: 0.8em; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; }
    .staff-metricas {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 12px;
      font-size: 0.85em;
      color: var(--text-secondary);
    }
    .staff-metricas i { color: var(--primary-color); margin-right: 4px; }
    .staff-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .chip {
      background: rgba(234, 242, 7, 0.12);
      border: 1px solid rgba(234, 242, 7, 0.3);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.8em;
      color: var(--primary-color);
    }
    .staff-messages h4 {
      font-size: 1em;
      color: var(--text-secondary);
      margin: 18px 0 12px;
    }
    .staff-messages h4 i { margin-right: 8px; color: var(--primary-color); }
    .msg-item {
      background: rgba(234, 242, 7, 0.05);
      margin: 10px 0;
      padding: 15px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      border-left: 3px solid #C6C403;
    }
    .msg-meta {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 8px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }
    .msg-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      text-transform: uppercase;
      background: rgba(234, 242, 7, 0.2);
      color: var(--primary-color);
    }
    .msg-badge-recente { background: rgba(34, 197, 94, 0.3); color: #86efac; }
    .msg-content { font-size: 14px; white-space: pre-wrap; word-break: break-word; }
    .no-messages {
      padding: 20px;
      text-align: center;
      color: var(--text-secondary);
      font-style: italic;
    }
    .footer {
      text-align: center;
      color: var(--text-secondary);
      font-size: 13px;
      padding: 20px;
      border-top: 1px solid var(--border-color);
    }
    .footer i { color: var(--primary-color); margin-right: 8px; }
    @media (max-width: 768px) {
      .header h1 { font-size: 1.8em; }
      .staff-header { flex-direction: column; align-items: flex-start; }
      .staff-count { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="https://i.imgur.com/kHvmXj6.png" alt="Street Car Club Roleplay Logo" />
      </div>
      <h1><i class="fas fa-user-shield"></i> Relatório de Telagens</h1>
      <p>Street Car Club • ${escapeHtml(periodLabel)} • ${formattedDate}</p>
    </div>

    <div class="stats-resumo">
      <div class="stat-box">
        <span class="stat-num">${total}</span>
        <span class="stat-label">Telagens</span>
      </div>
      <div class="stat-box">
        <span class="stat-num">${staffCount}</span>
        <span class="stat-label">Staff</span>
      </div>
      <div class="stat-box">
        <span class="stat-num">${media}</span>
        <span class="stat-label">Média / staff</span>
      </div>
      <div class="stat-box">
        <span class="stat-num">${uniquePlayers.size || '—'}</span>
        <span class="stat-label">IDs únicos</span>
      </div>
    </div>

    <div class="info">
      <strong><i class="fas fa-info-circle"></i> Período analisado:</strong> ${escapeHtml(periodLabel)}<br>
      <strong>Mensagens no recorte:</strong> ${periodoMsgs}<br>
      ${ignored > 0 ? `<strong>Mensagens ignoradas:</strong> ${ignored} (sem conteúdo ou sem staff identificável)<br>` : ''}
      Relatório gerado em ${formattedDate}
    </div>

    ${ranking.length === 0
      ? '<div class="no-messages">Nenhuma telagem encontrada no período.</div>'
      : staffHtml}

    <div class="footer">
      <i class="fas fa-robot"></i> Relatório gerado automaticamente pelo sistema de telagens Street Car Club.
    </div>
  </div>
</body>
</html>`;
}

const setupRelatorioTelagensModule = function (client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.guild?.id !== GUILD_ID) return;

    const parts = message.content.trim().split(/\s+/);
    const commandName = (parts[0] || '').toLowerCase();
    if (commandName !== '!relatorio-telagens') return;

    if (message.channel.id !== REPORT_COMMAND_CHANNEL_ID) {
      return message.reply(`❌ Use o comando no canal <#${REPORT_COMMAND_CHANNEL_ID}>.`).catch(() => {});
    }

    if (!message.member?.roles?.cache?.has(STAFF_ROLE_ID)) {
      return message.reply('❌ Apenas staff pode gerar o relatório de telagens.').catch(() => {});
    }

    const args = parts.slice(1);
    const periodDays = parsePeriodDays(args);
    if (periodDays === undefined) {
      return message.reply(
        '❌ Período inválido.\n**Uso:** `!relatorio-telagens` (todas) ou `!relatorio-telagens 7d` / `!relatorio-telagens 30`'
      ).catch(() => {});
    }

    const periodLabel = periodDays ? `Últimos ${periodDays} dias` : 'Todo o histórico do canal';
    const sinceTimestamp = periodDays ? Date.now() - periodDays * MS_PER_DAY : null;

    try {
      const processingMsg = await message.reply('🔄 Gerando relatório de telagens...');

      const guild = message.guild;
      const telagensChannel = await guild.channels.fetch(TELAGENS_CHANNEL_ID).catch(() => null);
      if (!telagensChannel || !telagensChannel.isTextBased()) {
        return processingMsg.edit('❌ Canal de telagens não encontrado.').catch(() => {});
      }

      await processingMsg.edit('🔄 Lendo as mensagens do canal de telagens...').catch(() => {});

      const allMessages = await fetchAllChannelMessages(telagensChannel, async (count) => {
        await processingMsg.edit(`🔄 Lendo as mensagens do canal de telagens... (${count} lidas)`).catch(() => {});
      });

      await guild.members.fetch().catch(() => {});

      const { ranking, ignored, oldest, newest } = collectTelagens(allMessages, sinceTimestamp);
      const total = ranking.reduce((sum, staff) => sum + staff.count, 0);

      if (total === 0) {
        return processingMsg.edit(`❌ Nenhuma telagem encontrada (${periodLabel.toLowerCase()}).`).catch(() => {});
      }

      const html = generateTelagensRelatorio({
        ranking,
        total,
        ignored,
        periodLabel,
        oldest,
        newest,
        guild
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `relatorio-telagens-${timestamp}.html`;
      const relatoriosDir = path.join(__dirname, 'relatorios');
      if (!fs.existsSync(relatoriosDir)) {
        fs.mkdirSync(relatoriosDir, { recursive: true });
      }
      const filePath = path.join(relatoriosDir, filename);
      fs.writeFileSync(filePath, html, 'utf-8');

      const attachment = new AttachmentBuilder(filePath, { name: filename });
      const top = ranking.slice(0, 3)
        .map((staff, i) => {
          const medal = ['🥇', '🥈', '🥉'][i];
          const member = guild.members.cache.get(staff.staffId);
          const name = member?.displayName || staff.username || staff.staffId;
          return `${medal} ${name} — **${staff.count}**`;
        })
        .join('\n');

      const successEmbed = new EmbedBuilder()
        .setColor(0xEAF207)
        .setTitle('📊 Relatório de Telagens')
        .setDescription(`📁 \`${filename}\`\n📅 <t:${Math.floor(Date.now() / 1000)}:F>\n🔎 ${periodLabel}`)
        .addFields(
          { name: '🛡️ Telagens', value: `\`\`\`${total}\`\`\``, inline: true },
          { name: '👥 Staff', value: `\`\`\`${ranking.length}\`\`\``, inline: true },
          { name: '📈 Média', value: `\`\`\`${(total / ranking.length).toFixed(1)}\`\`\``, inline: true },
          { name: '🏆 Ranking', value: top || '—' }
        )
        .setFooter({ text: 'Street Car Club • Relatório de Telagens' })
        .setTimestamp();

      await processingMsg.edit({
        content: '✅ Relatório gerado com sucesso!',
        embeds: [successEmbed],
        files: [attachment]
      }).catch(() => {});

      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (_) {}
      }, 10000);
    } catch (error) {
      console.error('Erro no relatorio-telagens:', error);
      await message.reply('❌ Erro ao gerar o relatório. Verifique os logs.').catch(() => {});
    }
  });
};

export default setupRelatorioTelagensModule;
