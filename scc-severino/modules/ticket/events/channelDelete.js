import { removeActiveTicket, loadTicketsData } from '../utils/ticketManager.js';

export const name = 'channelDelete';
export const execute = async function(channel) {
  try {
    // Verificar se é um canal de ticket
    if (!channel.name.startsWith('ticket-') && 
        !channel.name.includes('📁') && 
        !channel.name.includes('🦠') && 
        !channel.name.includes('🚀') && 
        !channel.name.includes('🏠') && 
        !channel.name.includes('💎') && 
        !channel.name.includes('⚠️') && 
        !channel.name.includes('🔍')) {
      return; // Não é um canal de ticket
    }
    
    // Remover ticket do registro
    const data = await loadTicketsData();
    const channelId = channel.id;
    
    // Encontrar o usuário que possui este ticket
    for (const [userId, userTickets] of Object.entries(data.activeTickets)) {
      for (const [category, ticketData] of Object.entries(userTickets)) {
        if (ticketData.channelId === channelId) {
          await removeActiveTicket(userId, category);
          console.log(`[TICKET] Ticket removido do registro: ${channel.name} (${userId} - ${category})`);
          break;
        }
      }
    }
  } catch (error) {
    console.error('Erro ao processar deletação de canal:', error);
  }
};
