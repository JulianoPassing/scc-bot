import { config } from '../config.js';

export const name = 'messageCreate';
export const execute = async function(message) {
  // Verificar se a mensagem é do canal especificado no servidor do ilegal
  if (message.channel.id !== config.monitorChannelId) return;
  
  // Verificar se há menções na mensagem
  if (message.mentions.users.size === 0) return;
  
  try {
    // Obter o servidor principal
    const mainGuild = message.client.guilds.cache.get(config.mainGuildId);
    if (!mainGuild) {
      console.error('Servidor principal não encontrado');
      return;
    }
    
    // Verificar cada usuário mencionado
    for (const [userId, user] of message.mentions.users) {
      // Verificar se o usuário tem o cargo de blacklist no servidor principal
      const member = await mainGuild.members.fetch(userId).catch(() => null);
      
      if (member && member.roles.cache.has(config.blacklistRoleId)) {
        // Responder à mensagem que o usuário está em blacklist
        await message.reply(config.blacklistMessage);
      }
    }
  } catch (error) {
    console.error('Erro ao verificar blacklist:', error);
  }
};
