import { EmbedBuilder } from 'discord.js';
import { getUserActiveTicket } from '../utils/ticketManager.js';
import { CATEGORY_CONFIG } from '../config.js';

export const data = {
  name: 'status-tickets',
  description: 'Verifica os tickets ativos de um usuário.'
};

export async function execute(message, args, client) {
  const targetUser = message.mentions.users.first() || message.author;
  const activeTickets = await getUserActiveTicket(targetUser.id);
  
  if (!activeTickets || Object.keys(activeTickets).length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#43B581')
      .setTitle('📋 Status dos Tickets')
      .setDescription(`${targetUser} não possui tickets ativos.`)
      .setFooter({ text: 'StreetCarClub • Sistema de Tickets' })
      .setTimestamp();
    
    return message.reply({ embeds: [embed] });
  }
  
  const embed = new EmbedBuilder()
            .setColor('#EAF207')
    .setTitle('📋 Status dos Tickets')
    .setDescription(`Tickets ativos de ${targetUser}:`)
    .setFooter({ text: 'StreetCarClub • Sistema de Tickets' })
    .setTimestamp();
  
  for (const [category, ticketData] of Object.entries(activeTickets)) {
    const categoryConfig = CATEGORY_CONFIG[category];
    const categoryName = categoryConfig ? categoryConfig.name : category;
    const categoryEmoji = categoryConfig ? categoryConfig.emoji : '📁';
    
    embed.addFields({
      name: `${categoryEmoji} ${categoryName}`,
      value: `Canal: <#${ticketData.channelId}>\nCriado: <t:${Math.floor(new Date(ticketData.createdAt).getTime() / 1000)}:R>`,
      inline: true
    });
  }
  
  return message.reply({ embeds: [embed] });
}
