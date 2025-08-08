import { EmbedBuilder } from 'discord.js';
import { cleanupDeletedTickets } from '../utils/ticketManager.js';

export const data = {
  name: 'limpar-tickets',
  description: 'Limpa tickets deletados manualmente do registro.'
};

export async function execute(message, args, client) {
  // Verificar permissão de administrador
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ Apenas administradores podem usar este comando!');
  }
  
  try {
    await message.reply('🔄 Limpando tickets deletados manualmente...');
    
    const guild = message.guild;
    await cleanupDeletedTickets(guild);
    
    const embed = new EmbedBuilder()
      .setColor('#43B581')
      .setTitle('✅ Limpeza Concluída')
      .setDescription('Tickets deletados manualmente foram removidos do registro.')
      .setFooter({ text: 'StreetCarClub • Sistema de Tickets' })
      .setTimestamp();
    
    return message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Erro ao limpar tickets:', error);
    return message.reply('❌ Erro ao limpar tickets deletados.');
  }
} 