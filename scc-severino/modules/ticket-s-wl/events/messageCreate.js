import config from '../config.json' with { type: 'json' };
import {
  pendente,
  isAgendado,
  parseAgendado,
  nomeDoCanal,
  slotsDisponiveis,
  buildDiaEmbed,
  buildDiaRows,
  getMensagens,
  categoriaAgendadosTemEspaco,
} from '../utils/agendamento.js';

function extractCreatorIdFromTopic(topic) {
  if (!topic) return null;
  const match = topic.match(/creatorId\s*=\s*(\d{17,19})/i);
  return match ? match[1] : null;
}

function isTicketCreator(channel, userId) {
  const creatorId = extractCreatorIdFromTopic(channel.topic);
  return creatorId === userId;
}

async function sendTemp(channel, content, ms = 15_000) {
  const msg = await channel.send({ content });
  setTimeout(() => msg.delete().catch(() => {}), ms);
}

export const name = 'messageCreate';
export const execute = async function (message, client) {
  if (message.author.bot) return;

  const cmd = message.content.trim().toLowerCase();
  const channel = message.channel;
  const guild = message.guild;
  const member = message.member;

  if (!guild) return;

  const channelName = channel?.name;
  const channelCategory = channel?.parentId;
  const isSecurityCategory = config.securityCategories?.includes(channelCategory);
  const isSecurityTicket = channelName?.startsWith('seg-') && isSecurityCategory;

  if (!isSecurityTicket) return;

  // --- AGENDAMENTO ---
  if (cmd === 'agendamento') {
    if (!isTicketCreator(channel, message.author.id)) {
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

    if (!categoriaAgendadosTemEspaco(guild)) {
      await sendTemp(channel, `${member} ${getMensagens().categoria_cheia}`, 15_000);
      return;
    }

    const nome = nomeDoCanal(channelName);
    pendente.set(message.author.id, {
      channelId: channel.id,
      prefixo: 'seg',
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
    const hasStaffRole = member?.roles?.cache?.has(config.staffRoleId);
    if (!hasStaffRole) {
      try {
        await message.delete();
      } catch {}
      return;
    }

    if (!isAgendado(channelName)) {
      try {
        await message.delete();
      } catch {}
      await sendTemp(channel, `${member} ❌ Este ticket não possui agendamento ativo.`, 15_000);
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

    const novoNome = `seg-${parsed.nome}`;
    const categoryPadraoId = config.categoryId || '1378778140528087191';

    try {
      await channel.edit({ name: novoNome, parent: categoryPadraoId });
      await sendTemp(
        channel,
        `${member} ✅ Agendamento removido. Canal renomeado para \`#${novoNome}\`.\nO usuário pode usar \`agendamento\` para remarcar.`,
        20_000,
      );
    } catch {
      await sendTemp(channel, `${member} ❌ Sem permissão para renomear o canal.`, 10_000);
    }
  }
};
