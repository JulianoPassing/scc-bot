import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { CATEGORY_CONFIG } from '../config.js';
import { createTicketPermissions, getTicketCategory, createTicketPermissionOverwrites } from '../utils/ticketPermissions.js';

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

  // Usar categoria de suporte como padrão
  const categoria = CATEGORY_CONFIG.suporte;
  const emoji = categoria.emoji;
  const channelName = `${emoji}suporte-${user.username.toLowerCase()}`;

  try {
    // Obter categoria (ou null se estiver cheia)
    const parentId = await getTicketCategory('suporte', guild);
    
    // Criar permissões personalizadas usando a nova função
    const permissionOverwrites = await createTicketPermissionOverwrites('suporte', user.id, guild);
    
    // Cria o canal do ticket
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: 0, // GuildText
      parent: parentId, // null = criar no topo do servidor
      topic: `Ticket de Suporte | ${user.tag} | ${reason}`,
      permissionOverwrites: permissionOverwrites
    });

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
  } catch (error) {
    console.error('Erro ao criar ticket:', error);
    await message.reply('❌ Erro ao criar o ticket. Verifique se o bot tem permissões adequadas.');
  }
} 