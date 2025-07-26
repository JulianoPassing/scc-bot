import { EmbedBuilder } from 'discord.js';
import { CATEGORY_CONFIG } from '../config.js';

export const data = {
  name: 'adicionar-usuario',
  description: 'Adiciona um usuário ao ticket.'
};

export async function execute(message, args, client) {
  const channel = message.channel;
  const user = message.mentions.members.first();
  
  if (!user) {
    return message.reply('❌ Mencione o usuário para adicionar!');
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
    return message.reply('❌ Apenas membros da equipe podem adicionar usuários em tickets!');
  }
  
  try {
    await channel.permissionOverwrites.create(user, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true
    });
    
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Usuário Adicionado')
      .setDescription(`${user} foi adicionado ao ticket com permissões completas.`)
      .setTimestamp();
      
    await message.reply({ embeds: [successEmbed] });
  } catch (error) {
    console.error('Erro ao adicionar usuário:', error);
    await message.reply('❌ Erro ao adicionar usuário ao ticket.');
  }
} 