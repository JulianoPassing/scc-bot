import config from '../config.json' with { type: 'json' };
import {
  pendente,
  isAgendado,
  parseAgendado,
  nomeDoCanal,
  prefixoDoCanal,
  slotsDisponiveis,
  buildDiaEmbed,
  buildDiaRows,
  getMensagens,
  updateConfigFromMessage,
  getConfigStatus,
  getRoleAgendamentoId,
  getRoleReagendarId,
  lembreteCanal,
  lembreteDM,
} from '../utils/agendamento.js';

const CONFIG_CHANNEL_ID = config.agendamento?.configChannelId || '1483578658391326962';

async function sendTemp(channel, content, ms = 15_000) {
  const msg = await channel.send({ content });
  setTimeout(() => msg.delete().catch(() => {}), ms);
}

export const name = 'messageCreate';
export const execute = async function (message) {
  if (message.author.bot) return;

  const cmd = message.content.trim().toLowerCase();
  const channel = message.channel;
  const guild = message.guild;
  const member = message.member;

  if (!guild) return;

  // --- CANAL DE CONFIG DO AGENDAMENTO ---
  if (channel.id === CONFIG_CHANNEL_ID) {
    if (cmd === '!status') {
      const uptime = Math.floor(process.uptime());
      const configStatus = getConfigStatus();
      const pending = pendente.size;
      try {
        await message.reply(
          `**Bot status**\n` +
          `⏱ Uptime: ${uptime}s\n` +
          `📋 Config: ${configStatus}\n` +
          `🏠 Servidores: ${message.client.guilds.cache.size}\n` +
          `⏳ Agendamentos pendentes: ${pending}\n` +
          `🔁 Lembretes no canal (20 min): ${lembreteCanal.size}\n` +
          `📩 DMs enviadas (10 min): ${lembreteDM.size}`,
        );
      } catch {}
      return;
    }

    const updated = updateConfigFromMessage(message.content);
    if (updated) {
      try {
        await message.reply('✅ Config atualizada!');
      } catch {}
    } else {
      try {
        await message.reply('❌ JSON inválido ou fora do formato esperado.');
      } catch {}
    }
    return;
  }

  const channelName = channel?.name;
  const channelCategory = channel?.parentId;
  const isSecurityCategory = config.securityCategories?.includes(channelCategory);
  const isSecurityTicket = channelName?.startsWith('seg-') && isSecurityCategory;

  if (!isSecurityTicket) return;

  const roleAgendamentoId = getRoleAgendamentoId();
  const roleReagendarId = getRoleReagendarId();

  // --- AGENDAMENTO ---
  if (cmd === 'agendamento') {
    if (!roleAgendamentoId || !member?.roles?.cache?.has(roleAgendamentoId)) {
      try {
        await message.delete();
      } catch {}
      return;
    }

    if (isAgendado(channelName)) {
      try {
        await message.delete();
      } catch {}
      await sendTemp(channel, `${member} ${getMensagens().ja_agendado}`, 15_000);
      return;
    }

    try {
      await message.delete();
    } catch {}

    const slots = slotsDisponiveis(guild);
    if (!Object.keys(slots).length) {
      await sendTemp(channel, `${member} ${getMensagens().sem_vagas}`, 15_000);
      return;
    }

    const prefixo = prefixoDoCanal(channelName);
    const nome = nomeDoCanal(channelName);
    pendente.set(message.author.id, {
      channelId: channel.id,
      prefixo,
      nome,
      dia: null,
      hora: null,
    });

    await channel.send({
      content: `${member}`,
      embeds: [buildDiaEmbed(slots)],
      components: buildDiaRows(slots),
    });
  }

  // --- REAGENDAR ---
  else if (cmd === 'reagendar') {
    if (!roleReagendarId || !member?.roles?.cache?.has(roleReagendarId)) {
      try {
        await message.delete();
      } catch {}
      return;
    }

    if (!isAgendado(channelName)) {
      try {
        await message.delete();
      } catch {}
      await sendTemp(channel, `${member} ❌ Este canal não possui agendamento ativo.`, 15_000);
      return;
    }

    try {
      await message.delete();
    } catch {}

    const parsed = parseAgendado(channelName);
    if (!parsed) {
      await sendTemp(channel, `${member} ❌ Erro ao processar nome do canal.`, 10_000);
      return;
    }

    const novoNome = `${parsed.prefixo}-${parsed.nome}`;
    try {
      await channel.setName(novoNome);
      await sendTemp(
        channel,
        `${member} ✅ Agendamento removido. Canal renomeado para \`#${novoNome}\`.\nO candidato pode usar \`agendamento\` para remarcar.`,
        20_000,
      );
    } catch {
      await sendTemp(channel, `${member} ❌ Sem permissão para renomear o canal.`, 10_000);
    }
  }
};
