import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createTicketChannelWithCategoryCheck } from '../utils/ticketUtils.js';
import { registerActiveTicket, getUserActiveTicket } from '../utils/ticketManager.js';
import { hasCategoryPermission } from '../utils/ticketPermissions.js';

const CATEGORY_IDS = { suporte: '1386490182085382294' };
const CATEGORY_INFO = {
  suporte: { emoji: '📁', nome: 'Suporte', desc: 'Suporte técnico e ajuda geral' }
};

export const data = {
  name: 'abrir-ticket',
  description: 'Abre um ticket de suporte (apenas staff). Use o botão "Adicionar Membro" para incluir o usuário.'
};

export async function execute(message, args, client) {
  const user = message.author;
  const guild = message.guild;
  const member = message.member;

  // Apenas staff pode usar este comando
  if (!member || !hasCategoryPermission(member, 'suporte')) {
    return message.reply('❌ Apenas a equipe de staff pode usar este comando.');
  }

  // Verifica se o staff já tem ticket ativo na categoria suporte
  const activeTickets = await getUserActiveTicket(user.id);
  if (activeTickets?.suporte) {
    return message.reply(`❌ Você já possui um ticket de suporte ativo: <#${activeTickets.suporte.channelId}>\n\nFeche o ticket antes de abrir outro.`);
  }

  const categoria = CATEGORY_INFO.suporte;
  const categoriaId = CATEGORY_IDS.suporte;

  // Nome do canal igual ao painel: 📁suporte-username
  const channelName = `${categoria.emoji}suporte-${user.username.toLowerCase()}`;

  let ticketResult;
  try {
    ticketResult = await createTicketChannelWithCategoryCheck(
      guild,
      channelName,
      categoriaId,
      user.id,
      `Ticket de ${categoria.nome} | creatorId=${user.id} | ${user.tag}`
    );
  } catch (err) {
    console.error('Erro ao criar canal do ticket:', err, 'Categoria:', categoriaId, 'Guild:', guild.id);

    if (err.code === 30013) {
      return message.reply({
        content: '❌ **Limite de canais atingido!**\n\nO servidor atingiu o limite máximo de canais. Entre em contato com a administração para resolver esta situação.'
      });
    }

    return message.reply({ content: '❌ Erro ao criar o canal do ticket. Verifique se a categoria existe, se o bot tem permissão e se o ID está correto.' });
  }

  const ticketChannel = ticketResult.channel;
  const categoryFull = ticketResult.categoryFull;

  // Registrar o ticket ativo
  await registerActiveTicket(user.id, 'suporte', ticketChannel.id, ticketChannel.name);

  // Mensagem fixada igual ao painel
  const notifyMsg = await ticketChannel.send({ content: `🔔 <@${user.id}> abriu um ticket! Equipe notificada:` });
  await notifyMsg.pin().catch(() => {});

  // Embed igual ao painel
  const embed = new EmbedBuilder()
    .setColor(categoryFull ? '#FFA500' : '#EAF207')
    .setTitle(`📑 Ticket Aberto - ${categoria.emoji} ${categoria.nome}`)
    .setDescription(`Ticket aberto pela equipe.\n\nUse o botão **Adicionar Membro** para incluir o usuário que será atendido.`)
    .addFields(
      { name: 'Categoria', value: `${categoria.emoji} ${categoria.nome}`, inline: true },
      { name: 'Status', value: '⏳ Aguardando atendimento', inline: true },
      { name: 'Tempo de Resposta', value: 'Até 72h úteis', inline: true },
      { name: 'Assunto', value: 'Ticket aberto pela equipe', inline: false },
      { name: 'Descrição', value: categoria.desc, inline: false }
    )
    .setImage('https://i.imgur.com/kHvmXj6.png')
    .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade | ™ Street CarClub © All rights reserved', iconURL: null })
    .setTimestamp();

  if (categoryFull) {
    embed.addFields({
      name: '⚠️ Aviso',
      value: 'A categoria está cheia. Este ticket foi criado fora da categoria organizacional.',
      inline: false
    });
  }

  // Botões iguais ao painel
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('assumir_ticket').setLabel('Assumir Ticket').setStyle(ButtonStyle.Secondary).setEmoji('🫡'),
    new ButtonBuilder().setCustomId('adicionar_membro').setLabel('Adicionar Membro').setStyle(ButtonStyle.Secondary).setEmoji('➕')
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('avisar_membro').setLabel('Avisar Membro').setStyle(ButtonStyle.Secondary).setEmoji('🔔'),
    new ButtonBuilder().setCustomId('renomear_ticket').setLabel('Renomear Ticket').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
    new ButtonBuilder().setCustomId('timer_24h').setLabel('Timer 24h').setStyle(ButtonStyle.Secondary).setEmoji('⏰')
  );

  await ticketChannel.send({
    content: `${user}`,
    embeds: [embed],
    components: [row1, row2]
  });

  await message.reply(`✅ Ticket criado em <#${ticketChannel.id}>! Use o botão **Adicionar Membro** para incluir o usuário.`);
}
