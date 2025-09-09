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
  let ticketCreatorId = null;
  let ticketCategory = null;
  
  // Encontrar o usuário que possui este ticket
  for (const [userId, userTickets] of Object.entries(data.activeTickets)) {
    for (const [category, ticketData] of Object.entries(userTickets)) {
      if (ticketData.channelId === channelId) {
        ticketCreatorId = userId;
        ticketCategory = category;
        await removeActiveTicket(userId, category);
        break;
      }
    }
  }

  // Enviar mensagem privada ao criador do ticket solicitando avaliação
  if (ticketCreatorId) {
    try {
      const ticketCreator = await client.users.fetch(ticketCreatorId);
      const staffMember = message.member;
      const staffDisplayName = staffMember.displayName || staffMember.user.username;
      
      const evaluationEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('🎫 Ticket Encerrado')
        .setDescription(
          '**Seu ticket foi encerrado, não esqueça de avaliar o staff que lhe atendeu.**\n\n' +
          'Sua opinião é muito importante para continuarmos melhorando nossos serviços.\n\n' +
          '📝 **Avalie aqui:** <#1394727160991842324>'
        )
        .addFields(
          { name: '👤 Staff Responsável', value: staffDisplayName, inline: true },
          { name: '📋 Categoria', value: ticketCategory ? ticketCategory.charAt(0).toUpperCase() + ticketCategory.slice(1) : 'Suporte', inline: true }
        )
        .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade' })
        .setTimestamp();

      await ticketCreator.send({ embeds: [evaluationEmbed] });
    } catch (error) {
      console.error('Erro ao enviar mensagem privada para avaliação:', error);
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