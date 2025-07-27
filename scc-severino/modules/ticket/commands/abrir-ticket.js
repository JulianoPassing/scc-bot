import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createTicketChannelWithInheritance } from '../utils/ticketUtils.js';

export const data = {
  name: 'abrir-ticket',
  description: 'Abre um ticket de suporte.'
};

export async function execute(message, args, client) {
  const user = message.author;
  const guild = message.guild;
  const reason = args.join(' ') || 'Sem motivo especificado';

  // Verifica se já existe ticket
  const existing = guild.channels.cache.find(
    channel => channel.name === `ticket-${user.id}`
  );
  if (existing) {
    return message.reply('❌ Você já possui um ticket aberto: ' + existing.toString());
  }

  // Cria o canal do ticket com herança de permissões
  const channelName = `ticket-${user.id}`;
  
  // Usar categoria de suporte por padrão (você pode modificar conforme necessário)
  const categoriaId = '1386490182085382294'; // ID da categoria de suporte
  
  const ticketChannel = await createTicketChannelWithInheritance(
    guild,
    channelName,
    categoriaId,
    user.id,
    `Ticket de Suporte | ${user.tag} | ${reason}`
  );

  const welcomeEmbed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`🎫 Ticket de Suporte`)
    .setDescription(`Olá ${user}, obrigado por abrir um ticket de suporte.`)
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