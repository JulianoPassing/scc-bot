import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createTicketChannel, getNextTicketNumber } from '../utils/ticketManager.js';

export const data = {
  name: 'abrir-ticket-seguranca',
  description: 'Abre um ticket de segurança.'
};

export async function execute(message, args, client) {
  const user = message.author;
  const guild = message.guild;
  const reason = args.join(' ') || 'Sem motivo especificado';

  // Verifica se já existe ticket
  const existing = guild.channels.cache.find(
    channel => channel.name === `seg-${user.username.toLowerCase()}`
  );
  if (existing) {
    return message.reply('❌ Você já possui um ticket aberto: ' + existing.toString());
  }

  const ticketNumber = await getNextTicketNumber();
  const channelName = `seg-${user.username.toLowerCase()}`;
  const ticketChannel = await createTicketChannel(guild, channelName, user, reason, ticketNumber, client);

  const welcomeEmbed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`🛡️ Ticket de Segurança #${ticketNumber}`)
    .setDescription(`Olá ${user}, obrigado por abrir um ticket de segurança.`)
    .addFields(
      { name: 'Motivo', value: reason },
      { name: 'Instruções', value: 'Descreva seu problema. A equipe irá te atender em breve.' }
    )
    .setFooter({ text: 'Use o botão abaixo para fechar este ticket quando resolvido.' })
    .setTimestamp();

  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Fechar Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );

  await ticketChannel.send({
    content: `${user}`,
    embeds: [welcomeEmbed],
    components: [closeButton]
  });
  await message.reply('✅ Ticket criado com sucesso!');
} 