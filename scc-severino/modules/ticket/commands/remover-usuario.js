import { EmbedBuilder } from 'discord.js';
import { CATEGORY_CONFIG } from '../config.js';

export const data = {
  name: 'remover-usuario',
  description: 'Remove um usuário do ticket.'
};

export async function execute(message, args, client) {
  const channel = message.channel;
  const user = message.mentions.members.first();
  
  if (!user) {
    return message.reply('❌ Mencione o usuário para remover!');
  }
  
  // Verificar se é um canal de ticket válido
  const isTicketChannel = Object.values(CATEGORY_CONFIG).some(config => 
    channel.name.startsWith(config.emoji)
  );
  
  if (!isTicketChannel) {
    return message.reply('❌ Este comando só pode ser usado em canais de ticket!');
  }
  
  // Verificar permissão de staff
  const hasStaffPermission = message.member.permissions.has('ManageChannels') || 
    Object.values(CATEGORY_CONFIG).some(config => 
      config.staffRoles.some(roleId => message.member.roles.cache.has(roleId))
    );

  if (!hasStaffPermission) {
    return message.reply('❌ Apenas membros da equipe podem remover usuários de tickets!');
  }
  
  // Verificar se não é o criador do ticket
  const channelName = channel.name;
  const username = channelName.split('-').pop();
  if (user.user.username.toLowerCase() === username) {
    return message.reply('❌ Não é possível remover o criador do ticket!');
  }
  
  try {
    await channel.permissionOverwrites.delete(user);
    
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Usuário Removido')
      .setDescription(`${user} foi removido do ticket.`)
      .setTimestamp();
      
    await message.reply({ embeds: [successEmbed] });
  } catch (error) {
    console.error('Erro ao remover usuário:', error);
    await message.reply('❌ Erro ao remover usuário do ticket.');
  }
} 