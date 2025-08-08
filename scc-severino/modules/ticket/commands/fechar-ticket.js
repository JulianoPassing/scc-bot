import { EmbedBuilder } from 'discord.js';
import { removeActiveTicket, loadTicketsData } from '../utils/ticketManager.js';

export const data = {
  name: 'fechar-ticket',
  description: 'Fecha o ticket atual.'
};

export async function execute(message, args, client) {
  const channel = message.channel;
  if (!channel.name.startsWith('ticket-')) {
    return message.reply('❌ Este comando só pode ser usado em canais de ticket!');
  }
  // Permissão: apenas staff
  if (!message.member.permissions.has('ManageChannels')) {
    return message.reply('❌ Apenas membros da equipe podem fechar tickets!');
  }
  
  // Remover ticket do registro
  const data = await loadTicketsData();
  const channelId = channel.id;
  
  // Encontrar o usuário que possui este ticket
  for (const [userId, userTickets] of Object.entries(data.activeTickets)) {
    for (const [category, ticketData] of Object.entries(userTickets)) {
      if (ticketData.channelId === channelId) {
        await removeActiveTicket(userId, category);
        break;
      }
    }
  }
  const confirmEmbed = new EmbedBuilder()
    .setColor('#FFA500')
    .setTitle('🔒 Fechando Ticket')
    .setDescription('Este ticket será deletado em 5 segundos...')
    .setFooter({ text: `Fechado por ${message.author.tag}` })
    .setTimestamp();
  await message.reply({ embeds: [confirmEmbed] });
  setTimeout(async () => {
    try {
      await channel.delete(`Ticket fechado por ${message.author.tag}`);
    } catch (error) {
      // erro ao deletar
    }
  }, 5000);
} 